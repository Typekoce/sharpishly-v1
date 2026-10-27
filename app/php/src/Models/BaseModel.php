<?php

namespace App\Models;

class BaseModel {

    public function root(){

        return dirname(__DIR__, 3);

    }

    public function storage($dir){

        return $this->root() . '/php/src/cmd/storage/' . $dir;

    }

    public function read($folder='jobs',$file='todo'){

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