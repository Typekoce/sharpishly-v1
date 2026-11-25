<?php

namespace App\Models;

use App\Services\dBug;

class TodoModel extends BaseModel {

    public function readTodo(){

        try {
            $conditions = [
                'tbl'   => 'todo',
                'order' => ['id' => 'DESC'],
                // 'limit' => 10
            ];

            $records = $this->db->find($conditions);

            $records = $this->setUrl($records);

            return $records;
            
        } catch (Throwable $e) {

            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }

    }

    public function createTodo($save){

        try {
            return $this->db->save('todo',$save);
            
        } catch (Throwable $e) {

            return [
                'error'   => true,
                'message' => $e->getMessage()
            ];
        }

    }

    public function setUrl($records){

        $rs;

        foreach($records as $record){

                $string = $record['description'];

                $record['link'] = '';

                if (preg_match('/https?/', $string)) {
                    $arr = explode('/',$string);
                    $record['link'] = $arr[5] . "/" . $arr[6];
                }

                $rs[] = $record;

        }

        return $rs;

    }

}