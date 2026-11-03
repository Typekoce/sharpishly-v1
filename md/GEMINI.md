# GEMINI.md - Core Project Directives & Architecture

## Role & Responsibilities
- **Primary Focus:** Implementation, repository-wide refactoring, and multi-file coordination across controllers, models, and core libraries.
- **Behavior:** Maintain architectural consistency and dependency boundaries. Execute planned changes following human approval gates.

## Non-Negotiable Shared Architectural Contract
1. **Zero-Dependency Native MVC:** Custom PHP framework with no external framework overhead or local Composer package additions.
2. **Thin Controllers & DRY Models:** Strict separation of concerns. Controllers handle request dispatching only; all business logic and data access reside in schema-driven models.
3. **Enforceable Database Contract:**
   - Controllers never construct SQL or access database connections directly.
   - Models use existing application database abstractions and parameterized queries exclusively. **NO RAW SQL INLINE.**
   - Dynamic identifiers (table/column names) must be validated against trusted schema metadata; placeholders alone cannot parameterize identifiers.
   - No CLI agent may introduce a new database abstraction or third-party package without explicit user approval.
4. **MariaDB 10.11 Compatibility:** All database queries, schema definitions, and migration scripts must target MariaDB 10.11.
5. **Background Orchestration:** Rely strictly on systemd service and timer units. No custom background worker scripts or polling loops.
6. **Explicit Approval Gates:** Require explicit user confirmation before executing destructive commands, broad automated file rewrites, or schema migrations.

## System Environment & Tools
- **OS/Host:** Linux (Ubuntu/Debian CLI environments).
- **Execution & Shell:** Native POSIX/zsh tools (`tmux`, `vim`, `ripgrep`, `jq`, `pass`, `curl`).
- **Containerization:** Rootless namespace isolation via `NanoJail` / `pureshare`.
