package example.streamatlas.catalog;

import java.sql.Connection;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.security.SecureRandom;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real PostgreSQL-backed Spring integration; no production account import/cutover. */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "SA_TEST_PG", matches = "1")
class SessionAccountPostgresTest {
    private final List<Long> createdUsers = new ArrayList<>();
    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    private long ownerId;
    private long otherId;
    private String ownerToken;
    private String otherToken;
    private String ownerEmail;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
        if (!"YES_I_ACCEPT_DATA_LOSS".equals(System.getenv("SA_PG_DISPOSABLE")))
            throw new IllegalStateException("Disposable PostgreSQL acknowledgment is required for integration tests");
        String url = configured("SA_TEST_PG_URL", "SA_PG_URL");
        if (url == null || !url.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]{1,5}/sa_disposable_[a-z0-9_]+"))
            throw new IllegalStateException("Integration tests require an explicit loopback disposable PostgreSQL URL without query options");
        String user = configured("SA_TEST_PG_USER", "SA_PG_USER");
        if (user == null || user.isBlank())
            throw new IllegalStateException("An explicit disposable PostgreSQL test role is required");
        String password = configured("SA_TEST_PG_PASSWORD", "SA_PG_PASSWORD");
        if (password == null) password = "";
        DriverManagerDataSource guard = new DriverManagerDataSource(url, user, password);
        try (Connection connection = guard.getConnection()) {
            if (connection.getMetaData().getDatabaseMajorVersion() != 16
                    || !connection.getCatalog().equals(url.substring(url.lastIndexOf('/') + 1)))
                throw new IllegalStateException("Integration database must be the selected disposable PostgreSQL 16 database");
        }
        final String selectedPassword = password;
        properties.add("spring.datasource.url", () -> url);
        properties.add("spring.datasource.username", () -> user);
        properties.add("spring.datasource.password", () -> selectedPassword);
    }

    @BeforeEach
    void createPrivateSyntheticFixtures() {
        ownerEmail = "spring-owner-" + UUID.randomUUID() + "@example.test";
        ownerId = createUser(ownerEmail, "Synthetic owner");
        otherId = createUser("spring-other-" + UUID.randomUUID() + "@example.test", "Synthetic other");
        ownerToken = addSession(ownerId, OffsetDateTime.now(ZoneOffset.UTC).plusHours(1));
        otherToken = addSession(otherId, OffsetDateTime.now(ZoneOffset.UTC).plusHours(1));
        jdbc.update("INSERT INTO user_preferences(user_id,pause_history,autoplay_next,theme,locale,save_searches,updated_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)",
            ownerId, true, false, "light", "Spanish", true);
        jdbc.update("INSERT INTO user_preferences(user_id,pause_history,autoplay_next,theme,locale,save_searches,updated_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)",
            otherId, false, true, "dark", "English", false);
    }

    @AfterEach
    void removeOnlyFixturesCreatedByThisSuite() {
        for (long id : List.copyOf(createdUsers)) {
            jdbc.update("DELETE FROM sessions WHERE user_id=?", id);
            jdbc.update("DELETE FROM closed_accounts WHERE user_id=?", id);
            jdbc.update("DELETE FROM user_preferences WHERE user_id=?", id);
            jdbc.update("DELETE FROM users WHERE id=?", id);
        }
        createdUsers.clear();
    }

    @Test
    void sharedNodeCookieResolvesOnlyWhitelistedAccountFields() throws Exception {
        String body = mvc.perform(get("/api/auth/me").header("Cookie", "sa_session=" + ownerToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.user.id").value(ownerId))
            .andExpect(jsonPath("$.user.email").value(ownerEmail))
            .andExpect(jsonPath("$.user.name").value("Synthetic owner"))
            .andExpect(jsonPath("$.user.role").value("MEMBER"))
            .andExpect(header().string("Cache-Control", "no-store"))
            .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains(ownerToken));
        assertFalse(body.contains(SessionAccountService.hashToken(ownerToken)));
        assertFalse(body.contains("password_hash"));
        assertEquals(2L, jdbc.queryForObject("SELECT COUNT(*) FROM sessions WHERE user_id IN (?,?)", Long.class, ownerId, otherId));
    }

    @Test
    void defaultAndExpandedPreferencesMatchNodeGetContract() throws Exception {
        mvc.perform(get("/api/me/preferences").header("Cookie", "sa_session=" + ownerToken))
            .andExpect(status().isOk())
            .andExpect(content().json("{\"pauseHistory\":true,\"autoplayNext\":false}"));
        mvc.perform(get("/api/me/preferences").header("Cookie", "sa_session=" + ownerToken)
                .param("expanded", "1"))
            .andExpect(status().isOk())
            .andExpect(content().json("{\"pauseHistory\":true,\"autoplayNext\":false,\"theme\":\"light\",\"locale\":\"Spanish\",\"saveSearches\":true}"));
    }

    @Test
    void otherAccountCannotBeSelectedUsingRequestParameters() throws Exception {
        mvc.perform(get("/api/me/preferences").header("Cookie", "sa_session=" + ownerToken)
                .param("expanded", "1").param("user_id", Long.toString(otherId)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pauseHistory").value(true))
            .andExpect(jsonPath("$.autoplayNext").value(false));
        mvc.perform(get("/api/me/preferences").header("Cookie", "sa_session=" + otherToken)
                .param("expanded", "1").param("user_id", Long.toString(ownerId)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pauseHistory").value(false))
            .andExpect(jsonPath("$.autoplayNext").value(true));
    }

    @Test
    void absentPreferencesHaveNodeDefaultsWithoutCreatingRows() throws Exception {
        jdbc.update("DELETE FROM user_preferences WHERE user_id=?", ownerId);
        mvc.perform(get("/api/me/preferences").header("Cookie", "sa_session=" + ownerToken)
                .param("expanded", "1"))
            .andExpect(status().isOk())
            .andExpect(content().json("{\"pauseHistory\":false,\"autoplayNext\":false,\"theme\":\"dark\",\"locale\":\"English\",\"saveSearches\":false}"));
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM user_preferences WHERE user_id=?", Long.class, ownerId));
    }

    @Test
    void expiredAndRevokedSessionsCannotReadThePrivateAccount() throws Exception {
        String expired = addSession(ownerId, OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        assertAnonymousAndDenied(expired);
        jdbc.update("DELETE FROM sessions WHERE token_hash=?", SessionAccountService.hashToken(ownerToken));
        assertAnonymousAndDenied(ownerToken);
    }

    @Test
    void closedAccountIsDeniedEvenWhenItsSessionRowStillExists() throws Exception {
        jdbc.update("INSERT INTO closed_accounts(user_id,closed_at) VALUES(?,CURRENT_TIMESTAMP)", ownerId);
        assertAnonymousAndDenied(ownerToken);
    }

    @Test
    void cookieInjectionCannotSelectAnAccountOrChangeStoredRows() throws Exception {
        assertAnonymousAndDenied("' OR 1=1 --");
        assertEquals(2L, jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE id IN (?,?)", Long.class, ownerId, otherId));
        assertTrue(jdbc.queryForObject("SELECT pause_history FROM user_preferences WHERE user_id=?", Boolean.class, ownerId));
    }

    private void assertAnonymousAndDenied(String token) throws Exception {
        mvc.perform(get("/api/auth/me").header("Cookie", "sa_session=" + token))
            .andExpect(status().isOk()).andExpect(content().json("{\"user\":null}"));
        mvc.perform(get("/api/me/preferences").header("Cookie", "sa_session=" + token))
            .andExpect(status().isUnauthorized());
    }

    private long createUser(String email, String name) {
        long id = jdbc.queryForObject("INSERT INTO users(email,password_hash,name,role,created_at) VALUES(?,NULL,?,'MEMBER',CURRENT_TIMESTAMP) RETURNING id", Long.class, email, name);
        createdUsers.add(id);
        return id;
    }

    private String addSession(long userId, OffsetDateTime expires) {
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        jdbc.update("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)", SessionAccountService.hashToken(token), userId, expires);
        return token;
    }

    private static String configured(String name, String fallback) {
        String value = System.getenv(name);
        return value == null ? System.getenv(fallback) : value;
    }
}
