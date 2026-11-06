<?php

namespace App\Controllers;

use App\Models\ApiModel;
use Throwable;

class ApiController extends BaseController
{
    public function index(string $id = ''): void
    {
        $conditions = [
            'service'  => 'github',
            'endpoint' => 'repos/sharpishly/sharpishly',
            'method'   => 'GET',
        ];

        try {
            $model = new ApiModel();
            $result = $model->find($conditions);
        } catch (Throwable $e) {
            error_log((string) $e);
            http_response_code(500);

            $this->json([
                'id'    => $id,
                'error' => 'Unable to complete the API request.',
            ]);

            return;
        }

        $this->json([
            'id'     => $id,
            'result' => $result,
        ]);
    }
}