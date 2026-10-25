package example.streamatlas.catalog;

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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Exercises owner binding and hidden-media exclusion on real disposable PG16. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named = "SA_TEST_PG", matches = "1")
class LibraryPostgresTest {
    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    private long owner, other, visible, held, hidden;
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
    }

    @BeforeEach
    void fixtures() {
        String nonce = UUID.randomUUID().toString();
        owner = jdbc.queryForObject("INSERT INTO users(email,password_hash,name,role,created_at) VALUES(?,NULL,'Synthetic library owner','MEMBER',CURRENT_TIMESTAMP) RETURNING id", Long.class, "owner-" + nonce + "@example.test");
        other = jdbc.queryForObject("INSERT INTO users(email,password_hash,name,role,created_at) VALUES(?,NULL,'Synthetic library peer','MEMBER',CURRENT_TIMESTAMP) RETURNING id", Long.class, "peer-" + nonce + "@example.test");
        ownerToken = session(owner);otherToken = session(other);
        long network = jdbc.queryForObject("INSERT INTO networks(name,slug) VALUES('Synthetic network',?) RETURNING id", Long.class, "network-" + nonce);
        long site = jdbc.queryForObject("INSERT INTO sites(network_id,name,slug) VALUES(?,'Synthetic site',?) RETURNING id", Long.class, network, "site-" + nonce);
        long channel = jdbc.queryForObject("INSERT INTO channels(site_id,name,slug) VALUES(?,'Synthetic channel',?) RETURNING id", Long.class, site, "channel-" + nonce);
        visible = video(site, channel, "visible-" + nonce, "PUBLISHED");
        held = video(site, channel, "held-" + nonce, "PUBLISHED");
        hidden = video(site, channel, "hidden-" + nonce, "HIDDEN");
        jdbc.update("INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,'RIGHTS_EXPIRED','Synthetic hold',?,CURRENT_TIMESTAMP)", held, owner);
        for (long id : new long[] {visible, held, hidden}) {
            jdbc.update("INSERT INTO favorites(user_id,video_id,created_at) VALUES(?,?,CURRENT_TIMESTAMP)", owner, id);
            jdbc.update("INSERT INTO watch_later(user_id,video_id,created_at) VALUES(?,?,CURRENT_TIMESTAMP)", owner, id);
            jdbc.update("INSERT INTO watch_queue(user_id,video_id,position,added_at) VALUES(?,?,?,CURRENT_TIMESTAMP)", owner, id, id);
            jdbc.update("INSERT INTO watch_progress(user_id,video_id,position,watched_at) VALUES(?,?,3,CURRENT_TIMESTAMP)", owner, id);
        }
        jdbc.update("INSERT INTO subscriptions(user_id,channel_id,created_at) VALUES(?,?,CURRENT_TIMESTAMP)", owner, channel);
    }

    @Test
    void readsUseOnlyTheSessionOwnerAndExcludeHiddenOrHeldMedia() throws Exception {
        for (String path : new String[] {"/api/me/library", "/api/me/library?type=watch_later", "/api/me/history", "/api/me/queue", "/api/me/feed"}) {
            mvc.perform(get(path).header("Cookie", "sa_session=" + ownerToken).param("user_id", Long.toString(other)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(visible));
            mvc.perform(get(path).header("Cookie", "sa_session=" + otherToken).param("user_id", Long.toString(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        }
        mvc.perform(get("/api/me/subscriptions").header("Cookie", "sa_session=" + ownerToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(get("/api/me/subscriptions").header("Cookie", "sa_session=" + otherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        assertEquals(3L, jdbc.queryForObject("SELECT count(*) FROM favorites WHERE user_id=?", Long.class, owner));
    }

    @Test
    void expiredClosedAndAbsentSessionsCannotReadAnyLibraryEndpoint() throws Exception {
        for (String path : new String[] {"/api/me/library", "/api/me/history", "/api/me/queue", "/api/me/feed", "/api/me/subscriptions"})
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        jdbc.update("UPDATE sessions SET expires_at=? WHERE token_hash=?", OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1), SessionAccountService.hashToken(ownerToken));
        mvc.perform(get("/api/me/library").header("Cookie", "sa_session=" + ownerToken))
            .andExpect(status().isUnauthorized());
        jdbc.update("INSERT INTO closed_accounts(user_id,closed_at) VALUES(?,CURRENT_TIMESTAMP)", other);
        mvc.perform(get("/api/me/queue").header("Cookie", "sa_session=" + otherToken))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidLibraryQueriesReturnNodeCompatibleErrorsWithoutChangingRows() throws Exception {
        mvc.perform(get("/api/me/library").header("Cookie", "sa_session=" + ownerToken).param("type", "other"))
            .andExpect(status().isNotFound()).andExpect(content().json("{\"error\":\"Unknown list\"}"));
        mvc.perform(get("/api/me/library").header("Cookie", "sa_session=" + ownerToken).param("sort", "unsafe"))
            .andExpect(status().isBadRequest()).andExpect(content().json("{\"error\":\"Invalid library filter\"}"));
        assertEquals(3L, jdbc.queryForObject("SELECT count(*) FROM favorites WHERE user_id=?", Long.class, owner));
    }

    private long video(long site, long channel, String slug, String status) {
        return jdbc.queryForObject("INSERT INTO videos(title,slug,site_id,channel_id,poster,media_url,duration,quality,published_at,status) VALUES('Synthetic clip',?,?,?,?,?,8,'HD',CURRENT_TIMESTAMP,?) RETURNING id", Long.class,
            slug, site, channel, "/assets/posters/poster-1.jpg", "/assets/videos/sample-1.mp4", status);
    }

    private String session(long userId) {
        String token = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
            SessionAccountService.hashToken(token), userId, OffsetDateTime.now(ZoneOffset.UTC).plusHours(1));
        return token;
    }
}
