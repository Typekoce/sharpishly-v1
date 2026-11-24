<?php

declare(strict_types=1);

namespace App\Models;

use Throwable;

class InnodbModel extends BaseModel
{
    public const TABLES = ['nodes', 'deployments', 'telemetry_logs'];

    public function getSchema(): array
    {
        return [
            'nodes' => [
                'name' => 'nodes',
                'engine' => 'InnoDB',
                'pk' => 'id',
                'description' => 'Bare-metal and VM compute hosts managed by the orchestration control plane.',
                'indexes' => [
                    'PRIMARY KEY (id)',
                    'UNIQUE KEY uk_hostname (hostname)',
                    'KEY idx_region_status (region, status)',
                ],
                'columns' => [
                    ['name' => 'id', 'type' => 'BIGINT UNSIGNED', 'readonly' => true],
                    ['name' => 'hostname', 'type' => 'VARCHAR(64)', 'required' => true, 'pattern' => '^[a-z0-9.-]{3,64}$', 'placeholder' => 'e.g. man-edge-01.internal'],
                    ['name' => 'ipv4_addr', 'type' => 'VARCHAR(15)', 'required' => true, 'pattern' => '^(\\d{1,3}\\.){3}\\d{1,3}$', 'placeholder' => '10.24.18.101'],
                    ['name' => 'region', 'type' => 'ENUM', 'options' => ['uk-manchester', 'uk-london', 'eu-frankfurt', 'us-east'], 'required' => true],
                    ['name' => 'vcpu_cores', 'type' => 'SMALLINT UNSIGNED', 'inputType' => 'number', 'min' => 1, 'max' => 256, 'required' => true],
                    ['name' => 'status', 'type' => 'ENUM', 'options' => ['ONLINE', 'DEGRADED', 'DRAINING', 'OFFLINE'], 'required' => true],
                    ['name' => 'updated_at', 'type' => 'TIMESTAMP', 'readonly' => true],
                ],
            ],
            'deployments' => [
                'name' => 'deployments',
                'engine' => 'InnoDB',
                'pk' => 'id',
                'description' => 'Service releases bound via foreign key (node_id -> nodes.id ON DELETE CASCADE).',
                'indexes' => [
                    'PRIMARY KEY (id)',
                    'KEY fk_deploy_node (node_id)',
                    'KEY idx_env_status (environment, status)',
                ],
                'columns' => [
                    ['name' => 'id', 'type' => 'BIGINT UNSIGNED', 'readonly' => true],
                    ['name' => 'node_id', 'type' => 'BIGINT UNSIGNED (FK)', 'fkTable' => 'nodes', 'required' => true],
                    ['name' => 'service_name', 'type' => 'VARCHAR(64)', 'required' => true, 'pattern' => '^[a-z0-9_-]{2,64}$', 'placeholder' => 'nats-broker-core'],
                    ['name' => 'release_tag', 'type' => 'VARCHAR(32)', 'required' => true, 'placeholder' => 'v2.14.0'],
                    ['name' => 'environment', 'type' => 'ENUM', 'options' => ['production', 'staging', 'canary'], 'required' => true],
                    ['name' => 'status', 'type' => 'ENUM', 'options' => ['ACTIVE', 'ROLLING', 'FAILED', 'ROLLED_BACK'], 'required' => true],
                    ['name' => 'updated_at', 'type' => 'TIMESTAMP', 'readonly' => true],
                ],
            ],
            'telemetry_logs' => [
                'name' => 'telemetry_logs',
                'engine' => 'InnoDB',
                'pk' => 'id',
                'description' => 'Append-heavy InnoDB buffer pool, IOPS, and replication lag samples per host.',
                'indexes' => [
                    'PRIMARY KEY (id)',
                    'KEY idx_node_severity (node_id, severity)',
                ],
                'columns' => [
                    ['name' => 'id', 'type' => 'BIGINT UNSIGNED', 'readonly' => true],
                    ['name' => 'node_id', 'type' => 'BIGINT UNSIGNED (FK)', 'fkTable' => 'nodes', 'required' => true],
                    ['name' => 'metric_key', 'type' => 'VARCHAR(48)', 'required' => true, 'placeholder' => 'innodb_buffer_hit_pct'],
                    ['name' => 'metric_value', 'type' => 'DECIMAL(10,2)', 'inputType' => 'number', 'step' => '0.01', 'required' => true],
                    ['name' => 'severity', 'type' => 'ENUM', 'options' => ['INFO', 'WARN', 'CRITICAL'], 'required' => true],
                    ['name' => 'notes', 'type' => 'TEXT', 'required' => false, 'placeholder' => 'Observation notes...'],
                    ['name' => 'updated_at', 'type' => 'TIMESTAMP', 'readonly' => true],
                ],
            ],
        ];
    }

    public function getSeedTables(): array
    {
        return [
            'nodes' => [
                ['id' => 101, 'hostname' => 'man-db-primary-01', 'ipv4_addr' => '10.44.1.10', 'region' => 'uk-manchester', 'vcpu_cores' => 32, 'status' => 'ONLINE', 'updated_at' => '2026-11-19 09:12:04'],
                ['id' => 102, 'hostname' => 'man-db-replica-02', 'ipv4_addr' => '10.44.1.11', 'region' => 'uk-manchester', 'vcpu_cores' => 32, 'status' => 'ONLINE', 'updated_at' => '2026-11-19 09:14:22'],
                ['id' => 103, 'hostname' => 'lon-nats-relay-01', 'ipv4_addr' => '10.48.4.20', 'region' => 'uk-london', 'vcpu_cores' => 16, 'status' => 'ONLINE', 'updated_at' => '2026-11-19 10:02:45'],
                ['id' => 104, 'hostname' => 'fra-inference-01', 'ipv4_addr' => '10.52.8.14', 'region' => 'eu-frankfurt', 'vcpu_cores' => 64, 'status' => 'DEGRADED', 'updated_at' => '2026-11-19 11:30:19'],
                ['id' => 105, 'hostname' => 'iad-archive-01', 'ipv4_addr' => '10.60.2.88', 'region' => 'us-east', 'vcpu_cores' => 8, 'status' => 'DRAINING', 'updated_at' => '2026-11-19 12:05:00'],
            ],
            'deployments' => [
                ['id' => 501, 'node_id' => 101, 'service_name' => 'mysql-innodb-core', 'release_tag' => 'v8.0.40', 'environment' => 'production', 'status' => 'ACTIVE', 'updated_at' => '2026-11-19 08:00:00'],
                ['id' => 502, 'node_id' => 102, 'service_name' => 'mysql-read-replica', 'release_tag' => 'v8.0.40', 'environment' => 'production', 'status' => 'ACTIVE', 'updated_at' => '2026-11-19 08:05:12'],
                ['id' => 503, 'node_id' => 103, 'service_name' => 'nats-jetstream-bus', 'release_tag' => 'v2.10.22', 'environment' => 'production', 'status' => 'ACTIVE', 'updated_at' => '2026-11-19 09:40:18'],
                ['id' => 504, 'node_id' => 104, 'service_name' => 'llama-rpc-worker', 'release_tag' => 'v1.9.3-rc2', 'environment' => 'canary', 'status' => 'ROLLING', 'updated_at' => '2026-11-19 11:31:00'],
                ['id' => 505, 'node_id' => 105, 'service_name' => 'cold-snapshot-sync', 'release_tag' => 'v1.4.1', 'environment' => 'staging', 'status' => 'FAILED', 'updated_at' => '2026-11-19 12:10:44'],
            ],
            'telemetry_logs' => [
                ['id' => 9001, 'node_id' => 101, 'metric_key' => 'innodb_buffer_hit_pct', 'metric_value' => 99.84, 'severity' => 'INFO', 'notes' => 'Buffer pool warmed; zero disk reads on PK index.', 'updated_at' => '2026-11-19 14:10:00'],
                ['id' => 9002, 'node_id' => 102, 'metric_key' => 'replica_lag_seconds', 'metric_value' => 0.02, 'severity' => 'INFO', 'notes' => 'Semi-sync replication nominal.', 'updated_at' => '2026-11-19 14:11:15'],
                ['id' => 9003, 'node_id' => 103, 'metric_key' => 'nats_msg_throughput_sec', 'metric_value' => 14820.50, 'severity' => 'INFO', 'notes' => 'Zero consumer backpressure.', 'updated_at' => '2026-11-19 14:12:40'],
                ['id' => 9004, 'node_id' => 104, 'metric_key' => 'innodb_row_lock_waits', 'metric_value' => 47.00, 'severity' => 'WARN', 'notes' => 'Contention spike during batch upsert.', 'updated_at' => '2026-11-19 14:15:09'],
                ['id' => 9005, 'node_id' => 105, 'metric_key' => 'nvme_queue_depth', 'metric_value' => 128.00, 'severity' => 'CRITICAL', 'notes' => 'Node draining prior to NVMe replacement.', 'updated_at' => '2026-11-19 14:18:33'],
            ],
        ];
    }

    public function ensureTablesExist(): bool
    {
        $this->db->createTable('nodes', [
            'id' => 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT',
            'hostname' => 'VARCHAR(64) NOT NULL',
            'ipv4_addr' => 'VARCHAR(15) NOT NULL',
            'region' => "ENUM('uk-manchester','uk-london','eu-frankfurt','us-east') NOT NULL",
            'vcpu_cores' => 'SMALLINT UNSIGNED NOT NULL DEFAULT 4',
            'status' => "ENUM('ONLINE','DEGRADED','DRAINING','OFFLINE') NOT NULL DEFAULT 'ONLINE'",
            'updated_at' => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            'PRIMARY KEY' => '(id)',
            'UNIQUE' => 'KEY uk_hostname (hostname)',
            'INDEX' => 'idx_region_status (region, status)',
        ]);

        $this->db->createTable('deployments', [
            'id' => 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT',
            'node_id' => 'BIGINT UNSIGNED NOT NULL',
            'service_name' => 'VARCHAR(64) NOT NULL',
            'release_tag' => 'VARCHAR(32) NOT NULL',
            'environment' => "ENUM('production','staging','canary') NOT NULL DEFAULT 'production'",
            'status' => "ENUM('ACTIVE','ROLLING','FAILED','ROLLED_BACK') NOT NULL DEFAULT 'ACTIVE'",
            'updated_at' => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            'PRIMARY KEY' => '(id)',
            'INDEX' => 'fk_deploy_node (node_id)',
            'FOREIGN KEY' => '(node_id) REFERENCES nodes (id) ON DELETE CASCADE',
        ]);

        $this->db->createTable('telemetry_logs', [
            'id' => 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT',
            'node_id' => 'BIGINT UNSIGNED NOT NULL',
            'metric_key' => 'VARCHAR(48) NOT NULL',
            'metric_value' => 'DECIMAL(10,2) NOT NULL',
            'severity' => "ENUM('INFO','WARN','CRITICAL') NOT NULL DEFAULT 'INFO'",
            'notes' => 'TEXT NULL',
            'updated_at' => 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            'PRIMARY KEY' => '(id)',
            'INDEX' => 'idx_node_severity (node_id, severity)',
            'FOREIGN KEY' => '(node_id) REFERENCES nodes (id) ON DELETE CASCADE',
        ]);

        return true;
    }

    public function loadAllTables(): array
    {
        try {
            $this->ensureTablesExist();
            $result = [];

            foreach (self::TABLES as $table) {
                $rows = $this->read(['tbl' => $table, 'order' => ['id' => 'DESC']]);
                if (empty($rows)) {
                    $this->seedTable($table);
                    $rows = $this->read(['tbl' => $table, 'order' => ['id' => 'DESC']]);
                }
                $result[$table] = $rows;
            }

            return ['success' => true, 'tables' => $result];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'tables' => $this->getSeedTables(),
            ];
        }
    }

    public function seedTable(string $table): void
    {
        $seeds = $this->getSeedTables()[$table] ?? [];
        foreach ($seeds as $row) {
            $this->db->save($table, $row);
        }
    }

    public function resetSeedData(): array
    {
        try {
            $this->ensureTablesExist();
            $this->db->execute('SET FOREIGN_KEY_CHECKS = 0');
            foreach (array_reverse(self::TABLES) as $table) {
                $this->db->execute("TRUNCATE TABLE `$table`");
            }
            $this->db->execute('SET FOREIGN_KEY_CHECKS = 1');

            foreach (self::TABLES as $table) {
                $this->seedTable($table);
            }

            return $this->loadAllTables();
        } catch (Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function insertRow(string $table, array $record): array
    {
        try {
            $this->ensureTablesExist();
            unset($record['id']);
            $record['updated_at'] = date('Y-m-d H:i:s');

            if ($table === 'nodes' && !empty($record['hostname'])) {
                $existing = $this->read([
                    'tbl' => 'nodes',
                    'where' => ['hostname' => (string)$record['hostname']],
                ]);
                if (!empty($existing)) {
                    return [
                        'success' => false,
                        'message' => "ERROR 1062 (23000): Duplicate entry '{$record['hostname']}' for key 'nodes.uk_hostname'",
                    ];
                }
            }

            $saved = $this->update($table, $record);
            if (is_array($saved) && !empty($saved['error'])) {
                return ['success' => false, 'message' => $saved['message']];
            }

            $id = is_int($saved) ? $saved : (int)$this->db->lastInsertId();
            $rows = $this->read(['tbl' => $table, 'where' => ['id' => $id]]);
            $row = $rows[0] ?? array_merge($record, ['id' => $id]);

            return [
                'success' => true,
                'row' => $row,
                'sql' => $this->buildInsertSql($table, $row),
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function updateRow(string $table, int $id, array $record): array
    {
        try {
            $this->ensureTablesExist();

            if ($table === 'nodes' && !empty($record['hostname'])) {
                $existing = $this->read([
                    'tbl' => 'nodes',
                    'where' => ['hostname' => (string)$record['hostname']],
                ]);
                foreach ($existing as $match) {
                    if ((int)$match['id'] !== $id) {
                        return [
                            'success' => false,
                            'message' => "ERROR 1062 (23000): Duplicate entry '{$record['hostname']}' for key 'nodes.uk_hostname'",
                        ];
                    }
                }
            }

            $payload = array_merge($record, [
                'id' => $id,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            $this->update($table, $payload);

            $rows = $this->read(['tbl' => $table, 'where' => ['id' => $id]]);
            return [
                'success' => true,
                'row' => $rows[0] ?? $payload,
                'sql' => $this->buildUpdateSql($table, $id, $record),
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function deleteRow(string $table, int $id): array
    {
        try {
            $rows = $this->read(['tbl' => $table, 'where' => ['id' => $id]]);
            $target = $rows[0] ?? null;
            if (!$target) {
                return ['success' => false, 'message' => "Row $id not found in $table"];
            }

            if ($table === 'nodes') {
                $this->db->execute('DELETE FROM `deployments` WHERE `node_id` = ?', [$id]);
                $this->db->execute('DELETE FROM `telemetry_logs` WHERE `node_id` = ?', [$id]);
            }

            $this->db->execute("DELETE FROM `$table` WHERE `id` = ?", [$id]);

            return [
                'success' => true,
                'deleted' => $target,
                'sql' => "DELETE FROM {$table} WHERE id = {$id};",
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function restoreRow(string $table, array $row): array
    {
        try {
            $this->ensureTablesExist();
            $this->update($table, $row);
            return [
                'success' => true,
                'row' => $row,
                'sql' => "-- ROLLBACK / RESTORE\nINSERT INTO {$table} (id, ...) VALUES (" . (int)($row['id'] ?? 0) . ", ...);",
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function replaceAllTables(array $tables): array
    {
        try {
            $this->ensureTablesExist();
            $this->db->execute('SET FOREIGN_KEY_CHECKS = 0');
            foreach (array_reverse(self::TABLES) as $table) {
                $this->db->execute("TRUNCATE TABLE `$table`");
            }
            $this->db->execute('SET FOREIGN_KEY_CHECKS = 1');

            foreach (self::TABLES as $table) {
                foreach ($tables[$table] ?? [] as $row) {
                    $this->db->save($table, (array)$row);
                }
            }

            return $this->loadAllTables();
        } catch (Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function computeExplainPlan(string $table, string $predicate, int $rows): array
    {
        $schema = $this->getSchema();
        $n = max(1, $rows);

        if ($predicate === 'pk') {
            return [
                'type' => 'const',
                'possible_keys' => 'PRIMARY',
                'key' => 'PRIMARY',
                'rows' => 1,
                'filtered' => '100.00',
                'extra' => 'Using index',
                'costUnits' => 1.0,
                'ioPages' => 3,
            ];
        }

        if ($predicate === 'composite') {
            $est = max(1, (int)round($n * 0.012));
            $idx = $schema[$table]['indexes'][2] ?? 'idx_composite';
            return [
                'type' => 'ref',
                'possible_keys' => $idx,
                'key' => $idx,
                'rows' => $est,
                'filtered' => '100.00',
                'extra' => 'Using where; Using index',
                'costUnits' => round($est * 0.25 + 2.4, 1),
                'ioPages' => max(4, (int)ceil($est / 40)),
            ];
        }

        if ($predicate === 'prefix_miss') {
            $est = max(10, (int)round($n * 0.35));
            $idx = $schema[$table]['indexes'][2] ?? 'idx_secondary';
            return [
                'type' => 'index',
                'possible_keys' => 'NULL',
                'key' => $idx,
                'rows' => $n,
                'filtered' => '35.00',
                'extra' => 'Using where; Using index (Full Index Scan)',
                'costUnits' => round($n * 0.18, 1),
                'ioPages' => (int)ceil($n / 90),
            ];
        }

        return [
            'type' => 'ALL',
            'possible_keys' => 'NULL',
            'key' => 'NULL',
            'rows' => $n,
            'filtered' => '11.11',
            'extra' => 'Using where (Full Clustered Table Scan)',
            'costUnits' => round($n * 0.42, 1),
            'ioPages' => (int)ceil($n / 32),
        ];
    }

    public function generateSqlDump(array $tables): string
    {
        $header = implode("\n", [
            '-- ============================================================================',
            '-- InnoDB Forge — MySQL 8.0+ Schema & Transactional Seed Dump',
            '-- Generated: ' . gmdate('c'),
            '-- ============================================================================',
            'SET NAMES utf8mb4;',
            'SET FOREIGN_KEY_CHECKS = 0;',
            '',
        ]);

        $ddl = <<<SQL

DROP TABLE IF EXISTS telemetry_logs;
DROP TABLE IF EXISTS deployments;
DROP TABLE IF EXISTS nodes;

CREATE TABLE nodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hostname VARCHAR(64) NOT NULL,
  ipv4_addr VARCHAR(15) NOT NULL,
  region ENUM('uk-manchester','uk-london','eu-frankfurt','us-east') NOT NULL,
  vcpu_cores SMALLINT UNSIGNED NOT NULL DEFAULT 4,
  status ENUM('ONLINE','DEGRADED','DRAINING','OFFLINE') NOT NULL DEFAULT 'ONLINE',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_hostname (hostname),
  KEY idx_region_status (region, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE deployments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  node_id BIGINT UNSIGNED NOT NULL,
  service_name VARCHAR(64) NOT NULL,
  release_tag VARCHAR(32) NOT NULL,
  environment ENUM('production','staging','canary') NOT NULL DEFAULT 'production',
  status ENUM('ACTIVE','ROLLING','FAILED','ROLLED_BACK') NOT NULL DEFAULT 'ACTIVE',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_deploy_node (node_id),
  KEY idx_env_status (environment, status),
  CONSTRAINT fk_deployments_node FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE telemetry_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  node_id BIGINT UNSIGNED NOT NULL,
  metric_key VARCHAR(48) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  severity ENUM('INFO','WARN','CRITICAL') NOT NULL DEFAULT 'INFO',
  notes TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_node_severity (node_id, severity),
  CONSTRAINT fk_telemetry_node FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SQL;

        $inserts = '';
        foreach (self::TABLES as $tableName) {
            $rows = $tables[$tableName] ?? [];
            if (empty($rows)) {
                $inserts .= "-- Table {$tableName} has 0 rows\n\n";
                continue;
            }
            $cols = array_keys((array)$rows[0]);
            $tupleLines = [];
            foreach ($rows as $row) {
                $rowArr = (array)$row;
                $vals = array_map(fn($c) => $this->escapeSqlLiteral($rowArr[$c] ?? null), $cols);
                $tupleLines[] = '  (' . implode(', ', $vals) . ')';
            }
            $inserts .= "INSERT INTO {$tableName} (" . implode(', ', $cols) . ") VALUES\n"
                . implode(",\n", $tupleLines) . ";\n\n";
        }

        return $header . $ddl . "\n" . $inserts . "SET FOREIGN_KEY_CHECKS = 1;\n";
    }

    private function escapeSqlLiteral(mixed $val): string
    {
        if ($val === null) {
            return 'NULL';
        }
        if (is_bool($val)) {
            return $val ? '1' : '0';
        }
        if (is_int($val) || is_float($val)) {
            return (string)$val;
        }
        return "'" . str_replace(["\\", "'"], ["\\\\", "\\'"], (string)$val) . "'";
    }

    private function buildInsertSql(string $table, array $row): string
    {
        $cols = implode(', ', array_keys($row));
        $vals = implode(', ', array_map(fn($v) => $this->escapeSqlLiteral($v), array_values($row)));
        return "INSERT INTO {$table} ({$cols})\nVALUES ({$vals});";
    }

    private function buildUpdateSql(string $table, int $id, array $record): string
    {
        $sets = [];
        foreach ($record as $k => $v) {
            $sets[] = "{$k} = " . $this->escapeSqlLiteral($v);
        }
        return "UPDATE {$table}\nSET " . implode(', ', $sets) . ", updated_at = NOW()\nWHERE id = {$id};";
    }
}