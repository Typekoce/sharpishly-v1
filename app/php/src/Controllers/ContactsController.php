<?php

namespace App\Controllers;

use App\Services\dBug;
use App\Models\ContactsModel;

class ContactsController extends BaseController 
{
    public function index($id = ''): void
    {

        $data = [
            'id'    => $id,
            'function'  => __FUNCTION__,
            'model'     => __CLASS__,
            'email' => [
                'subject'   => 'Hello World',
                'message'   => 'Funding application',
                'schedule'  => []
            ]
        ];

        $file = $this->location->storage('contacts/funding.csv');

        if (!file_exists($file)) {
            return;
        }

        $m = new ContactsModel();

        $data = $m->csv($data,$file);

    }

}