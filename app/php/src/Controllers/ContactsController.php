<?php

namespace App\Controllers;
use App\Services\dBug;

class ContactsController extends BaseController {
    public function index(){
        // new dBug($this->location);
        $file = $this->location->storage('contacts/funding.csv');
         if(file_exists($file)){
            echo file_get_contents($file);
         }
    }
}