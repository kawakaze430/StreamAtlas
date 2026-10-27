package example.streamatlas.catalog;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The first Spring account write, scoped to the existing Node-issued session. */
@Service
public class PreferenceWriteService {
    private static final Set<String> THEMES = Set.of("dark", "light");
    private static final Set<String> LOCALES = Set.of("English", "Hindi", "Spanish", "French", "German");
    private final JdbcTemplate jdbc;

    public PreferenceWriteService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional
    public Map<String, Object> update(long owner, Map<String, Object> body) {
        if (!(body.get("pauseHistory") instanceof Boolean pauseHistory)
                || !(body.get("autoplayNext") instanceof Boolean autoplayNext))
            throw new InvalidPreference("Provide both privacy preferences as booleans.");
        List<Previous> rows = jdbc.query(
            "SELECT theme,locale,save_searches FROM user_preferences WHERE user_id=? FOR UPDATE",
            (rs, row) -> new Previous(rs.getString("theme"), rs.getString("locale"),
                rs.getBoolean("save_searches")), owner);
        Previous previous = rows.isEmpty() ? new Previous("dark", "English", false) : rows.getFirst();
        Object theme = body.get("theme") == null ? previous.theme() : body.get("theme");
        Object locale = body.get("locale") == null ? previous.locale() : body.get("locale");
        Object saves = body.get("saveSearches") == null ? previous.saveSearches() : body.get("saveSearches");
        if (!(theme instanceof String selectedTheme) || !THEMES.contains(selectedTheme)
                || !(locale instanceof String selectedLocale) || !LOCALES.contains(selectedLocale)
                || !(saves instanceof Boolean saveSearches))
            throw new InvalidPreference("Invalid account preferences");
        jdbc.update("INSERT INTO user_preferences(user_id,pause_history,autoplay_next,theme,locale,save_searches,updated_at) " +
            "VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET " +
            "pause_history=excluded.pause_history,autoplay_next=excluded.autoplay_next," +
            "theme=excluded.theme,locale=excluded.locale,save_searches=excluded.save_searches," +
            "updated_at=excluded.updated_at", owner,pauseHistory,autoplayNext,
            selectedTheme,selectedLocale,saveSearches,OffsetDateTime.now(ZoneOffset.UTC));
        if (!saveSearches) jdbc.update("DELETE FROM search_history WHERE user_id=?", owner);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", true);
        result.put("pauseHistory", pauseHistory);
        result.put("autoplayNext", autoplayNext);
        result.put("theme", selectedTheme);
        result.put("locale", selectedLocale);
        result.put("saveSearches", saveSearches);
        return result;
    }

    private record Previous(String theme, String locale, boolean saveSearches) {}

    static final class InvalidPreference extends RuntimeException {
        InvalidPreference(String message) { super(message); }
    }
}
