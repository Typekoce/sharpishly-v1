<?php

namespace App\Services;

/**
 * Api.php - Clean, zero-dependency HTTP client with unified configuration and response normalization.
 */
class Api {
    private static ?self $instance = null;
    
    private string $baseUrl = '';
    private string $method = 'GET';
    private array $conditions = [];
    private array $headers = [];

    private const SERVICES = [
        'github'  => 'https://api.github.com',
        'google'  => 'https://www.googleapis.com',
        'youtube' => 'https://www.googleapis.com/youtube/v3'
    ];

    private function __construct() {}

    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance->clear();
    }

    /**
     * Unified finder method accepting a complete configuration array (defaults to GET).
     */
    public function find(array $options = []): array {
        $this->clear();

        if (isset($options['service'])) {
            $this->to($options['service'], $options['endpoint'] ?? '');
        }

        $this->method($options['method'] ?? 'GET');

        if (isset($options['headers'])) {
            $this->headers($options['headers']);
        }

        $conditions = $options['conditions'] 
            ?? $options['params'] 
            ?? $options['data'] 
            ?? array_diff_key($options, array_flip([
                'service', 'endpoint', 'method', 'headers',
                'conditions', 'params', 'data'
            ]));

        if (!empty($conditions)) {
            $this->conditions($conditions);
        }

        return $this->send();
    }

    /**
     * Unified saver method accepting a complete configuration array (defaults to POST).
     */
    public function save(array $options = []): array {
        $this->clear();

        if (isset($options['service'])) {
            $this->to($options['service'], $options['endpoint'] ?? '');
        }

        $this->method($options['method'] ?? 'POST');

        if (isset($options['headers'])) {
            $this->headers($options['headers']);
        }

        $data = $options['data'] 
            ?? $options['payload'] 
            ?? $options['conditions'] 
            ?? array_diff_key($options, array_flip([
                'service', 'endpoint', 'method', 'headers',
                'data', 'payload', 'conditions'
            ]));

        if (!empty($data)) {
            $this->conditions($data);
        }

        return $this->send();
    }

    /**
     * Set target service preset or custom base URL, appending an optional endpoint path.
     */
    public function to(string $service, string $endpoint = ''): self {
        $key = strtolower($service);
        $base = self::SERVICES[$key] ?? rtrim($service, '/');
        $this->baseUrl = $base . ($endpoint ? '/' . ltrim($endpoint, '/') : '');
        return $this;
    }

    /**
     * Pass request conditions (query parameters or payload).
     */
    public function conditions(array $conditions): self {
        $this->conditions = array_merge($this->conditions, $conditions);
        return $this;
    }

    /**
     * Add request headers.
     */
    public function headers(array $headers): self {
        $this->headers = array_merge($this->headers, $headers);
        return $this;
    }

    /**
     * Set HTTP method.
     */
    public function method(string $method): self {
        $this->method = strtoupper($method);
        return $this;
    }

    /**
     * Execute the request and return standardized response data with raw backup.
     */
    public function send(): array {
        $url = $this->buildUrl();
        $ch = curl_init();

        $this->configureCurl($ch, $url);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);

        if ($error) {
            throw new RuntimeException("cURL transport error: {$error}");
        }

        $decoded = json_decode($response, true);

        return [
            'status' => $status,
            'body'   => $decoded ?? $response,
            'raw'    => $response
        ];
    }

    /**
     * Build target URL with query parameters if method is GET/DELETE.
     */
    private function buildUrl(): string {
        if (in_array($this->method, ['GET', 'DELETE']) && !empty($this->conditions)) {
            $separator = str_contains($this->baseUrl, '?') ? '&' : '?';
            return $this->baseUrl . $separator . http_build_query($this->conditions);
        }
        return $this->baseUrl;
    }

    /**
     * Configure cURL handle options and headers cleanly.
     */
    private function configureCurl($ch, string $url): void {
        $defaultHeaders = ['Accept: application/json', 'User-Agent: Sharpishly-App-Client'];

        foreach ($this->headers as $key => $value) {
            $defaultHeaders[] = "{$key}: {$value}";
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        if (!in_array($this->method, ['GET', 'POST'])) {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $this->method);
        }

        if (in_array($this->method, ['POST', 'PUT', 'PATCH'])) {
            $payload = !empty($this->conditions) ? json_encode($this->conditions) : '{}';
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            $defaultHeaders[] = 'Content-Type: application/json';
        }

        curl_setopt($ch, CURLOPT_HTTPHEADER, $defaultHeaders);
    }

    /**
     * Reset instance state for clean reuse.
     */
    private function clear(): self {
        $this->baseUrl = '';
        $this->method = 'GET';
        $this->conditions = [];
        $this->headers = [];
        return $this;
    }
}
