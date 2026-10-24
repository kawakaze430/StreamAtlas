package example.streamatlas.catalog;

import java.util.Collections;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Two existing Node GET contracts, using existing PostgreSQL session/account rows. */
@RestController
public final class SessionAccountController {
    private final SessionAccountService accounts;

    public SessionAccountController(SessionAccountService accounts) { this.accounts = accounts; }

    @GetMapping("/api/auth/me")
    public ResponseEntity<?> currentUser(HttpServletRequest request) {
        return response(HttpStatus.OK,
            Collections.singletonMap("user", accounts.currentUser(request).orElse(null)));
    }

    @GetMapping("/api/me/preferences")
    public ResponseEntity<?> preferences(HttpServletRequest request) {
        SessionAccountService.User user = accounts.requireUser(request);
        // URLSearchParams.get in Node chooses the first repeated value too.
        return response(HttpStatus.OK,
            accounts.preferences(user.id(), "1".equals(request.getParameter("expanded"))));
    }

    static ResponseEntity<?> response(HttpStatus status, Object body) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore())
            .varyBy("Cookie").body(body);
    }
}
