package example.streamatlas.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Signed proof and owner binding at the HTTP boundary, without a database. */
class PreferenceWriteControllerTest {
    private static final String TEST_KEY = "synthetic-test-only-shared-csrf-secret-47-abcdef";
    private final ObjectMapper mapper = new ObjectMapper();
    private SessionAccountService accounts;
    private PreferenceWriteService writes;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        accounts = mock(SessionAccountService.class);
        writes = mock(PreferenceWriteService.class);
        mvc = mvc(new CsrfProof(TEST_KEY, "", "", "", "development"));
    }

    private MockMvc mvc(CsrfProof csrf) {
        return MockMvcBuilders.standaloneSetup(new PreferenceWriteController(accounts, writes, csrf, mapper))
            .setControllerAdvice(new PreferenceWriteErrors()).build();
    }

    @Test
    void realSignedDoubleSubmitCanWriteOnlyForResolvedSession() throws Exception {
        MvcResult issued = mvc.perform(get("/api/security/csrf"))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
            .andReturn();
        String token = mapper.readTree(issued.getResponse().getContentAsString()).get("token").asText();
        String cookie = issued.getResponse().getHeader("Set-Cookie").split(";")[0];
        when(accounts.requireUser(any())).thenReturn(new SessionAccountService.User(7L,"owner@example.test","Owner","MEMBER"));
        when(writes.update(eq(7L), anyMap())).thenReturn(Map.of("ok", true));
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookie)
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", token)
            .header("Origin", "http://localhost").param("user_id", "99")
            .contentType("application/json")
            .content("{\"pauseHistory\":true,\"autoplayNext\":false}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.ok").value(true));
        verify(writes).update(eq(7L), anyMap());
    }

    @Test
    void missingForgedOrCrossSiteProofIsDeniedBeforeSessionOrStorage() throws Exception {
        MvcResult issued = mvc.perform(get("/api/security/csrf")).andReturn();
        String token = mapper.readTree(issued.getResponse().getContentAsString()).get("token").asText();
        String cookie = issued.getResponse().getHeader("Set-Cookie").split(";")[0];
        String body="{\"pauseHistory\":true,\"autoplayNext\":false}";
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookie)
            .header("X-CSRF-Token", token).contentType("application/json").content(body))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("Missing application request header"));
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookie)
            .header("X-Requested-With", "StreamAtlas").contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookie)
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", token)
            .header("Origin", "http://evil.invalid").contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookie)
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", token)
            .header("Sec-Fetch-Site", "cross-site").contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        String forged = token.substring(0, token.length() - 1)
            + (token.endsWith("X") ? "Y" : "X");
        mvc.perform(patch("/api/me/preferences").header("Cookie", cookie)
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", forged)
            .contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        // Matching attacker-controlled header/cookie values still need a valid HMAC.
        mvc.perform(patch("/api/me/preferences").header("Cookie", "sa_csrf=" + forged)
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", forged)
            .contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        verifyNoInteractions(accounts, writes);
    }

    @Test
    void acceptsNodeIssuedProofWithTheSameSharedKey() throws Exception {
        // Created by Node's crypto.createHmac('sha256', TEST_KEY).update(nonce).digest('base64url').
        String nodeToken = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.7T79yDuxapI4BBi5aPm-q-XEKP6hDdYQ3nUNmwi97eA";
        when(accounts.requireUser(any())).thenReturn(new SessionAccountService.User(7L,"owner@example.test","Owner","MEMBER"));
        when(writes.update(eq(7L), anyMap())).thenReturn(Map.of("ok", true));
        mvc.perform(patch("/api/me/preferences").header("Cookie", "sa_csrf=" + nodeToken)
            .header("X-Requested-With", "StreamAtlas").header("X-CSRF-Token", nodeToken)
            .contentType("application/json")
            .content("{\"pauseHistory\":true,\"autoplayNext\":false}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.ok").value(true));
        verify(writes).update(eq(7L), anyMap());
    }

    @Test
    void noSharedSecretLeavesWritesUnavailableAndDoesNotExposeASyntheticToken() throws Exception {
        MockMvc unsafe = mvc(new CsrfProof("", "", "", "", "development"));
        unsafe.perform(get("/api/security/csrf")).andExpect(status().isServiceUnavailable());
        unsafe.perform(patch("/api/me/preferences").header("X-Requested-With", "StreamAtlas")
            .contentType("application/json").content("{}"))
            .andExpect(status().isServiceUnavailable());
        verifyNoInteractions(accounts, writes);
    }
}
