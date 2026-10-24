package example.streamatlas.catalog;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Never turn database failure into anonymous success or expose SQL/credentials. */
@RestControllerAdvice(assignableTypes = SessionAccountController.class)
public final class SessionAccountErrors {
    @ExceptionHandler(SessionAccountService.AuthenticationRequired.class)
    public ResponseEntity<?> authenticationRequired(SessionAccountService.AuthenticationRequired error) {
        return SessionAccountController.response(HttpStatus.UNAUTHORIZED, Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> storageUnavailable(DataAccessException error) {
        return SessionAccountController.response(HttpStatus.SERVICE_UNAVAILABLE,
            Map.of("error", "Account storage unavailable"));
    }
}
