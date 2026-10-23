# Spring Boot read-only PostgreSQL catalog starter

This is an **initial module**, not a working replacement for the Node server. It implements only `/api/v1/catalog/health`, `/videos`, `/videos/{slug}`, `/categories`, `/networks`, `/sites`, and `/performers`. It deliberately has NO login, upload, media, moderation or account APIs. The existing Node API remains the only runnable full application.

Prerequisites: Java 21, Maven, PostgreSQL 15+, tables initialized through the eight `migrations/postgresql` SQL scripts and sample catalog imported using the generated `catalog-import.pg.sql`.

Set environment variables `SA_PG_URL`, `SA_PG_USER`, `SA_PG_PASSWORD`, then run `mvn -f backend-spring/pom.xml spring-boot:run` from the project root. The service listens on localhost:8080 by default and must not be exposed to the internet. No live Postgres/Maven verification was available during this release, and compilation/integration remain a required validation step. This module does not bypass rights, age or geographic controls for a public deployment; it is for private catalog integration testing only.

**Checkpoint 27 safety:** The Spring catalog now binds to `127.0.0.1` by default, omits raw media URLs, and excludes videos with active holds or uploaded videos lacking a current local license review. This does NOT establish independent rights/age/consent verification, nor Node API parity. Run the proposed PostgreSQL 16/Maven CI job before relying on Spring compilation. Do not expose this read-only module publicly.
