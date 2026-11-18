<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\RagModel;
use App\Services\dBug;

class RagController extends BaseController 
{
    public function index(): void
    {
        $this->json([
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);
    }

    public function read(string $id = ''): void
    {
        $model = new RagModel();
        $records = $model->readData($id);

        $this->json([
            'status'  => 'success',
            'records' => $records
        ]);
    }

    public function clean(){

        $message = $this->location->storage('rag/raw/job_01.html');

        $data = [
            'id'    => $id,
            'function'  => __FUNCTION__,
            'model'     => __CLASS__,
            'message'   => $message,
        ];

        $model = new RagModel();

        $data = $model->main($data);

        new dBug($data);

    }
}
