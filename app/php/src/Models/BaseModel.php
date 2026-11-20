<?php

namespace App\Models;

use App\Services\Db;
use App\Services\Logger;
use App\Services\Smarty;
use App\Services\Location;

class BaseModel {

    public $db;
    public $logger;
    public $smarty;
    public $location;

    public function __construct(){

        if (!$this->db) {
            $this->db = new Db(get_env(), $this->logger);
        }
        $this->smarty = new Smarty();
        $this->location = new Location(); 
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

    public function template($data){
        
        if(file_exists($file = $data['message'])){
            $data[__FUNCTION__] = file_get_contents($file);

        };
        return $data;
    }

    public function create(){

        try {
            $conditions = [
                'tbl'   => $this->tbl,
                'order' => ['id' => 'DESC']
            ];

            if (!empty($id)) {
                $conditions['where'] = ['id' => $id];
            }

            return $this->db->find($conditions);
        } catch (Throwable $e) {
            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }

    }

    public function read($conditions){

        try {

            if (!empty($id)) {
                $conditions['where'] = ['id' => $id];
            }

            return $this->db->find($conditions);
        } catch (Throwable $e) {
            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }    

    }

    public function update($tbl,$conditions){

        try {
            return $this->db->save($tbl,$conditions);
        } catch (Throwable $e) {
            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }    

    }

    public function delete(){

        try {
            $conditions = [
                'tbl'   => $this->tbl,
                'order' => ['id' => 'DESC']
            ];

            if (!empty($id)) {
                $conditions['where'] = ['id' => $id];
            }

            return $this->db->find($conditions);
        } catch (Throwable $e) {
            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }    

    }

}