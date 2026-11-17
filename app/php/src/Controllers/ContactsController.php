<?php

namespace App\Controllers;

use App\Services\dBug;
use App\Models\ContactsModel;

class ContactsController extends BaseController 
{
    public function index($id = ''): void
    {

        $message = $this->location->storage('contacts/messages/funding_message.txt');

        $contacts = $this->location->storage('contacts/funding.csv');

        $data = [
            'id'    => $id,
            'function'  => __FUNCTION__,
            'model'     => __CLASS__,
            'message'   => $message,
            'contacts'  => $contacts,
            'email' => [
                'subject'   => 'Hello World',
                'message'   => 'Funding application',
                'recipient' => '',
                'schedule'  => []
            ]
        ];

        $m = new ContactsModel();

        $data = $m->main($data);

    }

}