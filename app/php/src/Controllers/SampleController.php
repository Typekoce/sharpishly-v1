<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\SampleModel;

class SampleController extends BaseController 
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
        $model = new SampleModel();
        $records = $model->readData($id);

        $this->json([
            'status'  => 'success',
            'records' => $records
        ]);
    }
}
