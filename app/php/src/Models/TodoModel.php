<?php

namespace App\Models;

class TodoModel extends BaseModel {

    public function readTodo(){

        try {
            $conditions = [
                'tbl'   => 'todo',
                'order' => ['id' => 'DESC'],
                'limit' => 10
            ];

            return $this->db->find($conditions);
            
        } catch (Throwable $e) {

            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }

    }

}