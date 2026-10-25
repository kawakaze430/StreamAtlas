package example.streamatlas.catalog;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Owner-scoped PostgreSQL library reads matching the local Node application. */
@Service
public final class LibraryService {
    private static final DateTimeFormatter NODE_TIME =
        DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);
    private static final String COLUMNS = "v.id,v.title,v.slug,v.poster,v.media_url,v.duration,v.quality," +
        "v.views,v.likes,v.dislikes,v.published_at,v.site_id,v.channel_id,s.name AS site_name," +
        "s.slug AS site_slug,n.id AS network_id,n.name AS network_name,n.slug AS network_slug," +
        "ch.name AS channel_name,ch.slug AS channel_slug," +
        "(SELECT string_agg(c.name,' | ' ORDER BY vc.category_id) FROM categories c " +
        "JOIN video_categories vc ON vc.category_id=c.id WHERE vc.video_id=v.id) AS categories_text," +
        "(SELECT string_agg(p.name,' | ' ORDER BY vp.performer_id) FROM performers p " +
        "JOIN video_performers vp ON vp.performer_id=p.id WHERE vp.video_id=v.id) AS performers_text";
    private static final String FROM = " FROM videos v JOIN sites s ON s.id=v.site_id " +
        "LEFT JOIN networks n ON n.id=s.network_id JOIN channels ch ON ch.id=v.channel_id ";
    private static final String VISIBLE = "v.status='PUBLISHED' AND NOT EXISTS " +
        "(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)";
    private final JdbcTemplate jdbc;

    public LibraryService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Map<String, Object> library(long owner, String type, String sort, String filter) {
        // Validate before constructing SQL; only fixed table names enter the query.
        if (!Set.of("newest", "oldest", "most-viewed").contains(sort)
                || !Set.of("all", "watched", "unwatched").contains(filter))
            throw new InvalidLibraryRequest(HttpStatus.BAD_REQUEST, "Invalid library filter");
        String table = switch (type) {
            case "favorites" -> "favorites";
            case "watch_later" -> "watch_later";
            default -> throw new InvalidLibraryRequest(HttpStatus.NOT_FOUND, "Unknown list");
        };
        String watch = filter.equals("all") ? "" : " AND " + (filter.equals("unwatched") ? "NOT " : "") +
            "EXISTS (SELECT 1 FROM watch_progress w WHERE w.user_id=x.user_id AND w.video_id=v.id AND w.position>0)";
        List<Map<String, Object>> items = new ArrayList<>(jdbc.query("SELECT " + COLUMNS + FROM +
            "JOIN " + table + " x ON x.video_id=v.id WHERE x.user_id=? AND " + VISIBLE + watch +
            " ORDER BY x.created_at DESC", (rs, row) -> video(rs, false), owner));
        if (sort.equals("oldest")) Collections.reverse(items);
        if (sort.equals("most-viewed")) items.sort(Comparator
            .<Map<String, Object>>comparingLong(v -> ((Number) v.get("views")).longValue()).reversed()
            .thenComparing(Comparator.comparingLong((Map<String, Object> v) -> ((Number) v.get("id")).longValue()).reversed()));
        return Map.of("items", items, "sort", sort, "filter", filter);
    }

    public List<Map<String, Object>> history(long owner) {
        return jdbc.query("SELECT " + COLUMNS + ",w.position AS progress" + FROM +
            "JOIN watch_progress w ON w.video_id=v.id WHERE w.user_id=? AND " + VISIBLE +
            " ORDER BY w.watched_at DESC", (rs, row) -> video(rs, true), owner);
    }

    public List<Map<String, Object>> queue(long owner) {
        return jdbc.query("SELECT " + COLUMNS + FROM +
            "JOIN watch_queue q ON q.video_id=v.id WHERE q.user_id=? AND " + VISIBLE +
            " ORDER BY q.position ASC,q.added_at ASC", (rs, row) -> video(rs, false), owner);
    }

    public List<Map<String, Object>> feed(long owner) {
        return jdbc.query("SELECT " + COLUMNS + FROM +
            "JOIN subscriptions sub ON sub.channel_id=v.channel_id WHERE sub.user_id=? AND " + VISIBLE +
            " ORDER BY v.published_at DESC LIMIT 48", (rs, row) -> video(rs, false), owner);
    }

    public List<Map<String, Object>> subscriptions(long owner) {
        return jdbc.query("SELECT c.id,c.site_id,c.name,c.slug,x.notify,x.notify_mode,s.name AS site_name " +
            "FROM subscriptions x JOIN channels c ON c.id=x.channel_id LEFT JOIN sites s ON s.id=c.site_id " +
            "WHERE x.user_id=? ORDER BY x.created_at DESC", (rs, row) -> {
                Map<String, Object> value = new LinkedHashMap<>();
                value.put("id", rs.getObject("id"));
                value.put("site_id", rs.getObject("site_id"));
                value.put("name", rs.getString("name"));
                value.put("slug", rs.getString("slug"));
                // SQLite's boolean field is serialized as the integer 0/1 by Node.
                value.put("notify", rs.getBoolean("notify") ? 1 : 0);
                value.put("notifyMode", rs.getString("notify_mode"));
                value.put("siteName", rs.getString("site_name"));
                return value;
            }, owner);
    }

    private static Map<String, Object> video(ResultSet rs, boolean progress) throws SQLException {
        Map<String, Object> value = new LinkedHashMap<>();
        for (String key : List.of("id", "title", "slug", "poster", "duration", "quality", "views", "likes", "dislikes"))
            value.put(key, rs.getObject(key));
        String media = rs.getString("media_url");
        value.put("mediaUrl", media);
        var published = rs.getTimestamp("published_at");
        value.put("publishedAt", published == null ? null : NODE_TIME.format(published.toInstant()));
        for (String[] key : new String[][] {{"siteId", "site_id"}, {"channelId", "channel_id"},
                {"siteName", "site_name"}, {"siteSlug", "site_slug"}, {"networkId", "network_id"},
                {"networkName", "network_name"}, {"networkSlug", "network_slug"},
                {"channelName", "channel_name"}, {"channelSlug", "channel_slug"}})
            value.put(key[0], rs.getObject(key[1]));
        String categories = rs.getString("categories_text"), performers = rs.getString("performers_text");
        value.put("categoriesText", categories);
        value.put("performersText", performers);
        if (progress) value.put("progress", rs.getObject("progress"));
        value.put("previewFrame", media != null && media.matches("/assets/videos/sample-[1-4]\\.mp4")
            ? media.replace("/videos/", "/hls-demo/").replace(".mp4", "/preview-0.jpg") : null);
        value.put("categories", categories == null || categories.isEmpty() ? List.of() : List.of(categories.split(" \\| ", -1)));
        value.put("performers", performers == null || performers.isEmpty() ? List.of() : List.of(performers.split(" \\| ", -1)));
        return value;
    }

    static final class InvalidLibraryRequest extends RuntimeException {
        final HttpStatus status;
        InvalidLibraryRequest(HttpStatus status, String message) { super(message); this.status = status; }
    }
}
