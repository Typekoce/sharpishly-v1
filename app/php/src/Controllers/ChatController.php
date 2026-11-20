<?php

namespace App\Controllers;

use App\Models\ChatModel;
use App\Services\ChatService;
use Throwable;

class ChatController extends BaseController
{
    public string $tbl = 'messages';

    private function model(): ChatModel
    {
        return new ChatModel();
    }

    public function save(): void
    {
        $data = $this->getPost();
        $prompt = trim((string) ($data['prompt'] ?? ''));
        $realityId = (int) ($data['reality_id'] ?? 1);

        if ($prompt === '') {
            $this->json(['success' => false, 'error' => 'Prompt is required.'], 422);
            return;
        }

        try {
            $recordId = $this->model()->createMessage([
                'reality_id' => $realityId,
                'role'       => 'user',
                'content'    => $prompt,
            ]);

            if ($recordId === false) {
                throw new \RuntimeException('Failed to persist user prompt.');
            }

            $this->json([
                'success'    => true,
                'message_id' => $recordId,
                'prompt'     => $prompt,
            ]);
        } catch (Throwable $e) {
            $this->logger->error($e->getMessage());
            $this->json(['success' => false, 'error' => 'Unable to save prompt.'], 500);
        }
    }

    public function handle(): void
    {
        $data = $this->getPost();
        $message = trim((string) ($data['message'] ?? ''));
        $realityId = (int) ($data['reality_id'] ?? 1);

        if ($message === '') {
            $this->json(['success' => false, 'error' => 'Message cannot be empty.'], 422);
            return;
        }

        $model = $this->model();
        $service = new ChatService();

        try {
            $model->createMessage([
                'reality_id' => $realityId,
                'role'       => 'user',
                'content'    => $message,
            ]);

            $history = $model->getRecentMessages($realityId, 10);
            $aiResult = $service->callPython([
                'reality_id' => $realityId,
                'prompt'     => $message,
                'history'    => $history,
            ]);

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

            $reply = trim((string) ($aiResult['response'] ?? '')) ?: 'No response generated.';

            $model->createMessage([
                'reality_id' => $realityId,
                'role'       => 'assistant',
                'content'    => $reply,
            ]);

            $this->json(['success' => true, 'response' => $reply]);
        } catch (Throwable $e) {
            $this->logger->error($e->getMessage());
            try {
                $model->createMessage([
                    'reality_id' => $realityId,
                    'role'       => 'assistant',
                    'content'    => 'The assistant could not generate a response. Please try again.',
                    'status'     => 'failed',
                ]);
            } catch (Throwable $persistError) {
                $this->logger->error($persistError->getMessage());
            }
            $this->json(['success' => false, 'error' => 'Unable to process chat request.'], 502);
        }
    }

    public function history(): void
    {
        $realityId = (int) ($_GET['reality_id'] ?? 1);
        $this->json([
            'success'    => true,
            'reality_id' => $realityId,
            'records'    => $this->model()->getRecentMessages($realityId, 50),
        ]);
    }

    public function update($id = '1'): void
    {
        $data = $this->getPost();
        $targetId = (int) ($data['id'] ?? $id);
        $realityId = (int) ($data['reality_id'] ?? 1);

        $fields = [];
        if (array_key_exists('pref', $data)) {
            $fields['pref'] = $data['pref'];
        }
        if (array_key_exists('content', $data)) {
            $fields['content'] = $data['content'];
        }
        if (!$fields) {
            $fields = ['pref' => 'foo bar', 'content' => '{}'];
        }

        $result = $this->model()->updateMessage($targetId, $fields, $realityId);
        $this->json([
            'success' => $result !== false,
            'id'      => $targetId,
            'result'  => $result,
            'pref'    => $fields['pref'] ?? null,
        ]);
    }
}