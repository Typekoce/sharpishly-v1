<?php

namespace App\Controllers;

use App\Services\Session;
use App\Services\Logger;
use App\Services\Db;

class BaseController {

    public $session;
    public $logger;

    
    public function __construct(){
        $this->session     = Session::getInstance();
        $this->logger      = new Logger();
        if (!$this->db) {
            $this->db = new Db(get_env(), $this->logger);
        } 
    }
    
    /**
     * Standardized JSON Response Handler
     */
    protected function json(array $data, int $code = 200): void
    {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code($code);
        }
        echo json_encode($data);
        exit;
    }
}