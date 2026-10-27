<?php

namespace App\Controllers;

use App\Models\JobModel;

class JobController extends BaseController {

    public function index($id = ''){

        $this->json([
            'id'    => $id,
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);
    }

    public function create(){

        $jobs = 'home sync health todo projects indeed linkedin youtube tiktok instagram facebook monster claude gemini grok chatgtp';

        $this->json(['jobs' => $jobs]);

    }

    public function read(){

        $model = new JobModel();

        $job = $model->read();

        $this->json([
            'job'    => $job,
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);

    }
}