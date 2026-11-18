<?php

namespace App\Models;

use App\Services\dBug;
use App\Services\CsvToPhpConverter;

class ContactsModel extends BaseModel {

    public function main($data){

        $data = $this->template($data);

        $data = $this->csv($data);

        new dBug($data);
        
        return $data;

    }

    public function template($data){
        
        if(file_exists($file = $data['message'])){
            $data[__FUNCTION__] = file_get_contents($file);

        };
        return $data;
    }



    public function mailMerge($data){

        $fields = array(
            'Name'          => 'Bruce Wanye',
            'Your name'     => 'Mr Paul Anthony McIntosh MA BA Hons',
            'Company Name'  => 'Sharpishly LTD',
            'Phone'         => '07900191233',
            'Website'       => 'https://www.sharpishly.com',
            'LinkedIn'      => 'Sharpishly'
        );

        $txt = $data['template'];

        $data['email']['recipient'] = $data['prepare'][0]['email'];

        $data['email']['message'] = $this->smarty->smarty($txt,$fields);
        return $data;
    }

    public function csv($data){

        try {
            $csv = new CsvToPhpConverter();

            $data['contacts'] = $csv->convertFile($data['contacts']);

            $data = $this->mailMerge($data);

            $data = $this->prepare($data);

            $contacts = $data['prepare'] ?? [];

            foreach ($contacts as $contact) {

                // $email = $contact['email'] ?? '';

                $email = 'paultypekoce@gmail.com';

                if (!empty($email)) {
                    // new dBug($email);
                    $this->create($email);
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

        foreach ($rs as $v) {
            $e = $v['Contact Email / Portal'] ?? '';
            // new dBug($data['email']['message']);die();
            if (!empty($e)) {
                $arr = [
                    'email' => $e,
                    'msg'   => $data['email']['message']
                ];
                $data[__FUNCTION__][] = $arr;
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