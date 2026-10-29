# Sharpishly Project Context & Architectural Rules

## Core Tenets
1. **MVC Architecture & Model Abstraction Layer:** Strict separation between Views, Controllers, Models, and Services. **All database interactivity and data operations must be handled exclusively via the associated Model** (acting as an abstraction layer). Controllers must never interact directly with the database, database connections, SQL, or `App\Services\Db`; all data access must be delegated to the relevant Model or to a Service that itself uses Models/data mappers.
2. **DRY (Don't Repeat Yourself):** Reusable components, thin controllers, and clean service abstractions.
3. **Minimal-Dependency Native PHP:** No application frameworks or heavy third-party runtime dependencies. Native PHP 8.2+ features only; Composer is permitted only in GitHub Actions CI/CD.
   - **Strictly Prohibited:** Laravel or any external framework packages (e.g., do **not** use `namespace App\Http\Controllers;` or `use Illuminate\...`). 
   - **Required Namespace & Structure:** All native controllers must follow the project's custom namespace format:
     ```php
     <?php

     namespace App\Controllers;

     use App\Models\TodoModel;

     // Additional classes will be found in the Services folder
     ```
4. **No Raw SQL in Controllers:** Database queries must be encapsulated within Model classes (extending `BaseModel`), data mappers, or the Db service (`app/php/src/Services/Db.php`).
5. **No Composer Locally:** Composer is used exclusively via GitHub Actions CI/CD pipelines.

## Directory Structure & Key Paths
- `app/php/src/index.php`: Front controller dispatching requests.
- `app/php/src/Controllers/`: Request handlers (`HomeController.php`, `JobController.php`, `TodoController.php`, etc.).
- `app/php/src/Models/`: Data handling and business logic layer (`BaseModel.php`, `JobModel.php`, `TodoModel.php`, etc.).
- `app/php/src/Services/`: Core platform utilities (`Db.php`, `Api.php`, `Logger.php`, `Session.php`, etc.).
- `public/`: Web root containing compiled static assets (`global.css`, `script.js`) and dynamic view pages (`views/pages/`).
- `build/`: Source CSS (`build/css/`) and JavaScript modules (`build/javascript/core/`, `build/javascript/controllers/`) compiled via `./build.sh`.
- `build/shells/`: Local utility scripts and AI wrappers (`qwen-cli`, `watcher.sh`, etc.).

## Hard Constraints for Generated PHP

- Never generate `namespace App\Http\...`.
- Never generate `use Illuminate\...`.
- Never generate `use App\Services\DbService;`.
- Never generate ` protected $dbService = new DbService();`.
- Never generate ` $sampleData = $this->dbService->fetchSampleData();`.
- Never generate ` return view('sample', ['data' => $sampleData]);`.
- Never suggest Laravel, Symfony, Laminas, or other PHP frameworks.
- Controllers must use `namespace App\Controllers;`.
- Models must use `namespace App\Models;`.
- Services must use `namespace App\Services;`.
- Database access and queries belong strictly in Models (extending `BaseModel`), data mappers, or `App\Services\Db`. Controllers must never touch the database directly; the Model acts as the complete data abstraction layer.
- Controllers must remain thin and delegate business logic and data retrieval to Models or Services.
- Do not add Composer dependencies locally; CI-only Composer usage is allowed.