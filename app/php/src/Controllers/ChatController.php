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
        $payload = $this->extractMessagePayload();
        
        if (empty($payload['message'])) {
            $this->json(['status' => 'error', 'message' => 'Message cannot be empty.'], 400);
        }

        $this->model->logMessage($payload['reality_id'], 'user', $payload['message']);

        $aiResult = $this->service->callPython([
            'reality_id' => $payload['reality_id'],
            'anchors'    => $this->model->getActiveAnchors($payload['reality_id']),
            'history'    => $this->model->getRecentMessages($payload['reality_id'], 10),
            'prompt'     => $payload['message']
        ]);

        $reply = $aiResult['response'] ?? 'No response generated.';
        $this->model->logMessage($payload['reality_id'], 'assistant', $reply);

        $this->json([
            'status'   => 'success',
            'response' => $reply
        ]);
    }

    public function save(): void
    {
        $input = $this->getPost();
        $prompt = trim($input['prompt'] ?? '');
        $realityId = (int)($input['reality_id'] ?? 1);

        if ($prompt === '') {
            $this->json(['status' => 'error', 'message' => 'Prompt cannot be empty.'], 400);
        }

        $messageId = $this->model->savePrompt($realityId, $prompt);

        $this->json([
            'status'     => 'success',
            'message'    => 'Prompt saved successfully',
            'prompt'     => $prompt,
            'message_id' => $messageId
        ]);
    }

    private function extractMessagePayload(): array
    {
        $input = $this->getPost();
        return [
            'reality_id' => (int)($input['reality_id'] ?? 1),
            'message'    => trim($input['message'] ?? '')
        ];
    }
}