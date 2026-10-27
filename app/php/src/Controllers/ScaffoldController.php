<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Models\ScaffoldModel;
use Throwable;

class ScaffoldController extends BaseController
{

/**
     * GET /php/scaffold/migrate
     * The unified migration endpoint for PyMVC and the Frontend.
     */
    public function migrate(): void
    {
        // 1. Session Gate: Avoid redundant checks during a single session
        if ($this->session->get('migrated', false) === true) {
            $this->json(['status' => 'skip', 'message' => 'Schema verified.']);
            return;
        }

        try {
            $scaffold = new ScaffoldModel();

            $scaffold->syncSchema(); 

            $lastMigration = 'v3_6_neural_pipeline_init';

            $alreadyRun = $this->db->find([
                'tbl'   => 'migrations',
                'where' => ['migration_name' => $lastMigration]
            ]);

            if (empty($alreadyRun)) {
                $this->db->save('migrations', [
                    'migration_name' => $lastMigration,
                    'batch'          => 1
                ]);

                $this->session->set('migrated', true);
                $this->json([
                    'status'  => 'success',
                    'message' => 'Schema migration and migrations table initialized.'
                ]);
            } else {
                $this->session->set('migrated', true);
                $this->json(['status' => 'skip', 'message' => 'Already up to date.']);
            }

        } catch (Throwable $e) {
            // Consistent error reporting for the Python SearchService
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }


}
