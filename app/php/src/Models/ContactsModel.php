<?php

namespace App\Models;

use App\Services\dBug;
use App\Services\CsvToPhpConverter;

class ContactsModel extends BaseModel {

    public function csv($data,$file){

        try {
            $csv = new CsvToPhpConverter();
            $data['contacts'] = $csv->convertFile($file);
            $data = $this->prepare($data);

            $contacts = $data['prepare'] ?? [];
            new dBug($contacts);

            foreach ($contacts as $contact) {
                $email = $contact['email'] ?? '';
                if (!empty($email)) {
                    new dBug($email);
                    //$this->create($email);
                }
            }
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            error_log($e->getMessage());
        }
        
        return $data;

    }

    public function prepare(array $data): array
    {
        $rs = $data['contacts'] ?? [];
        new dBug($rs);
        
        foreach ($rs as $v) {
            $e = $v['Contact Email / Portal'] ?? '';
            if (!empty($e)) {
                new dBug($e);
                $data[__FUNCTION__][]['email'] = $e;
            }
        }
        
        return $data;
    }

    public function create(string $recipient = ""): void
    {
        $timestamp = date('Y_m_d_H_i_s');
        $path = "storage/email/send/email_{$timestamp}.json";
        $email = json_encode($this->msg($recipient), JSON_PRETTY_PRINT);
        $file = $this->location->baseDir() . $path;
        
        new dBug($file);
        file_put_contents($file, $email);
    }

    public function msg(string $recipient = 'paultypekoce@gmail.com'): array
    {
        return [
            'tool' => 'gmail',
            'args' => [
                'action' => 'send',
                'recipient' => $recipient,
                'subject' => 'Welcome to Sharpishly',
                'message' => 'Test message sent from MCP CLIENT',
            ]
        ];
    }
    

}