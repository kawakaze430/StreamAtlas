package example.streamatlas.catalog;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Enumeration;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Read-only use of Node-issued sessions. Does not create credentials or bypass MFA. */
@Service
public final class SessionAccountService {
    private final JdbcTemplate jdbc;

    public SessionAccountService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record User(long id, String email, String name, String role) {}
    private record Preferences(boolean pauseHistory, boolean autoplayNext,
            String theme, String locale, boolean saveSearches) {}

    public Optional<User> currentUser(HttpServletRequest request) {
        String token = sessionToken(request);
        if (token == null || token.isEmpty()) return Optional.empty();
        List<User> users = jdbc.query(
            "SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id " +
            "WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP " +
            "AND NOT EXISTS (SELECT 1 FROM closed_accounts c WHERE c.user_id=u.id)",
            (rs, row) -> new User(rs.getLong("id"), rs.getString("email"),
                rs.getString("name"), rs.getString("role")), hashToken(token));
        return users.stream().findFirst();
    }

    public User requireUser(HttpServletRequest request) {
        return currentUser(request).orElseThrow(AuthenticationRequired::new);
    }

    public Map<String, Object> preferences(long userId, boolean expanded) {
        List<Preferences> found = jdbc.query(
            "SELECT pause_history,autoplay_next,theme,locale,save_searches " +
            "FROM user_preferences WHERE user_id=?",
            (rs, row) -> new Preferences(rs.getBoolean("pause_history"),
                rs.getBoolean("autoplay_next"), rs.getString("theme"),
                rs.getString("locale"), rs.getBoolean("save_searches")), userId);
        Preferences value = found.isEmpty()
            ? new Preferences(false, false, "dark", "English", false) : found.getFirst();
        Map<String, Object> output = new LinkedHashMap<>();
        output.put("pauseHistory", value.pauseHistory());
        output.put("autoplayNext", value.autoplayNext());
        if (expanded) {
            output.put("theme", defaultText(value.theme(), "dark"));
            output.put("locale", defaultText(value.locale(), "English"));
            output.put("saveSearches", value.saveSearches());
        }
        return output;
    }

    static String hashToken(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static String defaultText(String value, String fallback) {
        return value == null || value.isEmpty() ? fallback : value;
    }

    private static String sessionToken(HttpServletRequest request) {
        String token = null;
        boolean hadHeader = false;
        Enumeration<String> headers = request.getHeaders("Cookie");
        while (headers != null && headers.hasMoreElements()) {
            hadHeader = true;
            for (String part : headers.nextElement().split(";")) {
                int equals = part.indexOf('=');
                if (equals >= 0 && part.substring(0, equals).trim().equals("sa_session"))
                    token = decodeCookie(part.substring(equals + 1).trim());
            }
        }
        if (!hadHeader && request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (cookie.getName().equals("sa_session")) token = decodeCookie(cookie.getValue());
            }
        }
        // Node's parser uses the last matching cookie and treats malformed URI
        // escapes as an empty token. It does not interpret '+' as a space.
        return token;
    }

    private static String decodeCookie(String input) {
        if (input == null) return null;
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(input.length());
        for (int index = 0; index < input.length();) {
            char value = input.charAt(index);
            if (value == '%') {
                if (index + 2 >= input.length()) return null;
                int high = Character.digit(input.charAt(index + 1), 16);
                int low = Character.digit(input.charAt(index + 2), 16);
                if (high < 0 || low < 0) return null;
                bytes.write((high << 4) | low);
                index += 3;
            } else {
                int end = index + Character.charCount(input.codePointAt(index));
                bytes.writeBytes(input.substring(index, end).getBytes(StandardCharsets.UTF_8));
                index = end;
            }
        }
        try {
            return StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes.toByteArray())).toString();
        } catch (CharacterCodingException invalid) {
            return null;
        }
    }

    static final class AuthenticationRequired extends RuntimeException {
        AuthenticationRequired() {
            super("Sign in or enable demo mode to use this feature.");
        }
    }
}
