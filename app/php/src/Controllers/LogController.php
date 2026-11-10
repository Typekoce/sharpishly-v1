<?php

namespace App\Controllers;

class LogController extends BaseController {
    /**
     * Define readable log sources, system logs, and configuration files.
     */

    public $log = [
            'nginx_access' => '/var/log/nginx/access.log',
            'nginx_error'  => '/var/log/nginx/error.log',
            'php_fpm_error' => '/var/log/php8.2-fpm.log',
            'php_app_error' => '/var/log/php/error.log',
            'mysql_error' => '/var/log/mysql/error.log',
            'python_mcp_server' => '/var/log/sharpishly/python_mcp.log',
            'python_uvicorn'    => '/var/log/sharpishly/uvicorn.log',
            'javascript' => '/var/log/sharpishly/js_errors.log',
            'cmd_jobs'   => '/var/log/sharpishly/cmd_jobs.log',
    ];

    private array $configSources = [
        'php_ini'       => '/etc/php/8.2/fpm/php.ini',
        'nginx_site'    => '/etc/nginx/sites-available/default',
        'himalaya'      => '~/.config/himalaya/config.toml',
        'gpg_agent'     => '~/.gnupg/gpg-agent.conf',
    ];

    /**
     * Primary HTTP endpoint action returning JSON log payload.
     * GET /logs
     */
    public function index(): void
    {

        echo "<pre>";

        $out = "";

        foreach ($this->log as $key => $value) {

            print_r(array('title'=>$key,'log'=>$value));

            $out .= "-----------\n";

            $out .=  file_get_contents($value);
            
        }

        echo $out;

    }

}
