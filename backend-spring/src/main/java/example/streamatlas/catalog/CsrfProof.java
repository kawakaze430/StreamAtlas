package example.streamatlas.catalog;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Enumeration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Verify Node's signed double-submit proof before any Spring account write. */
@Component
public final class CsrfProof {
    private static final Pattern TOKEN = Pattern.compile("^([A-Za-z0-9_-]{32})\\.([A-Za-z0-9_-]{43})$");
    private static final SecureRandom RANDOM = new SecureRandom();
    private final String secret;
    private final String publicOrigin;
    private final boolean trustedProxy;
    private final boolean production;

    public CsrfProof(@Value("${SA_CSRF_SECRET:}") String secret,
            @Value("${SA_PUBLIC_ORIGIN:}") String publicOrigin,
            @Value("${TRUST_PROXY:}") String trustProxy,
            @Value("${SA_PROXY_TRUST_ACK:}") String proxyAck,
            @Value("${NODE_ENV:}") String mode) {
        this.secret = secret;
        this.publicOrigin = publicOrigin;
        this.trustedProxy = "1".equals(trustProxy) && "1".equals(proxyAck);
        this.production = "production".equals(mode);
    }

    public String issue(HttpServletRequest request) {
        requireConfiguration();
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        String nonce = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return nonce + "." + sign(nonce);
    }

    public String cookie(HttpServletRequest request, String token) {
        boolean secure = production || request.isSecure()
            || trustedProxy && "https".equals(request.getHeader("X-Forwarded-Proto"));
        return "sa_csrf=" + token + "; Path=/; SameSite=Strict; Max-Age=7200"
            + (secure ? "; Secure" : "");
    }

    public void verify(HttpServletRequest request) {
        if (!"StreamAtlas".equals(request.getHeader("X-Requested-With")))
            throw new Denied("Missing application request header");
        String fetchSite = request.getHeader("Sec-Fetch-Site");
        if (fetchSite != null && !fetchSite.equals("same-origin") && !fetchSite.equals("none"))
            throw new Denied("Cross-site requests are forbidden");
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.equals(allowedOrigin(request))
                && !origin.equals(forwardedOrigin(request)))
            throw new Denied("Invalid request origin");
        requireConfiguration();
        Enumeration<String> headers = request.getHeaders("X-CSRF-Token");
        if (headers == null || !headers.hasMoreElements())
            throw new Denied("Missing or invalid CSRF token");
        String token = headers.nextElement();
        if (headers.hasMoreElements() || token == null)
            throw new Denied("Missing or invalid CSRF token");
        String cookie = csrfCookie(request);
        if (!token.equals(cookie)) throw new Denied("Missing or invalid CSRF token");
        Matcher match = TOKEN.matcher(token);
        if (!match.matches()) throw new Denied("Invalid CSRF token");
        byte[] expected = sign(match.group(1)).getBytes(StandardCharsets.US_ASCII);
        byte[] actual = match.group(2).getBytes(StandardCharsets.US_ASCII);
        if (!MessageDigest.isEqual(expected, actual)) throw new Denied("Invalid CSRF signature");
    }

    private void requireConfiguration() {
        // Node's default development secret is generated in memory and cannot be
        // shared across backends. Writes stay unavailable until a shared key is set.
        if (secret == null || secret.length() < 32
                || production && (publicOrigin == null || !publicOrigin.startsWith("https://")))
            throw new Unavailable();
    }

    private String allowedOrigin(HttpServletRequest request) {
        if (publicOrigin != null && !publicOrigin.isBlank()) return publicOrigin;
        String scheme = request.isSecure() ? "https" : "http";
        int port = request.getServerPort();
        return scheme + "://" + request.getServerName()
            + ((port == 80 && scheme.equals("http")) || (port == 443 && scheme.equals("https")) ? "" : ":" + port);
    }

    private String forwardedOrigin(HttpServletRequest request) {
        if (publicOrigin != null && !publicOrigin.isBlank()) return publicOrigin;
        if (trustedProxy && "https".equals(request.getHeader("X-Forwarded-Proto"))) {
            String host = request.getHeader("Host");
            if (host != null && host.matches("[A-Za-z0-9.:-]+")) return "https://" + host;
        }
        return allowedOrigin(request);
    }

    private String csrfCookie(HttpServletRequest request) {
        String value = null;
        Enumeration<String> headers = request.getHeaders("Cookie");
        while (headers != null && headers.hasMoreElements()) {
            for (String part : headers.nextElement().split(";")) {
                int equals = part.indexOf('=');
                if (equals < 0 || !"sa_csrf".equals(part.substring(0, equals).trim())) continue;
                try {
                    value = URLDecoder.decode(part.substring(equals + 1).trim().replace("+", "%2B"), StandardCharsets.UTF_8);
                } catch (IllegalArgumentException invalid) {
                    value = null;
                }
            }
        }
        return value;
    }

    private String sign(String nonce) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal(nonce.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception unavailable) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", unavailable);
        }
    }

    static final class Denied extends RuntimeException {
        Denied(String message) { super(message); }
    }

    static final class Unavailable extends RuntimeException {
        Unavailable() { super("Shared CSRF configuration is required for Spring account writes"); }
    }
}
