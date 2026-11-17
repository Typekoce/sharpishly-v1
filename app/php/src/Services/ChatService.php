<?php

declare(strict_types=1);

namespace App\Services;

class ChatService
{
    private string $pythonUrl = 'http://sharpishly2.test/py/mcp/chat';

    public function callPython(array $payload): array
    {
        $ch = curl_init($this->pythonUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return [
                'status' => 'error',
                'error'  => [
                    'code'    => 'PYTHON_CONNECTION_ERROR',
                    'message' => "Python API connection error: {$error}"
                ]
            ];
        }

        $decoded = json_decode((string) $response, true);

        if (!is_array($decoded)) {
            return [
                'status' => 'error',
                'error'  => [
                    'code'    => 'INVALID_PYTHON_RESPONSE',
                    'message' => 'Invalid JSON returned from Python MCP service.'
                ]
            ];
        }

        return $decoded;
    }
}