# Sharpishly Project Context & Architectural Rules

## Core Tenets
1. **MVC Architecture & Model Abstraction Layer:** Strict separation between Views, Controllers, Models, and Services. **All database interactivity and data operations must be handled exclusively via the associated Model** (acting as an abstraction layer). Controllers must never interact directly with the database, database connections, SQL, or `App\Services\Db`; all data access must be delegated to the relevant Model or to a Service that itself uses Models/data mappers.
2. **DRY (Don't Repeat Yourself):** Reusable components, thin controllers, and clean service abstractions.
3. **Zero Third-Party Dependencies:** No third-party libraries, application frameworks, or external runtime dependencies allowed locally. Native PHP 8.2+ features only.
   - **Strictly Prohibited:** Laravel, Symfony, Illuminate packages, or any composer dependencies in local environments. Composer is restricted strictly to GitHub Actions CI/CD pipelines.
   - **Required Namespace & Structure:** All native controllers must follow the project's custom namespace format:
     ```php
     <?php

     namespace App\Controllers;

     use App\Models\TodoModel;
     ```

## Directory Structure & Key Paths
- `app/php/src/index.php`: Front controller dispatching requests.
- `app/php/src/Controllers/`: Request handlers (`HomeController.php`, `JobController.php`, `TodoController.php`, etc.).
- `app/php/src/Models/`: Data handling and business logic layer (`BaseModel.php`, `JobModel.php`, `TodoModel.php`, etc.).
- `app/php/src/Services/`: Core platform utilities (`Db.php`, `Logger.php`, `Session.php`, etc.).
- `build/`: Source CSS (`build/css/`) and JavaScript modules (`build/javascript/core/`, `build/javascript/controllers/`) compiled via `./build.sh`.
- `public/`: Web root containing compiled static assets and dynamic view pages (`public/views/pages/`).
- `build/shells/`: Local utility scripts and AI wrappers (`bake.sh`, `qwen-cli`, `watcher.sh`, etc.).