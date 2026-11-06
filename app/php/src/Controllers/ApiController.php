<?php

namespace App\Controllers;

use App\Models\ApiModel;

class ApiController extends BaseController {

	public function index(){

        $model = 

        $this->json([
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);

    }
}