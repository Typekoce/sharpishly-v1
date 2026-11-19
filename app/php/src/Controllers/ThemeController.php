<?php

namespace App\Controllers;

class ThemeController extends BaseController {

    public function index($path = 'cms'){

        $data = [];

        $this->view($path . '/index',$data);

    }
}