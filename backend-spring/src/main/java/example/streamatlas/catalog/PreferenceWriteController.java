package example.streamatlas.catalog;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RestController;

/** A bounded Node-compatible preference mutation; other Spring APIs remain read-only. */
@RestController
public final class PreferenceWriteController {
    private final SessionAccountService accounts;
    private final PreferenceWriteService writes;
    private final CsrfProof csrf;
    private final ObjectMapper mapper;

    public PreferenceWriteController(SessionAccountService accounts, PreferenceWriteService writes,
            CsrfProof csrf, ObjectMapper mapper) {
        this.accounts = accounts;
        this.writes = writes;
        this.csrf = csrf;
        this.mapper = mapper;
    }

    @GetMapping("/api/security/csrf")
    public ResponseEntity<?> csrf(HttpServletRequest request) {
        String token = csrf.issue(request);
        return ResponseEntity.status(HttpStatus.OK).cacheControl(CacheControl.noStore())
            .varyBy("Cookie").header("Set-Cookie", csrf.cookie(request, token))
            .body(Map.of("token", token));
    }

    @PatchMapping("/api/me/preferences")
    public ResponseEntity<?> preferences(HttpServletRequest request) throws IOException {
        csrf.verify(request);
        long owner = accounts.requireUser(request).id();
        return SessionAccountController.response(HttpStatus.OK, writes.update(owner, readBody(request)));
    }

    private Map<String, Object> readBody(HttpServletRequest request) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] chunk = new byte[4096];
        int read;
        var input = request.getInputStream();
        while ((read = input.read(chunk)) != -1) {
            if (bytes.size() + read > 65536) throw new InvalidRequest("Request body too large", 413);
            bytes.write(chunk, 0, read);
        }
        if (bytes.size() == 0) return Map.of();
        try {
            Object value = mapper.readValue(bytes.toByteArray(), Object.class);
            if (value instanceof Map<?, ?> fields) {
                @SuppressWarnings("unchecked") Map<String, Object> body = (Map<String, Object>) fields;
                return body;
            }
            return Map.of();
        } catch (Exception invalid) {
            throw new InvalidRequest("Invalid JSON", 400);
        }
    }

    static final class InvalidRequest extends RuntimeException {
        final int status;
        InvalidRequest(String message, int status) { super(message); this.status = status; }
    }
}
