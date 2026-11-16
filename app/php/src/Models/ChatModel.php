<?php

declare(strict_types=1);

namespace App\Models;

class ChatModel extends BaseModel
{
    public function getActiveAnchors(int $realityId): array
    {
        return $this->db->find([
            'tbl'   => 'memory_anchors',
            'where' => [
                'reality_id' => $realityId,
                'status'     => 'active'
            ],
            'order' => ['observed_at' => 'ASC']
        ]);
    }

    public function getRecentMessages(int $realityId, int $limit = 10): array
    {
        $messages = $this->db->find([
            'tbl'   => 'messages',
            'where' => ['reality_id' => $realityId],
            'order' => ['created_at' => 'DESC'],
            'limit' => $limit
        ]);

        return array_reverse($messages);
    }

    public function logMessage(int $realityId, string $role, string $content): int|bool
    {
        return $this->db->save('messages', [
            'reality_id'     => $realityId,
            'role'           => $role,
            'content'        => $content,
            'token_estimate' => (int)(strlen($content) / 4),
            'created_at'     => date('Y-m-d H:i:s')
        ]);
    }

    public function savePrompt(int $realityId, string $prompt): int|bool
    {
        return $this->logMessage($realityId, 'user', $prompt);
    }
}