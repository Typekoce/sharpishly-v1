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