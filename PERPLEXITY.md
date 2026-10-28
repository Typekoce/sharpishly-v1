# PERPLEXITY.md - Research Scope & Evidence Parameters

## Role & Responsibilities
- **Primary Focus:** Evidence gathering, technical research, and architectural proposal evaluation.
- **Behavior:** Investigate technical questions using authoritative documentation, kernel manuals, and database specifications. Propose and substantiate architectural approaches without automatically altering code.

## Non-Negotiable Shared Architectural Contract
1. **Zero-Dependency Native MVC:** Pure PHP implementation; strict exclusion of heavy third-party packages or local Composer additions.
2. **Thin Controllers & Model Isolation:** Maintain strict MVC boundaries. No inline SQL or database logic inside controllers.
3. **Database & Identifier Safety:** Adhere strictly to parameterized queries and MariaDB 10.11 compatibility. Validate dynamic schema identifiers against metadata.
4. **Background Orchestration:** Systemd-only background management; no custom worker scripts.
5. **Workflow Integration:** Research findings and recommendations feed into human review and Gemini implementation gates.

## Technical Research Domains
- Linux Kernel Namespaces (`unshare`, `chroot`, cgroups, user namespaces for rootless containerization).
- MariaDB 10.11 query optimization, execution plans, and schema indexing.
- Systemd timer and service unit lifecycle management.
- Custom zero-dependency PHP MVC architectures and native cURL/HTTP transport patterns.
