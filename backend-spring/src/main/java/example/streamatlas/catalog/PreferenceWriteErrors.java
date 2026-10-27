package example.streamatlas.catalog;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Keep denial text useful without echoing SQL, tokens or submitted values. */
@RestControllerAdvice(assignableTypes = PreferenceWriteController.class)
public final class PreferenceWriteErrors {
    @ExceptionHandler(CsrfProof.Denied.class)
    public ResponseEntity<?> denied(CsrfProof.Denied error) {
        return response(HttpStatus.FORBIDDEN, error.getMessage());
    }

    @ExceptionHandler(CsrfProof.Unavailable.class)
    public ResponseEntity<?> unavailable(CsrfProof.Unavailable error) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, error.getMessage());
    }

    @ExceptionHandler(SessionAccountService.AuthenticationRequired.class)
    public ResponseEntity<?> authenticationRequired(SessionAccountService.AuthenticationRequired error) {
        return response(HttpStatus.UNAUTHORIZED, error.getMessage());
    }

    @ExceptionHandler(PreferenceWriteService.InvalidPreference.class)
    public ResponseEntity<?> invalidPreference(PreferenceWriteService.InvalidPreference error) {
        return response(HttpStatus.BAD_REQUEST, error.getMessage());
    }

    @ExceptionHandler(PreferenceWriteController.InvalidRequest.class)
    public ResponseEntity<?> invalidRequest(PreferenceWriteController.InvalidRequest error) {
        return response(HttpStatus.valueOf(error.status), error.getMessage());
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> storageUnavailable(DataAccessException error) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "Account storage unavailable");
    }

    private ResponseEntity<?> response(HttpStatus status, String message) {
        return SessionAccountController.response(status, Map.of("error", message));
    }
}
