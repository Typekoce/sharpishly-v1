<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\InnodbModel;

class InnodbController extends BaseController
{
    private InnodbModel $model;

    public function __construct()
    {
        parent::__construct();
        $this->model = new InnodbModel();
    }

    public function index(): void
    {
        $this->model->ensureTablesExist();
        $payload = $this->model->loadAllTables();
        $this->json([
            'success' => $payload['success'],
            'schema'  => $this->model->getSchema(),
            'tables'  => $payload['tables'],
            'message' => $payload['message'] ?? null,
        ]);
    }

    public function initSchema(): void
    {
        $ok = $this->model->ensureTablesExist();
        $this->json(['success' => $ok, 'tables' => InnodbModel::TABLES]);
    }

    public function insert(): void
    {
        $body = $this->requestJson();
        $table = (string)($body['table'] ?? '');
        $record = is_array($body['record'] ?? null) ? $body['record'] : [];

        if (!in_array($table, InnodbModel::TABLES, true)) {
            $this->json(['success' => false, 'message' => 'Invalid target table.'], 400);
            return;
        }

        $res = $this->model->insertRow($table, $record);
        $this->json($res, $res['success'] ? 200 : 422);
    }

    public function update(): void
    {
        $body = $this->requestJson();
        $table = (string)($body['table'] ?? '');
        $id = (int)($body['id'] ?? 0);
        $record = is_array($body['record'] ?? null) ? $body['record'] : [];

        if (!in_array($table, InnodbModel::TABLES, true) || $id <= 0) {
            $this->json(['success' => false, 'message' => 'Invalid table or row ID.'], 400);
            return;
        }

        $res = $this->model->updateRow($table, $id, $record);
        $this->json($res, $res['success'] ? 200 : 422);
    }

    public function delete(): void
    {
        $body = $this->requestJson();
        $table = (string)($body['table'] ?? '');
        $id = (int)($body['id'] ?? 0);

        if (!in_array($table, InnodbModel::TABLES, true) || $id <= 0) {
            $this->json(['success' => false, 'message' => 'Invalid table or row ID.'], 400);
            return;
        }

        $res = $this->model->deleteRow($table, $id);
        $this->json($res, $res['success'] ? 200 : 404);
    }

    public function restore(): void
    {
        $body = $this->requestJson();
        $table = (string)($body['table'] ?? '');
        $row = is_array($body['row'] ?? null) ? $body['row'] : [];

        if (!in_array($table, InnodbModel::TABLES, true) || empty($row)) {
            $this->json(['success' => false, 'message' => 'Invalid restore payload.'], 400);
            return;
        }

        $res = $this->model->restoreRow($table, $row);
        $this->json($res, $res['success'] ? 200 : 422);
    }

    public function reset(): void
    {
        $res = $this->model->resetSeedData();
        $this->json($res, $res['success'] ? 200 : 500);
    }

    public function importSnapshot(): void
    {
        $body = $this->requestJson();
        $tables = is_array($body['tables'] ?? null) ? $body['tables'] : [];

        foreach (InnodbModel::TABLES as $requiredTable) {
            if (!isset($tables[$requiredTable]) || !is_array($tables[$requiredTable])) {
                $this->json(['success' => false, 'message' => 'Invalid snapshot schema structure.'], 400);
                return;
            }
        }

        $res = $this->model->replaceAllTables($tables);
        $this->json($res, $res['success'] ? 200 : 500);
    }

    public function explain(): void
    {
        $body = $this->requestJson();
        $table = in_array($body['table'] ?? '', InnodbModel::TABLES, true) ? (string)$body['table'] : 'nodes';
        $predicate = (string)($body['predicate'] ?? 'composite');
        $rows = (int)($body['rows'] ?? 250000);

        $this->json([
            'success' => true,
            'plan'    => $this->model->computeExplainPlan($table, $predicate, $rows),
        ]);
    }

    public function dump(): void
    {
        $body = $this->requestJson();
        $tables = is_array($body['tables'] ?? null) ? $body['tables'] : ($this->model->loadAllTables()['tables'] ?? []);

        $this->json([
            'success' => true,
            'sql'     => $this->model->generateSqlDump($tables),
        ]);
    }

    private function requestJson(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : $_POST;
    }

    private function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload);
    }
}