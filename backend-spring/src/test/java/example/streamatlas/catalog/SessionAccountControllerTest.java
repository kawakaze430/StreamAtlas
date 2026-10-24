package example.streamatlas.catalog;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Controller contracts and SQL parameter isolation; PostgreSQL behavior is a separate suite. */
@SuppressWarnings({"unchecked", "rawtypes"})
class SessionAccountControllerTest {
    private JdbcTemplate jdbc;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        mvc = MockMvcBuilders.standaloneSetup(new SessionAccountController(new SessionAccountService(jdbc)))
            .setControllerAdvice(new SessionAccountErrors()).build();
    }

    @Test
    void anonymousIdentityMatchesNodeNullUserAndIsNeverCached() throws Exception {
        mvc.perform(get("/api/auth/me"))
            .andExpect(status().isOk()).andExpect(content().json("{\"user\":null}"))
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(header().string("Vary", "Cookie"));
        verifyNoInteractions(jdbc);
    }

    @Test
    void privatePreferencesRejectAnonymousInsteadOfReturningDefaults() throws Exception {
        mvc.perform(get("/api/me/preferences"))
            .andExpect(status().isUnauthorized())
            .andExpect(content().json("{\"error\":\"Sign in or enable demo mode to use this feature.\"}"))
            .andExpect(header().string("Cache-Control", "no-store"));
        verifyNoInteractions(jdbc);
    }

    @Test
    void issuedSessionHashesOnlyTheCookieAndWhitelistsIdentityFields() throws Exception {
        String token = "synthetic-session-token-for-unit-only";
        stubUser(token, new SessionAccountService.User(7, "owner@example.test", null, "MEMBER"));
        String body = mvc.perform(get("/api/auth/me").header("Cookie", "sa_session=" + token))
            .andExpect(status().isOk())
            .andExpect(content().json("{\"user\":{\"id\":7,\"email\":\"owner@example.test\",\"name\":null,\"role\":\"MEMBER\"}}"))
            .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains("token"));
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(sha(token)));
        assertFalse(sql.getValue().contains(token));
    }

    @Test
    void missingExpiredOrRevokedSessionIsAnonymousButCannotReadPreferences() throws Exception {
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object.class))).thenReturn(List.of());
        mvc.perform(get("/api/auth/me").header("Cookie", "sa_session=synthetic-invalid"))
            .andExpect(status().isOk()).andExpect(content().json("{\"user\":null}"));
        mvc.perform(get("/api/me/preferences").header("Cookie", "sa_session=synthetic-invalid"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void cookiePercentDecodingKeepsPlusAndLastCookieSemantics() throws Exception {
        stubUser("synthetic+token", new SessionAccountService.User(8, "second@example.test", "Second", "DEMO"));
        mvc.perform(get("/api/auth/me").header("Cookie", "sa_session=old; sa_session=synthetic%2Btoken"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.user.id").value(8));
        verify(jdbc).query(anyString(), any(RowMapper.class), eq(sha("synthetic+token")));
    }

    @Test
    void malformedLastCookieCannotFallBackToEarlierValidIdentity() throws Exception {
        mvc.perform(get("/api/auth/me").header("Cookie", "sa_session=valid-before; sa_session=%C3%28"))
            .andExpect(status().isOk()).andExpect(content().json("{\"user\":null}"));
        verifyNoInteractions(jdbc);
    }

    @Test
    void preferenceDefaultsAreOwnedByResolvedSessionNotQueryParameters() throws Exception {
        stubUser("owner-session", new SessionAccountService.User(9, "owner@example.test", "Owner", "MEMBER"));
        when(jdbc.query(anyString(), any(RowMapper.class), eq(9L))).thenReturn(List.of());
        mvc.perform(get("/api/me/preferences").header("Cookie", "sa_session=owner-session")
                .param("expanded", "1", "0").param("user_id", "42"))
            .andExpect(status().isOk())
            .andExpect(content().json("{\"pauseHistory\":false,\"autoplayNext\":false,\"theme\":\"dark\",\"locale\":\"English\",\"saveSearches\":false}"));
        verify(jdbc).query(anyString(), any(RowMapper.class), eq(9L));
    }

    @Test
    void databaseFailureReturnsGenericUnavailableRatherThanAnonymousSuccess() throws Exception {
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object.class)))
            .thenThrow(new DataAccessResourceFailureException("synthetic SQL/password detail must stay private"));
        mvc.perform(get("/api/auth/me").header("Cookie", "sa_session=synthetic-session"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(content().json("{\"error\":\"Account storage unavailable\"}"))
            .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    void readOnlyControllerDoesNotAcceptPreferenceWrites() throws Exception {
        mvc.perform(patch("/api/me/preferences").header("Cookie", "sa_session=owner-session")
                .contentType("application/json").content("{\"pauseHistory\":true}"))
            .andExpect(status().isMethodNotAllowed());
        verifyNoInteractions(jdbc);
    }

    private void stubUser(String token, SessionAccountService.User user) throws Exception {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(sha(token)))).thenReturn(List.of(user));
    }

    private static String sha(String token) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
            .digest(token.getBytes(StandardCharsets.UTF_8)));
    }
}
