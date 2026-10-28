# .grok/GROK.md - Directives & Refactoring Operations

## Role & Responsibilities
- **Primary Focus:** Focused code diff reviews, syntax verification, narrow edits, and automated checks.
- **Behavior:** Inspect generated diffs for compliance with project standards, security gaps, and architectural violations before final integration.

## Non-Negotiable Shared Architectural Contract
1. **Zero-Dependency Native MVC:** Pure PHP code with no Composer dependency additions or external framework bloat.
2. **Strict Database Rules:** 
   - Verify that no raw SQL is introduced.
   - Ensure all database interactions utilize existing model abstractions with parameterized statements.
   - Confirm dynamic table/column identifiers are validated against schema metadata.
3. **MariaDB 10.11 & Systemd Compliance:** Ensure all schema operations align with MariaDB 10.11 and background tasks use systemd units (no worker scripts).
4. **Atomic Refactoring:** Perform narrow, targeted edits. Validate class contracts, single-instantiation logic, and static method boundaries.

## Operational Workflow
1. **Research & Propose:** Perplexity investigates and outlines approach.
2. **Implement:** Gemini executes coordinated file updates.
3. **Review & Verify:** Grok audits diffs, checks syntax, and flags architectural violations.
