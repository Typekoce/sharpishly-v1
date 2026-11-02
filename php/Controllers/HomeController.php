<?php
declare(strict_types=1);

class HomeController {
    public function index(): void {
        echo json_encode([
            'status' => 'success',
            'message' => 'Welcome to Sharpishly R&D API',
            'controller' => 'HomeController',
            'action' => 'index'
        ]);
    }
}
