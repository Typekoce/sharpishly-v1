<?php

namespace App\Models;

class BaseModel {

    public function root(){

        return dirname(__DIR__, 3);

    }

    public function storage($dir){

        return $this->root() . '/php/src/cmd/storage/' . $dir;

    }

}