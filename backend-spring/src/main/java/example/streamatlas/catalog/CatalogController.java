package example.streamatlas.catalog;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Initial read-only PostgreSQL catalog contract, not yet wired to frontend. */
@RestController
@RequestMapping("/api/v1/catalog")
public final class CatalogController {
    // Defense in depth: Spring is still a private, read-only prototype.
    // Never return uploaded media without a current local license review,
    // and never list videos with an active hold. This is NOT legal verification.
    private static final String VISIBLE = "v.status='PUBLISHED' " +
        "AND NOT EXISTS (SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL) " +
        "AND NOT EXISTS (SELECT 1 FROM upload_sessions u WHERE u.video_id=v.id AND NOT EXISTS " +
        "(SELECT 1 FROM media_license_reviews ml WHERE ml.upload_id=u.id AND ml.status='VERIFIED' AND ml.expires_at>now()))";
    private final JdbcTemplate jdbc;
    public CatalogController(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    @GetMapping("/health")
    public Map<String,Object> health() {return Map.of("ok",true,"service","StreamAtlas read-only catalog","checkpoint",27);}

    @GetMapping("/videos")
    public Map<String,Object> videos(
        @RequestParam(defaultValue="") String q,
        @RequestParam(defaultValue="latest") String sort,
        @RequestParam(defaultValue="1") int page,
        @RequestParam(defaultValue="24") int limit) {
        int actualPage=Math.min(1000,Math.max(1,page));
        int size=Math.min(48,Math.max(1,limit));
        String needle="%"+q.substring(0,Math.min(q.length(),80)).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
        String order=switch(sort) {
          case "most-viewed" -> "v.views DESC,v.id DESC";
          case "top-rated" -> "(v.likes::decimal/(v.likes+v.dislikes+1)) DESC,v.likes DESC,v.id DESC";
          case "oldest" -> "v.published_at ASC,v.id ASC";
          default -> "v.published_at DESC,v.id DESC";
        };
        String conditions=VISIBLE+" AND (v.title ILIKE ? OR ch.name ILIKE ?)";
        Long total=jdbc.queryForObject("SELECT COUNT(*) FROM videos v JOIN channels ch ON ch.id=v.channel_id WHERE "+conditions,Long.class,needle,needle);
        List<Map<String,Object>> rows=jdbc.queryForList(
            "SELECT v.id,v.title,v.slug,v.poster,v.duration,v.quality,v.views,v.likes,v.dislikes,v.published_at AS \"publishedAt\",ch.name AS \"channelName\",s.name AS \"siteName\" " +
            "FROM videos v JOIN channels ch ON ch.id=v.channel_id JOIN sites s ON s.id=v.site_id WHERE "+conditions+
            " ORDER BY "+order+" LIMIT ? OFFSET ?",needle,needle,size,(actualPage-1)*size);
        return Map.of("items",rows,"total",total==null?0L:total,"page",actualPage,"limit",size,"pages",(int)Math.ceil((total==null?0:total)/(double)size));
    }

    @GetMapping("/videos/{slug}")
    public Map<String,Object> video(@PathVariable String slug){
        List<Map<String,Object>> rows=jdbc.queryForList(
         "SELECT v.id,v.title,v.slug,v.poster,v.duration,v.quality,v.views,v.likes,v.dislikes,v.published_at AS \"publishedAt\" " +
         "FROM videos v WHERE v.slug=? AND "+VISIBLE,slug);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Video not found");
        return rows.getFirst();
    }
    @GetMapping("/categories")
    public List<Map<String,Object>> categories(){return jdbc.queryForList("SELECT id,name,slug FROM categories ORDER BY name LIMIT 500");}
    @GetMapping("/networks")
    public List<Map<String,Object>> networks(){return jdbc.queryForList("SELECT id,name,slug,description FROM networks ORDER BY name LIMIT 500");}
    @GetMapping("/sites")
    public List<Map<String,Object>> sites(){return jdbc.queryForList("SELECT id,name,slug,network_id AS \"networkId\",last_updated AS \"lastUpdated\" FROM sites ORDER BY last_updated DESC NULLS LAST LIMIT 500");}
    @GetMapping("/performers")
    public List<Map<String,Object>> performers(){return jdbc.queryForList("SELECT id,name,slug,country FROM performers ORDER BY name LIMIT 500");}
}
