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

                $title = $this->word_count($record['title'], 5);

                if (preg_match('/https?/', $string)) {
                    $arr = explode('/',$string);
                    $record['link'] = $title . ": " . $arr[5] . "/" . $arr[6];
                }

                $rs[] = $record;

        }

        return $rs;

    }

    public function word_count(string $text, int $limit): string
    {
        if ($limit <= 0) {
            return '';
        }

        $clean = trim((string) preg_replace('/\s+/u', ' ', $text));
        if ($clean === '') {
            return '';
        }

        $words = explode(' ', $clean);
        if (count($words) <= $limit) {
            return $clean;
        }

        return implode(' ', array_slice($words, 0, $limit));
    }

}