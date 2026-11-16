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

class TodoController extends BaseController {

    public function index(){

        $this->json([
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);
    }

    public function create(): void
    {
        $data = $this->getPost();

        $title = trim((string) ($data['title'] ?? ''));
        $description = trim((string) ($data['description'] ?? ''));

        if ($title === '') {
            $this->json([
                'success' => false,
                'error'   => 'Title is required.'
            ], 422);
        }

        if (mb_strlen($title) > 255) {
            $this->json([
                'success' => false,
                'error'   => 'Title must be 255 characters or fewer.'
            ], 422);
        }

        $model = new TodoModel();

        try {
            $save = [
                'title' => $title,
                'description' => $description,
                'source_id' =>  1
            ];

            //$this->json($save);
            $record = $model->createTodo($save);

            $this->json([
                'success' => true,
                'record'  => $record
            ]);
        } catch (\Throwable $e) {
            $this->logger->error($e->getMessage());

            $this->json([
                'success' => false,
                'error'   => 'Unable to create record.'
            ], 500);
        }
    }

    public function read(): void
    {
        $m = new TodoModel;
        $r = $m->readTodo();

        $this->json([
            'class'   => __CLASS__,
            'method'  => __FUNCTION__,
            'file'    => __FILE__,
            'records' => $r
        ]);
    }

    public function update(){

        $this->json([
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);
    }

    public function delete(){

        $this->json([
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);
    }
}

<?php

namespace App\Models;

class TodoModel extends BaseModel {

    public function readTodo(){

        try {
            $conditions = [
                'tbl'   => 'todo',
                'order' => ['id' => 'DESC'],
                'limit' => 10
            ];

            return $this->db->find($conditions);
            
        } catch (Throwable $e) {

            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }

    }

    public function createTodo($save){

        try {
            return $this->db->save('todo',$save);
            
        } catch (Throwable $e) {

            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }

    }

}

<?php

namespace App\Controllers;

use App\Services\Session;
use App\Services\Logger;
use App\Services\Db;
use App\Services\Location;

class BaseController {

    public Session $session;
    public Logger $logger;
    public Db $db;
    public Location $location;

    public function __construct(){
        $this->session = Session::getInstance();
        $this->logger  = new Logger();
        $this->db      = new Db(get_env(), $this->logger);
        $this->location = new Location();
    }
    
    protected function json(array $data, int $code = 200): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code($code);
        }
        echo json_encode(
            $data,
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
        exit;
    }

    public function getPost(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input');
            $data = json_decode($raw ?: '', true);

            return is_array($data) ? $data : [];
        }

        return $_POST ?? [];
    }

}

<?php

namespace App\Models;

use App\Services\Db;
use App\Services\Logger;

class BaseModel {

    public $db;
    public $logger;


    public function __construct(){

        if (!$this->db) {
            $this->db = new Db(get_env(), $this->logger);
        } 
    }

    public function root(){

        return dirname(__DIR__, 3);

    }

    public function storage($dir){

        return $this->root() . '/php/src/cmd/storage/' . $dir;

    }

    public function readJob($folder='jobs',$file='todo'){

        $storagePath = $this->storage($folder);

        $file = $storagePath . "/" . $file .".json";

        if(file_exists($file)){

            $job = file_get_contents($file);

            $job = json_decode($job,TRUE);

            $job['action'] = FALSE;

        } else {

            $job = array('error' => 'File does not exist:' . $file);

        }

        return $job;
    }

}


<?php
declare(strict_types=1);

namespace App\Services;

use App\Services\Location;
use RuntimeException;

abstract class BaseService 
{
    public string $uploadPath;
    public Location $location;
    protected string $aiEndpoint;
    protected string $logFile;

    public function __construct() 
    {
        $this->location = new Location();
        $this->uploadPath = $this->location->storage('uploads');
        $this->logFile = $this->location->logs('app.log');
        $this->aiEndpoint = getenv('AI_ENDPOINT') ?: 'http://ai:8000';
        
        $this->ensureDirectoryExists($this->uploadPath);
        $this->ensureDirectoryExists(dirname($this->logFile));
    }

    protected function postJson(string $url, array $data): array 
    {
        $payload = json_encode($data);
        $ch = curl_init($url);
        
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => "POST",
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($payload)
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            $this->log("CURL Error during Handshake: $error", 'ERROR');
        }

        return [
            'code' => $httpCode,
            'body' => $response
        ];
    }

    private function ensureDirectoryExists(string $path): void 
    {
        if (!is_dir($path)) {
            if (!mkdir($path, 0775, true) && !is_dir($path)) {
                throw new RuntimeException("BaseService: Failed to create directory: $path");
            }
        }
    }

    protected function log(string $message, string $level = 'INFO', array $context = []): void 
    {
        $date = date('Y-m-d H:i:s');
        $jsonContext = !empty($context) ? ' ' . json_encode($context) : '';
        $formatted = "[$date] [$level] $message$jsonContext" . PHP_EOL;
        file_put_contents($this->logFile, $formatted, FILE_APPEND);
    }

    /**
     * Standard cURL execution for service integrations.
     */
    protected function curlRequest(string $url, string $method, array $headers = [], array $data = []): ?array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_TIMEOUT        => 15,
        ]);

        if (!empty($data) && in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }

        $raw   = curl_exec($ch);
        $errno = curl_errno($ch);
        curl_close($ch);

        if ($errno !== 0 || $raw === false) {
            return null;
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : ['raw' => $raw];
    }
}


     ```
4. **Python / AI Service Layer (`app/python/`):** FastAPI + Uvicorn backend handling local Qwen models (`qwen2.5:0.5b`) and Model Context Protocol (MCP) servers (calculator, gmail). Configured with explicit CORS middleware (`allow_credentials=False`, strict origins).

