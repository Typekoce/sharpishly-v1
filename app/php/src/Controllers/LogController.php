<?php

namespace App\Controllers;

class LogController extends BaseController {
    /**
     * Define readable log sources, system logs, and configuration files.
     */
    public array $log = [
        //'app_debug'         => dirname(__DIR__, 2) . '/storage/logs/app.log',
        //'app_error'         => dirname(__DIR__, 2) . '/storage/logs/error.log',
        'python_mcp_server' => '/var/log/sharpishly/python_mcp.log',
        'python_uvicorn'    => '/var/log/sharpishly/uvicorn.log',
    ];

    private array $configSources = [
        'php_ini'       => '/etc/php/8.2/fpm/php.ini',
        'nginx_site'    => '/etc/nginx/sites-available/default',
        'himalaya'      => '~/.config/himalaya/config.toml',
        'gpg_agent'     => '~/.gnupg/gpg-agent.conf',
    ];

    /**
     * Primary HTTP endpoint action returning JSON log payload or preformatted output.
     * GET /logs
     */
    public function index(): void
    {
        echo "<pre>";

        foreach ($this->log as $key => $path) {
            print_r([
                'title' => $key,
                'path'  => $path
            ]);

            echo "-----------\n";

            // Resolve paths and check readability/existence to prevent null/false returns
            if (file_exists($path) && is_readable($path)) {
                $content = file_get_contents($path);
                echo $content !== false ? $content : "[Error: Failed to read log contents]\n";
            } else {
                echo "[Log file not found or not readable by current user permissions]\n";
            }

            echo "\n\n";
        }

        echo "</pre>";
    }
}