<?php

namespace App\Controllers;

class ThemeController extends BaseController {

    public function index($id = ''){

        $data = [];

        $this->view('cms/index',$data);

    }
}