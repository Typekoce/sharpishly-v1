<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\ChatModel;
use App\Services\ChatService;

class ChatController extends BaseController
{
    private ChatModel $model;
    private ChatService $service;

    public function __construct()
    {
        parent::__construct();
        $this->model = new ChatModel();
        $this->service = new ChatService();
    }

    public function handle(): void
    {
        $realityId = (int)($_POST['reality_id'] ?? 1);
        $message = trim($_POST['message'] ?? '');

        if ($message === '') {
            $this->jsonResponse(['status' => 'error', 'message' => 'Message cannot be empty.'], 400);
            return;
        }

        // 1. Log user message via Model abstraction
        $this->model->logMessage($realityId, 'user', $message);

        // 2. Gather context and call Python AI service
        $payload = [
            'reality_id' => $realityId,
            'anchors'    => $this->model->getActiveAnchors($realityId),
            'history'    => $this->model->getRecentMessages($realityId, 10),
            'prompt'     => $message
        ];

        $aiResult = $this->service->callPython($payload);
        $reply = $aiResult['response'] ?? 'No response generated.';

        // 3. Log assistant response via Model abstraction
        $this->model->logMessage($realityId, 'assistant', $reply);

        $this->jsonResponse([
            'status'   => 'success',
            'response' => $reply
        ]);
    }

    protected function jsonResponse(array $data, int $statusCode = 200): void
    {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }

public function save(): void
    {
        // Read incoming JSON body sent by fetch
        $input = json_decode(file_get_contents('php://input'), true);
        $prompt = trim($input['prompt'] ?? '');

        // Dummy response returning confirmation
        $this->jsonResponse([
            'status'   => 'success',
            'message'  => 'Prompt saved successfully',
            'prompt'   => $prompt,
            'class'    => __CLASS__,
            'method'   => __FUNCTION__,
            'file'     => __FILE__
        ]);
    }
}