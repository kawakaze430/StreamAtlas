package example.streamatlas.catalog;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Controller HTTP contracts only: no application context, database, or Node API parity claim. */
class CatalogControllerTest {
    private JdbcTemplate jdbc;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        mvc = MockMvcBuilders.standaloneSetup(new CatalogController(jdbc)).build();
    }

    @Test
    void healthDescribesTheReadOnlyCatalogWithoutQueryingTheDatabase() throws Exception {
        mvc.perform(get("/api/v1/catalog/health"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.ok").value(true))
            .andExpect(jsonPath("$.service").value("StreamAtlas read-only catalog"))
            .andExpect(jsonPath("$.checkpoint").value(27));
        verifyNoInteractions(jdbc);
    }

    @Test
    void missingVideoReturnsNotFound() throws Exception {
        when(jdbc.queryForList(anyString(), eq("missing-synthetic-video"))).thenReturn(List.of());
        mvc.perform(get("/api/v1/catalog/videos/missing-synthetic-video"))
            .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @CsvSource({"-5,0,1,1,0", "1001,100,1000,48,47952", "2,12,2,12,12"})
    void paginationClampsUntrustedBounds(int page, int limit, int actualPage, int size, int offset)
            throws Exception {
        stubCatalog(0L, List.of());
        mvc.perform(get("/api/v1/catalog/videos")
                .param("page", Integer.toString(page)).param("limit", Integer.toString(limit)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.page").value(actualPage))
            .andExpect(jsonPath("$.limit").value(size))
            .andExpect(jsonPath("$.pages").value(0));
        verify(jdbc).queryForList(anyString(), eq("%%"), eq("%%"), eq(size), eq(offset));
    }

    @Test
    void catalogResponseIncludesItemsAndTotalPageCount() throws Exception {
        stubCatalog(49L, List.of(Map.of("id", 1, "title", "Synthetic catalog fixture")));
        mvc.perform(get("/api/v1/catalog/videos").param("page", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(49))
            .andExpect(jsonPath("$.page").value(2))
            .andExpect(jsonPath("$.limit").value(24))
            .andExpect(jsonPath("$.pages").value(3))
            .andExpect(jsonPath("$.items[0].title").value("Synthetic catalog fixture"));
    }

    @Test
    void searchIsBoundAsParametersAndEscapesWildcardCharacters() throws Exception {
        stubCatalog(0L, List.of());
        String query = "synthetic%_\\' OR 1=1 --";
        String needle = "%synthetic\\%\\_\\\\' OR 1=1 --%";
        mvc.perform(get("/api/v1/catalog/videos").param("q", query))
            .andExpect(status().isOk());
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForList(sql.capture(), eq(needle), eq(needle), eq(24), eq(0));
        verify(jdbc).queryForObject(anyString(), eq(Long.class), eq(needle), eq(needle));
        assertFalse(sql.getValue().contains(query));
    }

    @Test
    void searchBoundsTheQueryLength() throws Exception {
        stubCatalog(0L, List.of());
        mvc.perform(get("/api/v1/catalog/videos").param("q", "x".repeat(100)))
            .andExpect(status().isOk());
        String needle = "%" + "x".repeat(80) + "%";
        verify(jdbc).queryForList(anyString(), eq(needle), eq(needle), eq(24), eq(0));
    }

    @ParameterizedTest
    @CsvSource(value = {
        "latest|v.published_at DESC,v.id DESC",
        "most-viewed|v.views DESC,v.id DESC",
        "top-rated|(v.likes::decimal/(v.likes+v.dislikes+1)) DESC,v.likes DESC,v.id DESC",
        "oldest|v.published_at ASC,v.id ASC"
    }, delimiter = '|')
    void supportedSortSelectsAReviewedOrder(String sort, String order) throws Exception {
        stubCatalog(0L, List.of());
        mvc.perform(get("/api/v1/catalog/videos").param("sort", sort))
            .andExpect(status().isOk());
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForList(sql.capture(), any(Object[].class));
        assertTrue(sql.getValue().endsWith(" ORDER BY " + order + " LIMIT ? OFFSET ?"));
    }

    @Test
    void unrecognizedSortUsesLatestInsteadOfInjectingSql() throws Exception {
        stubCatalog(0L, List.of());
        String untrustedSort = "title; DROP TABLE videos; --";
        mvc.perform(get("/api/v1/catalog/videos").param("sort", "latest"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/catalog/videos").param("sort", untrustedSort))
            .andExpect(status().isOk());
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(2)).queryForList(sql.capture(), any(Object[].class));
        assertEquals(sql.getAllValues().getFirst(), sql.getAllValues().getLast());
        assertFalse(sql.getAllValues().getLast().contains(untrustedSort));
    }

    @Test
    void catalogControllerDoesNotProvideAnAuthenticationRoute() throws Exception {
        mvc.perform(get("/api/v1/auth/login")).andExpect(status().isNotFound());
        verifyNoInteractions(jdbc);
    }

    @Test
    void videosEndpointRejectsWrites() throws Exception {
        mvc.perform(post("/api/v1/catalog/videos")).andExpect(status().isMethodNotAllowed());
        verifyNoInteractions(jdbc);
    }

    private void stubCatalog(long total, List<Map<String, Object>> rows) {
        when(jdbc.queryForObject(anyString(), eq(Long.class), any(Object[].class))).thenReturn(total);
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(rows);
    }
}
