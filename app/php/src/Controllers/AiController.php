<?php

namespace App\Controllers;

use App\Models\AiModel;

class AiController extends BaseController {

    public string $tbl = 'messages';

    public function reply ($id = '1'){

        $m = new AiModel();

        $conditions = [
                'tbl'   => $this->tbl,
                'where' => ['id'    => $id],
                'order' => ['id' => 'DESC']
            ];

        $r = $m->read($conditions);

        $this->json(
            [
                'records' => $r,
            ]
        );

    }

}