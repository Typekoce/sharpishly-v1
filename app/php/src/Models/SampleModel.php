<?php

declare(strict_types=1);

namespace App\Models;

use Throwable;

class SampleModel extends BaseModel
{
    public string $tbl = 'sample';

    public function readData(string $id = ''): array
    {
        try {
            $conditions = [
                'tbl'   => $this->tbl,
                'order' => ['id' => 'DESC']
            ];

            if (!empty($id)) {
                $conditions['where'] = ['id' => $id];
            }

            return $this->db->find($conditions);
        } catch (Throwable $e) {
            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }
    }
}
