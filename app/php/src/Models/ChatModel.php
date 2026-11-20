<?php

namespace App\Models;

use Throwable;

class ChatModel extends BaseModel
{
    public string $tbl = 'messages';

    public function getRecentMessages(int $realityId, int $limit = 50): array
    {
        try {
            $messages = $this->db->find([
                'tbl'   => $this->tbl,
                'where' => ['reality_id' => $realityId],
                'order' => ['id' => 'DESC'],
                'limit' => $limit,
            ]);
            return is_array($messages) ? array_reverse($messages) : [];
        } catch (Throwable $e) {
            return ['error' => true, 'message' => $e->getMessage()];
        }
    }

    public function createMessage(array $data): int|false
    {
        $allowedRoles = ['user', 'assistant', 'tool', 'system'];
        if (
            empty($data['reality_id']) ||
            empty($data['role']) ||
            !isset($data['content']) ||
            !in_array($data['role'], $allowedRoles, true)
        ) {
            return false;
        }

        $metadata = null;
        if (isset($data['metadata']) && $data['metadata'] !== null) {
            $metadata = is_string($data['metadata'])
                ? $data['metadata']
                : json_encode($data['metadata']);
        }

        try {
            return $this->db->save($this->tbl, [
                'reality_id'     => (int) $data['reality_id'],
                'role'           => (string) $data['role'],
                'content'        => (string) $data['content'],
                'tool_name'      => $data['tool_name'] ?? null,
                'tool_call_id'   => $data['tool_call_id'] ?? null,
                'status'         => $data['status'] ?? 'completed',
                'metadata'       => $metadata,
                'token_estimate' => (int) ceil(strlen((string) $data['content']) / 4),
                'created_at'     => date('Y-m-d H:i:s'),
            ]);
        } catch (Throwable $e) {
            if ($this->logger) {
                $this->logger->error($e->getMessage());
            }
            return false;
        }
    }

    public function updateMessage(int $id, array $fields, int $realityId = 1): mixed
    {
        $payload = ['reality_id' => $realityId];
        foreach (['pref', 'content', 'status'] as $col) {
            if (array_key_exists($col, $fields)) {
                $payload[$col] = $fields[$col];
            }
        }
        return $this->db->update($this->tbl, ['id' => $id], $payload);
    }
}