<?php

namespace App\Services;

class Smarty extends BaseService {

    public function smarty($txt,$fields){

        foreach($fields as $k => $v){
            $txt = str_replace("[[[" . $k . "]]]",$v,$txt);
        }

        return $txt;
    }

}