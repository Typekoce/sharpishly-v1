<?php

namespace App\Controllers;

use App\Services\Session;
use App\Services\Logger;
use App\Services\Db;
use App\Services\Location;
use App\Services\dBug;

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

    public function view($path,$data){
        
        $file = $this->location->baseDir() . 'app/php/src/views/' . $path . '.html';


        if(file_exists($file)){

            $page =  file_get_contents($file);

            $page = $this->css($path,$page);

            echo $page;

        } else {
            echo "Opps... page does not exist";
        }
    }

    public function css($path,$page){

        $file = $this->location->baseDir() . 'app/php/src/views/' . $path . '.css';

        if(file_exists($file)){

            $c = file_get_contents($file);
            $page = str_replace('<style></style>','<style>' . $c . '</style>',$page);

        } else {
            //echo "Opps... page does not exist";
        }

        return $page;
    }

}