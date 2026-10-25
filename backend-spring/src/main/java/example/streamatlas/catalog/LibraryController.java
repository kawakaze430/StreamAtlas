package example.streamatlas.catalog;

import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Existing Node library GET contracts; writes remain on the Node application. */
@RestController
public final class LibraryController {
    private final SessionAccountService accounts;
    private final LibraryService libraries;

    public LibraryController(SessionAccountService accounts, LibraryService libraries) {
        this.accounts = accounts;
        this.libraries = libraries;
    }

    @GetMapping("/api/me/library")
    public ResponseEntity<?> library(HttpServletRequest request) {
        long owner = accounts.requireUser(request).id();
        return response(libraries.library(owner, value(request, "type", "favorites"),
            value(request, "sort", "newest"), value(request, "filter", "all")));
    }

    @GetMapping("/api/me/history")
    public ResponseEntity<?> history(HttpServletRequest request) {
        return response(Map.of("items", libraries.history(accounts.requireUser(request).id())));
    }

    @GetMapping("/api/me/queue")
    public ResponseEntity<?> queue(HttpServletRequest request) {
        return response(Map.of("items", libraries.queue(accounts.requireUser(request).id())));
    }

    @GetMapping("/api/me/subscriptions")
    public ResponseEntity<?> subscriptions(HttpServletRequest request) {
        return response(Map.of("items", libraries.subscriptions(accounts.requireUser(request).id())));
    }

    @GetMapping("/api/me/feed")
    public ResponseEntity<?> feed(HttpServletRequest request) {
        return response(Map.of("items", libraries.feed(accounts.requireUser(request).id())));
    }

    private static ResponseEntity<?> response(Object body) {
        return SessionAccountController.response(HttpStatus.OK, body);
    }

    // URLSearchParams.get returns the first value; an empty value uses Node's default.
    private static String value(HttpServletRequest request, String name, String fallback) {
        String value = request.getParameter(name);
        return value == null || value.isEmpty() ? fallback : value;
    }
}
