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

        try {
            $model->createMessage([
                'reality_id' => $realityId,
                'role'       => 'user',
                'content'    => $message
            ]);

            $history = $model->getRecentMessages($realityId, 10);

            $payload = [
                'reality_id' => $realityId,
                'prompt'     => $message,
                'history'    => $history
            ];

            $service = new ChatService();
            $aiResult = $service->callPython($payload);

            $this->logger->error(
                'CHAT_AI_RESULT: ' . json_encode(
                    $aiResult,
                    JSON_UNESCAPED_SLASHES
                )
            );

            $status = $aiResult['status'] ?? 'error';
            $reply = trim((string) ($aiResult['response'] ?? ''));
            $toolName = $aiResult['tool'] ?? null;
            $toolOutput = $aiResult['tool_output'] ?? null;

            if ($status !== 'success') {
                $errorMessage = $aiResult['error']['message']
                    ?? 'The AI service could not process the request.';

                $this->logger->error(
                    'CHAT_AI_ERROR: ' . $errorMessage
                );

                $this->json([
                    'success' => false,
                    'error'   => $errorMessage
                ], 502);

                return;
            }

            if ($toolOutput !== null) {
                $model->createMessage([
                    'reality_id'   => $realityId,
                    'role'         => 'tool',
                    'content'      => (string) (
                        $toolOutput['content']
                        ?? $toolOutput['raw_output']
                        ?? json_encode($toolOutput)
                    ),
                    'tool_name'    => $toolName,
                    'tool_call_id' => $toolOutput['tool_call_id'] ?? null,
                    'status'       => $toolOutput['status'] ?? 'completed',
                    'metadata'     => $toolOutput['metadata'] ?? null,
                ]);
            }

            if ($reply === '') {
                $reply = 'No response generated.';
            }

            $model->createMessage([
                'reality_id' => $realityId,
                'role'       => 'assistant',
                'content'    => $reply
            ]);

            $this->json([
                'success'     => true,
                'tool'        => $toolName,
                'tool_output' => $toolOutput,
                'response'    => $reply
            ]);
        } catch (Throwable $error) {
            $this->logger->error($error->getMessage());

            try {
                $model->createMessage([
                    'reality_id' => $realityId,
                    'role'       => 'assistant',
                    'content'    => (
                        'The assistant could not generate a response. '
                        . 'Please try again.'
                    ),
                    'status'     => 'failed'
                ]);
            } catch (Throwable $persistError) {
                $this->logger->error($persistError->getMessage());
            }

            $this->json([
                'success' => false,
                'error'   => 'Unable to process chat request.'
            ], 502);
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