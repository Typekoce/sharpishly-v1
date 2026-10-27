<?php

function request($url){
    echo file_get_contents($url);
}

$id = $argv[1] ?? null;

if ($id === null) {
    fwrite(STDERR, "Error: Missing worker ID argument.\n");
    exit(1);
}

$url = 'http://sharpishly2.test/php/job/index/' . $id;

request($url);