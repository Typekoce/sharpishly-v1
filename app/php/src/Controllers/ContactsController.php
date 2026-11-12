<?php

namespace App\Controllers;
use App\Services\dBug;

class ContactsController extends BaseController {

    public function index(){
        // new dBug($this->location);
        // $this->msg();
        $file = $this->location->storage('contacts/funding.csv');
         if(file_exists($file)){
            echo file_get_contents($file);
         }
    }

    public function create(){
        $timestamp = date('Y_m_d_H_i_s');
        $path = "storage/email/send/email_{$timestamp}.json";
        $email = json_encode($this->msg(), JSON_PRETTY_PRINT);
        $file = $this->location->baseDir() . $path;
        new dBug($file);
        file_put_contents($file, $email);
    }

    public function msg(){

        $msg = [
            'tool' => 'gmail',
            'args' => [
                'action' => 'send',
                'recipient' => 'paultypekoce@gmail.com',
                'subject' => 'Welcome to Sharpishly',
                'message' => 'Test message sent from MCP CLIENT',
            ]
        ];

        // new dBug($msg);

        return $msg;
    
    }
}