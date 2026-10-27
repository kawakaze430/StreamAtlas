package example.streamatlas.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
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
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Actual PG16 account-write success and denial, using only disposable identities. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named = "SA_TEST_PG", matches = "1")
class PreferenceWritePostgresTest {
    private static final String TEST_KEY = "synthetic-test-only-shared-csrf-secret-47-abcdef";
    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ObjectMapper mapper;
    private long owner, other;
    private String ownerToken, otherToken;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
        if (!"YES_I_ACCEPT_DATA_LOSS".equals(System.getenv("SA_PG_DISPOSABLE")))
            throw new IllegalStateException("Disposable PostgreSQL acknowledgment is required");
        String url = System.getenv("SA_TEST_PG_URL");
        if (url == null || !url.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]{1,5}/sa_disposable_[a-z0-9_]+"))
            throw new IllegalStateException("Explicit loopback PostgreSQL URL required");
        String user = System.getenv("SA_TEST_PG_USER"), password = System.getenv("SA_TEST_PG_PASSWORD");
        if (user == null || user.isBlank() || password == null)
            throw new IllegalStateException("Explicit disposable role required");
        try (Connection connection = new DriverManagerDataSource(url, user, password).getConnection()) {
            if (connection.getMetaData().getDatabaseMajorVersion() != 16
                || !connection.getCatalog().equals(url.substring(url.lastIndexOf('/') + 1)))
                throw new IllegalStateException("Only selected disposable PG16 is allowed");
        }
        properties.add("spring.datasource.url", () -> url);
        properties.add("spring.datasource.username", () -> user);
        properties.add("spring.datasource.password", () -> password);
        properties.add("SA_CSRF_SECRET", () -> TEST_KEY);
    }

    @BeforeEach
    void fixtures() {
        String nonce = UUID.randomUUID().toString();
        owner = user("prefs-owner-" + nonce + "@example.test");
        other = user("prefs-other-" + nonce + "@example.test");
        ownerToken = session(owner);otherToken = session(other);
        jdbc.update("INSERT INTO user_preferences(user_id,pause_history,autoplay_next,theme,locale,save_searches,updated_at) VALUES(?,false,false,'dark','English',true,CURRENT_TIMESTAMP)", owner);
        jdbc.update("INSERT INTO user_preferences(user_id,pause_history,autoplay_next,theme,locale,save_searches,updated_at) VALUES(?,false,false,'dark','French',true,CURRENT_TIMESTAMP)", other);
        jdbc.update("INSERT INTO search_history(user_id,query,searched_at) VALUES(?,'owner-only',CURRENT_TIMESTAMP)", owner);
        jdbc.update("INSERT INTO search_history(user_id,query,searched_at) VALUES(?,'other-only',CURRENT_TIMESTAMP)", other);
    }

    @Test
    void signedWritePersistsOnlyOwnerAndClearsOnlyOwnerSearchHistory() throws Exception {
        String proof = proof();
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookies(ownerToken, proof))
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", proof)
            .header("Origin", "http://localhost").param("user_id", Long.toString(other))
            .contentType("application/json")
            .content("{\"pauseHistory\":true,\"autoplayNext\":false,\"theme\":\"light\",\"locale\":\"Spanish\",\"saveSearches\":false}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.ok").value(true))
            .andExpect(jsonPath("$.theme").value("light"))
            .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/me/preferences").header("Cookie", "sa_session=" + ownerToken)
            .param("expanded", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pauseHistory").value(true))
            .andExpect(jsonPath("$.saveSearches").value(false));
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM search_history WHERE user_id=?", Long.class, owner));
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM search_history WHERE user_id=?", Long.class, other));
        assertEquals("French",jdbc.queryForObject("SELECT locale FROM user_preferences WHERE user_id=?", String.class, other));
        String second = proof();
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookies(otherToken, second))
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", second)
            .contentType("application/json")
            .content("{\"pauseHistory\":false,\"autoplayNext\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.locale").value("French"))
            .andExpect(jsonPath("$.saveSearches").value(true));
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM search_history WHERE user_id=?", Long.class, other));
    }

    @Test
    void wrongOriginCrossSiteAndMissingProofCannotMutateRows() throws Exception {
        String proof = proof();
        String body = "{\"pauseHistory\":true,\"autoplayNext\":true}";
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookies(ownerToken, proof))
            .header("X-Requested-With", "StreamAtlas").contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookies(ownerToken, proof))
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", proof)
            .header("Origin", "http://evil.invalid").contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookies(ownerToken, proof))
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", proof)
            .header("Sec-Fetch-Site", "cross-site").contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        assertEquals(false, jdbc.queryForObject("SELECT pause_history FROM user_preferences WHERE user_id=?", Boolean.class, owner));
    }

    @Test
    void invalidFieldsAndOversizeBodyLeavePreferencesUntouched() throws Exception {
        String proof = proof();
        String cookie = cookies(ownerToken, proof);
        for (String body : new String[] {
            "{invalid",
            "[]",
            "{\"pauseHistory\":\"true\",\"autoplayNext\":false}",
            "{\"pauseHistory\":true,\"autoplayNext\":false,\"theme\":\"neon\"}",
            "{\"pauseHistory\":true,\"autoplayNext\":false,\"saveSearches\":\"yes\"}",
            "{\"pauseHistory\":true,\"autoplayNext\":false,\"locale\":\"unknown\"}"
        }) mvc.perform(patch("/api/me/preferences").header("Cookie", cookie)
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", proof)
            .contentType("application/json").content(body)).andExpect(status().isBadRequest());
        String oversized = "{\"padding\":\"" + "x".repeat(65536) + "\"}";
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookie)
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", proof)
            .contentType("application/json").content(oversized))
            .andExpect(status().isPayloadTooLarge());
        assertEquals(false, jdbc.queryForObject("SELECT pause_history FROM user_preferences WHERE user_id=?", Boolean.class, owner));
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM search_history WHERE user_id=?", Long.class, owner));
    }

    @Test
    void expiredOrClosedSessionsCannotWriteEvenWithValidProof() throws Exception {
        String proof = proof();
        String body = "{\"pauseHistory\":true,\"autoplayNext\":true}";
        jdbc.update("UPDATE sessions SET expires_at=? WHERE token_hash=?", OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1),SessionAccountService.hashToken(ownerToken));
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookies(ownerToken, proof))
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", proof)
            .contentType("application/json").content(body)).andExpect(status().isUnauthorized());
        jdbc.update("INSERT INTO closed_accounts(user_id,closed_at) VALUES(?,CURRENT_TIMESTAMP)", other);
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookies(otherToken, proof))
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", proof)
            .contentType("application/json").content(body)).andExpect(status().isUnauthorized());
        assertEquals(false,jdbc.queryForObject("SELECT pause_history FROM user_preferences WHERE user_id=?",Boolean.class,owner));
        assertEquals(false,jdbc.queryForObject("SELECT pause_history FROM user_preferences WHERE user_id=?",Boolean.class,other));
    }

    private String proof() throws Exception {
        var response = mvc.perform(get("/api/security/csrf")).andExpect(status().isOk())
            .andExpect(header().exists("Set-Cookie")).andReturn().getResponse();
        String token = mapper.readTree(response.getContentAsString()).get("token").asText();
        assertEquals("sa_csrf=" + token, response.getHeader("Set-Cookie").split(";")[0]);
        return token;
    }

    private static String cookies(String session,String proof) {
        return "sa_session=" + session + "; sa_csrf=" + proof;
    }

    private long user(String email) {
        return jdbc.queryForObject("INSERT INTO users(email,password_hash,name,role,created_at) VALUES(?,NULL,'Synthetic preference owner','MEMBER',CURRENT_TIMESTAMP) RETURNING id",Long.class,email);
    }

    private String session(long owner) {
        String token = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
            SessionAccountService.hashToken(token),owner,OffsetDateTime.now(ZoneOffset.UTC).plusHours(1));
        return token;
    }
}
