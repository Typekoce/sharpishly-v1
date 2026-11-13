<?php

namespace App\Controllers;
use App\Services\dBug;
use App\Services\CsvToPhpConverter;

class ContactsController extends BaseController {

public function index(): void
    {
        $file = $this->location->storage('contacts/funding.csv');
        $contacts = [];

        if (!file_exists($file)) {
            return;
        }

        try {
            $csv = new CsvToPhpConverter();
            $contacts = $csv->convertFile($file);

            new dBug($contacts);
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            error_log($e->getMessage());
        }
    }

    public function create($recipient = ""){
        $timestamp = date('Y_m_d_H_i_s');
        $path = "storage/email/send/email_{$timestamp}.json";
        $email = json_encode($this->msg($recipient), JSON_PRETTY_PRINT);
        $file = $this->location->baseDir() . $path;
        new dBug($file);
        file_put_contents($file, $email);
    }

    public function send(){
        // test array
        $contacts = array(
            array('email' => 'pa_mcintosh@hotmail.com'),
            array('email' => 'paultypekoce@gmail.com'),
            array('email' => 'paul@sharpishly.com')
        );

        new dBug($contacts);

        foreach($contacts as $contact){

            new dBug($email = $contact['email']);

            $this->create($email);
        }
    }

    public function msg($recipient = 'paultypekoce@gmail.com'){

        $msg = [
            'tool' => 'gmail',
            'args' => [
                'action' => 'send',
                'recipient' => $recipient,
                'subject' => 'Welcome to Sharpishly',
                'message' => 'Test message sent from MCP CLIENT',
            ]
        ];

        return $msg;
    
    }
}