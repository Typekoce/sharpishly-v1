<?php
/**
 * Sharpishly Front Controller (Zero-Dependency MVC)
 */
declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments = explode('/', trim($uri, '/'));

$controllerName = !empty($segments[1]) ? ucfirst($segments[1]) . 'Controller' : 'HomeController';
$actionName = !empty($segments[2]) ? $segments[2] : 'index';

$controllerPath = __DIR__ . '/../php/Controllers/' . $controllerName . '.php';

header('Content-Type: application/json');

if (file_exists($controllerPath)) {
    require_once $controllerPath;
    if (class_exists($controllerName)) {
        $controller = new $controllerName();
        if (method_exists($controller, $actionName)) {
            $controller->$actionName();
            exit;
        }
    }
}

http_response_code(404);
echo json_encode(['error' => 'Route not found', 'route' => $uri]);
