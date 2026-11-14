<?php

declare(strict_types=1);

namespace App\Services;

class ChatService
{
    private string $pythonUrl = 'http://127.0.0.1:8000/api/v1/chat';

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
            return ['response' => "Python API connection error: {$error}"];
        }

        $decoded = json_decode($response, true);
        return is_array($decoded) ? $decoded : ['response' => $response];
    }
}