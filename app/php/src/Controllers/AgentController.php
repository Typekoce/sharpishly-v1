<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\AgentModel;

class AgentController extends BaseController 
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
        $model = new AgentModel();
        $records = $model->readData($id);

        $this->json([
            'status'  => 'success',
            'records' => $records
        ]);
    }
}
