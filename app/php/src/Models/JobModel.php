<?php

namespace App\Models;

class JobModel extends BaseModel {

    public function read(){

        $storagePath = $this->storage('jobs');

        $file = $storagePath . "/todo.json";

        if(file_exists($file)){

            $job = file_get_contents($file);

            $job = json_decode($job,TRUE);

            $job['action'] = FALSE;

        } else {

            $job = array('error' => 'File does not exist:' . $file);

        }

        return $job;
    }

    //public function scrape(){}

}