# Sharpishly Project Context & Architectural Rules

## Core Tenets
1. **MVC Architecture & Model Abstraction Layer:** Strict separation between Views, Controllers, Models, and Services. **All database interactivity and data operations must be handled exclusively via the associated Model** (acting as an abstraction layer). Controllers must never interact directly with the database, database connections, SQL, or `App\Services\Db`; all data access must be delegated to the relevant Model or to a Service that itself uses Models/data mappers.
2. **DRY & Modular Simplicity:** Reusable methods, thin controllers, and clean service abstractions. Avoid over-engineering, code duplication, and unnecessary complexity. Code must be broken down into small, single-responsibility reusable methods adhering strictly to the established MVC pattern.
3. **Zero Third-Party Dependencies (PHP Backend):** No third-party libraries, application frameworks, or external runtime dependencies allowed locally in PHP. Native PHP 8.2+ features only.
   - **Strictly Prohibited:** Laravel, Symfony, Illuminate packages, or any composer dependencies in local environments. Composer is restricted strictly to GitHub Actions CI/CD pipelines.
   - **Required Namespace & Structure:** All native controllers must follow the project's custom namespace format:
     ```php
     <?php

     namespace App\Controllers;

     use App\Models\TodoModel;
     ```
4. **Python / AI Service Layer (`app/python/`):** FastAPI + Uvicorn backend handling local Qwen models (`qwen2.5:0.5b`) and Model Context Protocol (MCP) servers (calculator, gmail). Configured with explicit CORS middleware (`allow_credentials=False`, strict origins).


# Sharpishly Project Context & Architectural Rules

## Core Tenets
1. **MVC Architecture & Model Abstraction Layer:** Strict separation between Views, Controllers, Models, and Services[cite: 10]. **All database interactivity and data operations must be handled exclusively via the associated Model** (acting as an abstraction layer)[cite: 10]. Controllers must never interact directly with the database, database connections, SQL, or `App\Services\Db`; all data access must be delegated to the relevant Model or to a Service that itself uses Models/data mappers[cite: 10].
2. **DRY & Modular Simplicity:** Reusable methods, thin controllers, and clean service abstractions[cite: 10]. Avoid over-engineering, code duplication, and unnecessary complexity[cite: 10]. Code must be broken down into small, single-responsibility reusable methods adhering strictly to the established MVC pattern[cite: 10].
3. **Zero Third-Party Dependencies (PHP Backend):** No third-party libraries, application frameworks, or external runtime dependencies allowed locally in PHP[cite: 10]. Native PHP 8.2+ features only[cite: 10].
   - **Strictly Prohibited:** Laravel, Symfony, Illuminate packages, or any composer dependencies in local environments[cite: 10]. Composer is restricted strictly to GitHub Actions CI/CD pipelines[cite: 10].
   - **Required Namespace & Structure:** All native controllers must follow the project's custom namespace format[cite: 10]:
     ```php
     <?php

     namespace App\Controllers;

     use App\Models\TodoModel;
     ```
4. **Python / AI Service Layer (`app/python/`):** FastAPI + Uvicorn backend handling local Qwen models (`qwen2.5:0.5b`) and Model Context Protocol (MCP) servers (calculator, gmail). Configured with explicit CORS middleware (`allow_credentials=False`, strict origins)[cite: 10].

## Directory Structure & Key Paths
- `app/php/src/index.php`: Front controller dispatching requests[cite: 10].
- `app/php/src/Controllers/`: Request handlers (`HomeController.php`, `JobController.php`, `TodoController.php`, `ApiController.php`, etc.)[cite: 10].
- `app/php/src/Models/`: Data handling and business logic layer (`BaseModel.php`, `JobModel.php`, `TodoModel.php`, etc.)[cite: 10].
- `app/php/src/Services/`: Core platform utilities (`Db.php`, `Logger.php`, `Session.php`, `Api.php`, etc.)[cite: 10].
- `app/python/`: Python backend (`api.py`, `controllers/`, `services/`, `models/`), and virtual environment (`build/mcp/.venv`)[cite: 10].
- `public/views/pages/`: Dynamic view pages (`ai.html`, `home.html`, `todo.html`, `projects.html`, `health.html`, `sample.html`, `startup.html`, `syncapply.html`, `login.html`)[cite: 10].
- `build/`: Source CSS (`build/css/`) and JavaScript modules (`build/javascript/core/`, `build/javascript/controllers/`) compiled via `./bake.sh`[cite: 10].
- `build/shells/`: Local utility scripts and AI wrappers (`bake.sh`, `qwen-cli`, `watcher.sh`, `start-mcp-client.sh`, etc.)[cite: 10].

## Development Environment & Infrastructure
- **Host Machine (`@foozie`):** `foozie@foozie-Lenovo-V145-15AST` (`192.168.0.17`) running the web frontend (`http://sharpishly2.test`)[cite: 10].
- **Remote Development Machine (`@seaview`):** `seaview@seaview-Swift-SF113-31` (`192.168.0.218`) running the Uvicorn FastAPI AI backend (`http://127.0.0.1:8000`)[cite: 10].
- **SSH Tunnel:** `ssh -N -L 8000:127.0.0.1:8000 seaview@192.168.0.218` bridging `@foozie` to `@seaview`[cite: 10].

## Code Quality & Anti-Patterns to Avoid
- **No Over-Engineering:** Keep implementations straightforward and lightweight[cite: 10]. Do not introduce complex abstraction layers or dynamic DOM generators where static views (`ai.html`) and clean controller methods suffice[cite: 10].
- **No Code Duplication:** Consolidate shared logic into reusable helper methods on controllers or core libraries[cite: 10].
- **Strict MVC Compliance:** Maintain clear separation of concerns[cite: 10]. Views must remain static templates; controllers orchestrate events and render helpers (`app.item()`, `app.el()`), never mixing domain logic or raw SQL[cite: 10].

## Directory Structure & Key Paths
- `app/php/src/index.php`: Front controller dispatching requests.
- `app/php/src/Controllers/`: Request handlers (`HomeController.php`, `JobController.php`, `TodoController.php`, `AiController.php`, etc.).
- `app/php/src/Models/`: Data handling and business logic layer (`BaseModel.php`, `JobModel.php`, `TodoModel.php`, etc.).
- `app/php/src/Services/`: Core platform utilities (`Db.php`, `Logger.php`, `Session.php`, etc.).
- `app/python/`: Python backend (`api.py`), MCP servers, and virtual environment (`build/mcp/.venv`).
- `build/`: Source CSS (`build/css/`) and JavaScript modules (`build/javascript/core/`, `build/javascript/controllers/`) compiled via `./build.sh`.
- `public/`: Web root containing compiled static assets and dynamic view pages (`public/views/pages/`).
- `build/shells/`: Local utility scripts and AI wrappers (`bake.sh`, `qwen-cli`, `watcher.sh`, `start-mcp-client.sh`, etc.).

## Development Environment & Infrastructure
- **Host Machine (`@foozie`):** `foozie@foozie-Lenovo-V145-15AST` (`192.168.0.17`) running the web frontend (`http://sharpishly2.test`).
- **Remote Development Machine (`@seaview`):** `seaview@seaview-Swift-SF113-31` (`192.168.0.218`) running the Uvicorn FastAPI AI backend (`http://127.0.0.1:8000`).
- **SSH Tunnel:** `ssh -N -L 8000:127.0.0.1:8000 seaview@192.168.0.218` bridging `@foozie` to `@seaview`.

## Code Quality & Anti-Patterns to Avoid
- **No Over-Engineering:** Keep implementations straightforward and lightweight. Do not introduce complex abstraction layers or dynamic DOM generators where static views (`ai.html`) and clean controller methods suffice.
- **No Code Duplication:** Consolidate shared logic into reusable helper methods on controllers or core libraries.
- **Strict MVC Compliance:** Maintain clear separation of concerns. Views must remain static templates; controllers orchestrate events and render helpers (`app.item()`, `app.el()`), never mixing domain logic or raw SQL.