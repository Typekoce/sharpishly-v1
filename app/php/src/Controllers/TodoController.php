<?php

namespace App\Controllers;

use App\Models\TodoModel;

class TodoController extends BaseController {

    public function index(){

        $this->json([
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);
    }

    public function create(): void
    {
        $data = $this->getPost();

        $title = trim((string) ($data['title'] ?? ''));
        $description = trim((string) ($data['description'] ?? ''));

        if ($title === '') {
            $this->json([
                'success' => false,
                'error'   => 'Title is required.'
            ], 422);
        }

        if (mb_strlen($title) > 255) {
            $this->json([
                'success' => false,
                'error'   => 'Title must be 255 characters or fewer.'
            ], 422);
        }

        $model = new TodoModel();

        try {
            $save = [
                'title' => $title,
                'description' => $description,
                'source_id' =>  1
            ];

            //$this->json($save);
            $record = $model->createTodo($save);

            $this->json([
                'success' => true,
                'record'  => $record
            ]);
        } catch (\Throwable $e) {
            $this->logger->error($e->getMessage());

            $this->json([
                'success' => false,
                'error'   => 'Unable to create record.'
            ], 500);
        }
    }

    public function read(): void
    {
        $m = new TodoModel;
        $r = $m->readTodo();

        $this->json([
            'class'   => __CLASS__,
            'method'  => __FUNCTION__,
            'file'    => __FILE__,
            'records' => $r
        ]);
    }

    public function update(){

        $this->json([
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);
    }

    public function delete(){

        $this->json([
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);
    }
}