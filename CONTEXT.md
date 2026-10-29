# Sharpishly Project Context & Architectural Rules

## Core Tenets
1. **MVC Architecture:** Strict separation between Views, Controllers, Models, and Services.
2. **DRY (Don't Repeat Yourself):** Reusable components, thin controllers, and clean service abstractions.
3. **Zero-Dependency Native PHP:** No heavy third-party packages or heavy frameworks. Native PHP 8.2+ features only.
4. **No Raw SQL in Controllers:** Database queries must be encapsulated within Model classes, data mappers, or the Db service (`app/php/src/Services/Db.php`).
5. **No Composer Locally:** Composer is used exclusively via GitHub Actions CI/CD pipelines.

## Directory Structure & Key Paths
- `app/php/src/index.php`: Front controller dispatching requests.
- `app/php/src/Controllers/`: Request handlers (`HomeController.php`, `JobController.php`, `TodoController.php`, etc.).
- `app/php/src/Models/`: Data handling and business logic layer (`BaseModel.php`, `JobModel.php`, `TodoModel.php`, etc.).
- `app/php/src/Services/`: Core platform utilities (`Db.php`, `Api.php`, `Logger.php`, `Session.php`, etc.).
- `public/`: Web root containing compiled static assets (`global.css`, `script.js`) and dynamic view pages (`views/pages/`).
- `build/`: Source CSS (`build/css/`) and JavaScript modules (`build/javascript/core/`, `build/javascript/controllers/`) compiled via `./build.sh`.
- `build/shells/`: Local utility scripts and AI wrappers (`qwen-cli`, `watcher.sh`, etc.).
