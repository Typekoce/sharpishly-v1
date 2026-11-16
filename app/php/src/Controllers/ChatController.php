<?php

namespace App\Controllers;

use App\Models\ChatModel;
use App\Services\ChatService;
use Throwable;

class ChatController extends BaseController {

    public function save(): void
    {
        $data = $this->getPost();
        $prompt = trim((string) ($data['prompt'] ?? ''));
        $realityId = (int) ($data['reality_id'] ?? 1);

        if ($prompt === '') {
            $this->json([
                'success' => false,
                'error'   => 'Prompt is required.'
            ], 422);
            return;
        }

        $model = new ChatModel();

        try {
            $recordId = $model->createMessage([
                'reality_id' => $realityId,
                'role'       => 'user',
                'content'    => $prompt
            ]);

            if ($recordId === false) {
                throw new \RuntimeException('Failed to persist user prompt.');
            }

            $this->json([
                'success'    => true,
                'message_id' => $recordId,
                'prompt'     => $prompt
            ]);
        } catch (Throwable $e) {
            $this->logger->error($e->getMessage());

            $this->json([
                'success' => false,
                'error'   => 'Unable to save prompt.'
            ], 500);
            return;
        }
    }

    public function handle(): void
    {
        $data = $this->getPost();
        $message = trim((string) ($data['message'] ?? ''));
        $realityId = (int) ($data['reality_id'] ?? 1);

        if ($message === '') {
            $this->json([
                'success' => false,
                'error'   => 'Message cannot be empty.'
            ], 422);
            return;
        }

        $model = new ChatModel();
        $service = new ChatService();

        try {
            // 1. Log user message via Model first so it is included in history
            $model->createMessage([
                'reality_id' => $realityId,
                'role'       => 'user',
                'content'    => $message
            ]);

            // 2. Gather recent chronological history and construct payload for Python AI service
            $history = $model->getRecentMessages($realityId, 10);
            $payload = [
                'reality_id' => $realityId,
                'prompt'     => $message,
                'history'    => $history
            ];

            $aiResult = $service->callPython($payload);
            $reply = trim((string) ($aiResult['response'] ?? ''));

            // 3. Persist tool output if invoked by Qwen / MCP executor
            if (!empty($aiResult['tool_output'])) {
                $toolOut = $aiResult['tool_output'];
                $model->createMessage([
                    'reality_id'   => $realityId,
                    'role'         => 'tool',
                    'content'      => (string) ($toolOut['content'] ?? ''),
                    'tool_name'    => $toolOut['tool_name'] ?? null,
                    'tool_call_id' => $toolOut['tool_call_id'] ?? null,
                    'status'       => $toolOut['status'] ?? 'completed',
                    'metadata'     => $toolOut['metadata'] ?? null,
                ]);
            }

            if ($reply === '') {
                $reply = 'No response generated.';
            }

            // 4. Log assistant reply via Model
            $model->createMessage([
                'reality_id' => $realityId,
                'role'       => 'assistant',
                'content'    => $reply
            ]);

            $this->json([
                'success'  => true,
                'response' => $reply
            ]);
        } catch (Throwable $e) {
            $this->logger->error($e->getMessage());

            // Persist a failed assistant turn so the conversation state remains complete
            try {
                $model->createMessage([
                    'reality_id' => $realityId,
                    'role'       => 'assistant',
                    'content'    => 'The assistant could not generate a response. Please try again.',
                    'status'     => 'failed'
                ]);
            } catch (Throwable $persistError) {
                $this->logger->error($persistError->getMessage());
            }

            $this->json([
                'success' => false,
                'error'   => 'Unable to process chat request.'
            ], 502);
            return;
        }
    }

    public function history(): void
    {
        $realityId = (int) ($_GET['reality_id'] ?? 1);
        $model = new ChatModel();
        $records = $model->getRecentMessages($realityId, 50);

        $this->json([
            'success'    => true,
            'reality_id' => $realityId,
            'records'    => $records
        ]);
        return;
    }
}