<?php

namespace App\Controllers;

class DeviceController extends BaseController {

    private function executeCommand(string $command): string {
        if (!function_exists('shell_exec')) {
            return '';
        }
        return shell_exec($command) ?? '';
    }

    private function parseAdbDevices(): array {
        $output = $this->executeCommand('adb devices 2>&1');
        $devices = [];
        
        $lines = array_filter(explode("\n", trim($output)));
        array_shift($lines); // Remove header ("List of devices attached")

        foreach ($lines as $line) {
            $parts = preg_split('/\s+/', trim($line));
            if (isset($parts[0], $parts[1]) && $parts[1] === 'device') {
                $devices[] = [
                    'platform'  => 'Android',
                    'device_id' => $parts[0],
                    'status'    => $parts[1]
                ];
            }
        }
        return $devices;
    }

    private function parseIosDevices(): array {
        $output = $this->executeCommand('idevice_id -l 2>&1');
        $devices = [];

        foreach (array_filter(explode("\n", trim($output))) as $udid) {
            $devices[] = [
                'platform'  => 'iOS',
                'device_id' => trim($udid),
                'status'    => 'connected'
            ];
        }
        return $devices;
    }

    public function index(): void {
        $devices = array_merge($this->parseAdbDevices(), $this->parseIosDevices());

        $this->json([
            'count'   => count($devices),
            'devices' => $devices
        ]);
    }
}