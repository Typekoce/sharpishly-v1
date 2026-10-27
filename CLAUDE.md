# Sharpishly Architecture & Development Guide (`CLAUDE.md`)

This document serves as the definitive guide to the architecture, codebase conventions, and core philosophy governing the Sharpishly project. 

---

## 1. Core Philosophy & Tent-Poles

The codebase is built on four immutable pillars:

1. **Model-View-Controller (MVC)**: Clean separation of concerns with thin controllers, encapsulated models, and native view rendering without heavy framework overhead.
2. **Don't Repeat Yourself (DRY)**: Reusable components, centralized services, and modular logic to eliminate boilerplate and code duplication.
3. **Paul Graham's "Don't do Things That Scale"**: We prioritize rapid, manual, low-abstraction, file-backed implementations over premature enterprise scaling. Build it by hand, make it work locally, and keep things radically simple before adding abstraction.
4. **Lateral Thinking**: Solving structural problems through unconventional, direct, and zero-dependency mechanisms (e.g., file-system queues instead of heavy message brokers like Redis or RabbitMQ).

---

## 2. Architecture & Core Conventions

### Zero-Dependency, Zero-Bloat Design
* **No Local Composer**: Composer is not installed locally and is reserved strictly for remote GitHub Actions CI/CD workflows. Classes and dependencies are managed explicitly via native PHP conventions rather than heavy autoloader bloat.
* **Two-File Core Routing**: The application core utilizes a lightweight convention-based router handling `/php` and `/api` prefixes, route aliases (e.g., `upload`), and method reflection checks.
* **File Structure**:
  ```text
  sharpishly/
  ├── app/                  # Application source (Controllers, Models, Services)
  ├── public/               # Web root assets and entry points
  ├── storage/              # Runtime storage (file queues, logs, uploads)
  │   └── jobs/             # File-backed asynchronous job queues
  └── build/ & cmd/         # CLI background workers and automation scripts

  * **Note **
  The storage folder in use is: app/php/src/cmd/storage