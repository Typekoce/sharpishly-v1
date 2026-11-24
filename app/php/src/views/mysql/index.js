    /* ========================================================================
       MODULE 1: UTILITIES & SECURITY HYGIENE
       ======================================================================== */
    const STORAGE_KEY = 'innodb_forge_state_v1';

    const Utils = {
      escapeSqlString(val) {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
        if (typeof val === 'boolean') return val ? '1' : '0';
        return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
      },

      formatNumber(num) {
        return new Intl.NumberFormat('en-GB').format(num);
      },

      nowSql() {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
      },

      el(tag, attrs = {}, children = []) {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
          if (v === null || v === undefined) continue;
          if (k === 'className') node.className = v;
          else if (k === 'textContent') node.textContent = v;
          else if (k === 'dataset') Object.assign(node.dataset, v);
          else node.setAttribute(k, String(v));
        }
        for (const child of Array.isArray(children) ? children : [children]) {
          if (child === null || child === undefined) continue;
          node.append(typeof child === 'string' ? document.createTextNode(child) : child);
        }
        return node;
      },

      safeStorageGet() {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      },

      safeStorageSet(payload) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          return true;
        } catch {
          return false;
        }
      }
    };

    /* ========================================================================
       MODULE 2: DOMAIN SCHEMA & CURATED INITIAL DATASET (15 RECORDS)
       ======================================================================== */
    const SCHEMA = {
      nodes: {
        name: 'nodes',
        engine: 'InnoDB',
        pk: 'id',
        description: 'Bare-metal and VM compute hosts managed by the orchestration control plane.',
        indexes: ['PRIMARY KEY (id)', 'UNIQUE KEY uk_hostname (hostname)', 'KEY idx_region_status (region, status)'],
        columns: [
          { name: 'id', type: 'BIGINT UNSIGNED', readonly: true },
          { name: 'hostname', type: 'VARCHAR(64)', required: true, pattern: '^[a-z0-9.-]{3,64}$', placeholder: 'e.g. man-edge-01.internal' },
          { name: 'ipv4_addr', type: 'VARCHAR(15)', required: true, pattern: '^(\\d{1,3}\\.){3}\\d{1,3}$', placeholder: '10.24.18.101' },
          { name: 'region', type: 'ENUM', options: ['uk-manchester', 'uk-london', 'eu-frankfurt', 'us-east'], required: true },
          { name: 'vcpu_cores', type: 'SMALLINT UNSIGNED', inputType: 'number', min: 1, max: 256, required: true },
          { name: 'status', type: 'ENUM', options: ['ONLINE', 'DEGRADED', 'DRAINING', 'OFFLINE'], required: true },
          { name: 'updated_at', type: 'TIMESTAMP', readonly: true }
        ]
      },
      deployments: {
        name: 'deployments',
        engine: 'InnoDB',
        pk: 'id',
        description: 'Service releases bound via foreign key (node_id -> nodes.id ON DELETE CASCADE).',
        indexes: ['PRIMARY KEY (id)', 'KEY fk_deploy_node (node_id)', 'KEY idx_env_status (environment, status)'],
        columns: [
          { name: 'id', type: 'BIGINT UNSIGNED', readonly: true },
          { name: 'node_id', type: 'BIGINT UNSIGNED (FK)', fkTable: 'nodes', required: true },
          { name: 'service_name', type: 'VARCHAR(64)', required: true, pattern: '^[a-z0-9_-]{2,64}$', placeholder: 'nats-broker-core' },
          { name: 'release_tag', type: 'VARCHAR(32)', required: true, placeholder: 'v2.14.0' },
          { name: 'environment', type: 'ENUM', options: ['production', 'staging', 'canary'], required: true },
          { name: 'status', type: 'ENUM', options: ['ACTIVE', 'ROLLING', 'FAILED', 'ROLLED_BACK'], required: true },
          { name: 'updated_at', type: 'TIMESTAMP', readonly: true }
        ]
      },
      telemetry_logs: {
        name: 'telemetry_logs',
        engine: 'InnoDB',
        pk: 'id',
        description: 'Append-heavy InnoDB buffer pool, IOPS, and replication lag samples per host.',
        indexes: ['PRIMARY KEY (id)', 'KEY idx_node_severity (node_id, severity)'],
        columns: [
          { name: 'id', type: 'BIGINT UNSIGNED', readonly: true },
          { name: 'node_id', type: 'BIGINT UNSIGNED (FK)', fkTable: 'nodes', required: true },
          { name: 'metric_key', type: 'VARCHAR(48)', required: true, placeholder: 'innodb_buffer_hit_pct' },
          { name: 'metric_value', type: 'DECIMAL(10,2)', inputType: 'number', step: '0.01', required: true },
          { name: 'severity', type: 'ENUM', options: ['INFO', 'WARN', 'CRITICAL'], required: true },
          { name: 'notes', type: 'TEXT', required: false, placeholder: 'Observation notes...' },
          { name: 'updated_at', type: 'TIMESTAMP', readonly: true }
        ]
      }
    };

    function createSeedTables() {
      return {
        nodes: [
          { id: 101, hostname: 'man-db-primary-01', ipv4_addr: '10.44.1.10', region: 'uk-manchester', vcpu_cores: 32, status: 'ONLINE', updated_at: '2026-11-19 09:12:04' },
          { id: 102, hostname: 'man-db-replica-02', ipv4_addr: '10.44.1.11', region: 'uk-manchester', vcpu_cores: 32, status: 'ONLINE', updated_at: '2026-11-19 09:14:22' },
          { id: 103, hostname: 'lon-nats-relay-01', ipv4_addr: '10.48.4.20', region: 'uk-london', vcpu_cores: 16, status: 'ONLINE', updated_at: '2026-11-19 10:02:45' },
          { id: 104, hostname: 'fra-inference-01', ipv4_addr: '10.52.8.14', region: 'eu-frankfurt', vcpu_cores: 64, status: 'DEGRADED', updated_at: '2026-11-19 11:30:19' },
          { id: 105, hostname: 'iad-archive-01', ipv4_addr: '10.60.2.88', region: 'us-east', vcpu_cores: 8, status: 'DRAINING', updated_at: '2026-11-19 12:05:00' }
        ],
        deployments: [
          { id: 501, node_id: 101, service_name: 'mysql-innodb-core', release_tag: 'v8.0.40', environment: 'production', status: 'ACTIVE', updated_at: '2026-11-19 08:00:00' },
          { id: 502, node_id: 102, service_name: 'mysql-read-replica', release_tag: 'v8.0.40', environment: 'production', status: 'ACTIVE', updated_at: '2026-11-19 08:05:12' },
          { id: 503, node_id: 103, service_name: 'nats-jetstream-bus', release_tag: 'v2.10.22', environment: 'production', status: 'ACTIVE', updated_at: '2026-11-19 09:40:18' },
          { id: 504, node_id: 104, service_name: 'llama-rpc-worker', release_tag: 'v1.9.3-rc2', environment: 'canary', status: 'ROLLING', updated_at: '2026-11-19 11:31:00' },
          { id: 505, node_id: 105, service_name: 'cold-snapshot-sync', release_tag: 'v1.4.1', environment: 'staging', status: 'FAILED', updated_at: '2026-11-19 12:10:44' }
        ],
        telemetry_logs: [
          { id: 9001, node_id: 101, metric_key: 'innodb_buffer_hit_pct', metric_value: 99.84, severity: 'INFO', notes: 'Buffer pool warmed; zero disk reads on PK index.', updated_at: '2026-11-19 14:10:00' },
          { id: 9002, node_id: 102, metric_key: 'replica_lag_seconds', metric_value: 0.02, severity: 'INFO', notes: 'Semi-sync replication nominal.', updated_at: '2026-11-19 14:11:15' },
          { id: 9003, node_id: 103, metric_key: 'nats_msg_throughput_sec', metric_value: 14820.50, severity: 'INFO', notes: 'Zero consumer backpressure.', updated_at: '2026-11-19 14:12:40' },
          { id: 9004, node_id: 104, metric_key: 'innodb_row_lock_waits', metric_value: 47.00, severity: 'WARN', notes: 'Contention spike during batch upsert.', updated_at: '2026-11-19 14:15:09' },
          { id: 9005, node_id: 105, metric_key: 'nvme_queue_depth', metric_value: 128.00, severity: 'CRITICAL', notes: 'Node draining prior to NVMe replacement.', updated_at: '2026-11-19 14:18:33' }
        ]
      };
    }

    /* ========================================================================
       MODULE 3: CENTRALIZED REACTIVE STORE (AppState)
       ======================================================================== */
    class Store extends EventTarget {
      constructor() {
        super();
        const saved = Utils.safeStorageGet();
        this.state = {
          route: 'overview',
          activeTable: 'nodes',
          search: '',
          statusFilter: 'ALL',
          sort: 'id:desc',
          pinnedOnly: false,
          pinnedRows: saved?.pinnedRows || ['nodes:101', 'deployments:501'],
          tables: saved?.tables || createSeedTables(),
          lastSql: 'SELECT * FROM nodes ORDER BY id DESC;',
          lastDeleted: null,
          sim: {
            table: 'nodes',
            predicate: 'composite',
            rows: 250000
          },
          prefs: {
            theme: saved?.prefs?.theme || 'dark',
            density: saved?.prefs?.density || 'comfortable',
            motion: saved?.prefs?.motion || 'full',
            audio: false
          }
        };
      }

      getState() {
        return this.state;
      }

      persist() {
        const ok = Utils.safeStorageSet({
          tables: this.state.tables,
          pinnedRows: this.state.pinnedRows,
          prefs: this.state.prefs
        });
        const statusEl = document.getElementById('footer-storage-status');
        if (statusEl) {
          statusEl.textContent = ok
            ? `Storage: Persisted (${Object.values(this.state.tables).reduce((a, b) => a + b.length, 0)} rows)`
            : 'Storage: Memory-only mode (localStorage restricted)';
        }
      }

      dispatch(action) {
        const s = this.state;
        switch (action.type) {
          case 'NAVIGATE':
            s.route = action.route;
            break;
          case 'SELECT_TABLE':
            s.activeTable = action.table;
            s.statusFilter = 'ALL';
            s.search = '';
            s.lastSql = `SELECT * FROM ${action.table} ORDER BY id DESC;`;
            break;
          case 'SET_FILTER':
            Object.assign(s, action.patch);
            break;
          case 'INSERT_ROW': {
            const list = s.tables[action.table];
            const nextId = list.length ? Math.max(...list.map(r => Number(r.id))) + 1 : 1;
            const row = { id: nextId, ...action.record, updated_at: Utils.nowSql() };
            s.tables[action.table] = [row, ...list];
            const cols = Object.keys(row).join(', ');
            const vals = Object.values(row).map(Utils.escapeSqlString).join(', ');
            s.lastSql = `INSERT INTO ${action.table} (${cols})\nVALUES (${vals});`;
            this.persist();
            break;
          }
          case 'UPDATE_ROW': {
            const list = s.tables[action.table];
            s.tables[action.table] = list.map(r =>
              r.id === action.id ? { ...r, ...action.record, updated_at: Utils.nowSql() } : r
            );
            const sets = Object.entries(action.record)
              .map(([k, v]) => `${k} = ${Utils.escapeSqlString(v)}`)
              .join(', ');
            s.lastSql = `UPDATE ${action.table}\nSET ${sets}, updated_at = NOW()\nWHERE id = ${Number(action.id)};`;
            this.persist();
            break;
          }
          case 'DELETE_ROW': {
            const list = s.tables[action.table];
            const target = list.find(r => r.id === action.id);
            if (!target) break;
            s.lastDeleted = { table: action.table, row: structuredClone(target) };
            s.tables[action.table] = list.filter(r => r.id !== action.id);
            // Cascade delete if deleting from nodes
            if (action.table === 'nodes') {
              s.tables.deployments = s.tables.deployments.filter(d => Number(d.node_id) !== Number(action.id));
              s.tables.telemetry_logs = s.tables.telemetry_logs.filter(t => Number(t.node_id) !== Number(action.id));
            }
            s.lastSql = `DELETE FROM ${action.table} WHERE id = ${Number(action.id)};`;
            this.persist();
            break;
          }
          case 'UNDO_DELETE': {
            if (!s.lastDeleted) break;
            const { table, row } = s.lastDeleted;
            s.tables[table] = [row, ...s.tables[table]];
            s.lastDeleted = null;
            s.lastSql = `-- ROLLBACK / RESTORE\nINSERT INTO ${table} (id, ...) VALUES (${row.id}, ...);`;
            this.persist();
            break;
          }
          case 'TOGGLE_PIN': {
            const key = `${action.table}:${action.id}`;
            const set = new Set(s.pinnedRows);
            if (set.has(key)) set.delete(key);
            else set.add(key);
            s.pinnedRows = [...set];
            this.persist();
            break;
          }
          case 'SET_SIM':
            s.sim = { ...s.sim, ...action.patch };
            break;
          case 'SET_PREF':
            s.prefs = { ...s.prefs, ...action.patch };
            this.persist();
            break;
          case 'REPLACE_ALL_TABLES':
            s.tables = action.tables;
            s.lastDeleted = null;
            s.lastSql = '-- Snapshot imported & committed';
            this.persist();
            break;
          case 'RESET_ALL':
            s.tables = createSeedTables();
            s.pinnedRows = ['nodes:101', 'deployments:501'];
            s.lastDeleted = null;
            s.lastSql = '-- Factory seed dataset restored';
            this.persist();
            break;
        }
        this.dispatchEvent(new CustomEvent('change', { detail: action }));
      }
    }

    const appStore = new Store();

    /* ========================================================================
       MODULE 4: WEB AUDIO TELEMETRY FEEDBACK (MUTED BY DEFAULT)
       ======================================================================== */
    const SoundFX = {
      ctx: null,
      ping(freq = 520, duration = 0.045) {
        if (!appStore.getState().prefs.audio) return;
        try {
          if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();
          }
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + duration);
        } catch {
          // Audio blocked or unsupported
        }
      }
    };

    /* ========================================================================
       MODULE 5: ACCESSIBILITY & ANNOUNCEMENTS
       ======================================================================== */
    function announce(message, urgent = false) {
      const target = document.getElementById(urgent ? 'live-alert' : 'live-status');
      if (!target) return;
      target.textContent = '';
      requestAnimationFrame(() => {
        target.textContent = message;
      });
    }

    /* ========================================================================
       MODULE 6: CLIENT-SIDE ROUTER (NAVIGATION API + HASH FALLBACK)
       ======================================================================== */
    const VALID_ROUTES = new Set(['overview', 'crud', 'explain', 'ddl', 'settings']);

    function parseHashRoute() {
      const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      return VALID_ROUTES.has(raw) ? raw : 'overview';
    }

    function navigateTo(route, push = true) {
      const target = VALID_ROUTES.has(route) ? route : 'overview';
      const applyUpdate = () => {
        appStore.dispatch({ type: 'NAVIGATE', route: target });
        if (push && window.location.hash !== `#/${target}`) {
          window.history.pushState({ route: target }, '', `#/${target}`);
        }
        document.title = `InnoDB Forge — ${target.toUpperCase()}`;
      };

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        appStore.getState().prefs.motion === 'reduced';

      if (document.startViewTransition && !reduced) {
        document.startViewTransition(applyUpdate);
      } else {
        applyUpdate();
      }
      SoundFX.ping(640, 0.035);
    }

    window.addEventListener('popstate', () => {
      navigateTo(parseHashRoute(), false);
    });

    /* ========================================================================
       MODULE 7: PROCEDURAL CANVAS VISUALIZER (INNODB BUFFER POOL & B+TREE)
       ======================================================================== */
    function initBufferCanvas() {
      const canvas = document.getElementById('buffer-canvas');
      if (!canvas || !canvas.getContext) return;
      const ctx = canvas.getContext('2d');
      let rafId = null;
      let isVisible = true;
      let tick = 0;

      const pages = Array.from({ length: 64 }, (_, i) => ({
        id: i,
        heat: (i * 19) % 100,
        dirty: i % 11 === 0
      }));

      function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function draw() {
        const width = canvas.parentElement.clientWidth;
        const height = canvas.parentElement.clientHeight;
        ctx.clearRect(0, 0, width, height);

        const cols = 16;
        const rows = 4;
        const pad = 14;
        const gap = 6;
        const cellW = (width - pad * 2 - gap * (cols - 1)) / cols;
        const cellH = (height - pad * 2 - gap * (rows - 1)) / rows;

        const state = appStore.getState();
        const totalRows = Object.values(state.tables).reduce((acc, t) => acc + t.length, 0);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const page = pages[idx];
            const pulse = Math.sin(tick * 0.04 + idx * 0.35) * 0.5 + 0.5;
            const x = pad + c * (cellW + gap);
            const y = pad + r * (cellH + gap);

            if (page.dirty) {
              ctx.fillStyle = `rgba(245, 166, 35, ${0.28 + pulse * 0.45})`;
            } else if (idx < totalRows * 2) {
              ctx.fillStyle = `rgba(56, 189, 248, ${0.25 + pulse * 0.45})`;
            } else {
              ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
            }

            ctx.beginPath();
            ctx.roundRect(x, y, Math.max(4, cellW), Math.max(4, cellH), 4);
            ctx.fill();
          }
        }
      }

      function loop() {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
          appStore.getState().prefs.motion === 'reduced';
        if (isVisible && !document.hidden) {
          tick += reduced ? 0 : 1;
          draw();
        }
        if (!reduced) {
          rafId = requestAnimationFrame(loop);
        }
      }

      const ro = new ResizeObserver(() => {
        resize();
        draw();
      });
      ro.observe(canvas.parentElement);

      const io = new IntersectionObserver((entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      });
      io.observe(canvas);

      resize();
      draw();
      loop();
    }

    /* ========================================================================
       MODULE 8: DOMAIN LOGIC — EXPLAIN PLAN & DDL GENERATOR
       ======================================================================== */
    function computeExplainPlan({ table, predicate, rows }) {
      const n = Number(rows);
      if (predicate === 'pk') {
        return {
          type: 'const',
          possible_keys: 'PRIMARY',
          key: 'PRIMARY',
          rows: 1,
          filtered: '100.00',
          extra: 'Using index',
          costUnits: 1.0,
          ioPages: 3
        };
      }
      if (predicate === 'composite') {
        const est = Math.max(1, Math.round(n * 0.012));
        return {
          type: 'ref',
          possible_keys: SCHEMA[table].indexes[2] || 'idx_composite',
          key: SCHEMA[table].indexes[2] || 'idx_composite',
          rows: est,
          filtered: '100.00',
          extra: 'Using where; Using index',
          costUnits: Number((est * 0.25 + 2.4).toFixed(1)),
          ioPages: Math.max(4, Math.ceil(est / 40))
        };
      }
      if (predicate === 'prefix_miss') {
        const est = Math.max(10, Math.round(n * 0.35));
        return {
          type: 'index',
          possible_keys: 'NULL',
          key: SCHEMA[table].indexes[2] || 'idx_secondary',
          rows: n,
          filtered: '35.00',
          extra: 'Using where; Using index (Full Index Scan)',
          costUnits: Number((n * 0.18).toFixed(1)),
          ioPages: Math.ceil(n / 90)
        };
      }
      return {
        type: 'ALL',
        possible_keys: 'NULL',
        key: 'NULL',
        rows: n,
        filtered: '11.11',
        extra: 'Using where (Full Clustered Table Scan)',
        costUnits: Number((n * 0.42).toFixed(1)),
        ioPages: Math.ceil(n / 32)
      };
    }

    function generateFullSqlDump(tables) {
      const header = [
        '-- ============================================================================',
        '-- InnoDB Forge — MySQL 8.0+ Schema & Transactional Seed Dump',
        `-- Generated: ${new Date().toISOString()}`,
        '-- ============================================================================',
        'SET NAMES utf8mb4;',
        'SET FOREIGN_KEY_CHECKS = 0;',
        ''
      ].join('\n');

      const ddl = `
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
`;

      const inserts = Object.entries(tables)
        .map(([tableName, rows]) => {
          if (!rows.length) return `-- Table ${tableName} has 0 rows\n`;
          const cols = Object.keys(rows[0]);
          const values = rows
            .map(r => `  (${cols.map(c => Utils.escapeSqlString(r[c])).join(', ')})`)
            .join(',\n');
          return `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES\n${values};\n`;
        })
        .join('\n');

      return `${header}${ddl}\n${inserts}\nSET FOREIGN_KEY_CHECKS = 1;\n`;
    }

    /* ========================================================================
       MODULE 9: RENDERERS (DOM SAFE, ZERO INNERHTML WITH USER INPUT)
       ======================================================================== */
    function renderOverview() {
      const state = appStore.getState();
      const totalRows = Object.values(state.tables).reduce((sum, list) => sum + list.length, 0);
      const onlineNodes = state.tables.nodes.filter(n => n.status === 'ONLINE').length;
      const totalCores = state.tables.nodes.reduce((sum, n) => sum + Number(n.vcpu_cores || 0), 0);

      const metrics = [
        { label: 'Total Relational Rows', value: Utils.formatNumber(totalRows), sub: 'Across 3 InnoDB tables' },
        { label: 'Online Cluster Nodes', value: `${onlineNodes} / ${state.tables.nodes.length}`, sub: `${totalCores} total vCPU cores` },
        { label: 'Pinned Bookmarks', value: Utils.formatNumber(state.pinnedRows.length), sub: 'Persisted in localStorage' },
        { label: 'InnoDB Page Size', value: '16 KiB', sub: 'utf8mb4_0900_ai_ci' }
      ];

      const deck = document.getElementById('overview-metrics');
      deck.replaceChildren(
        ...metrics.map(m =>
          Utils.el('article', { className: 'metric-card' }, [
            Utils.el('span', { className: 'metric-label', textContent: m.label }),
            Utils.el('strong', { className: 'metric-value', textContent: m.value }),
            Utils.el('span', { className: 'metric-sub', textContent: m.sub })
          ])
        )
      );

      const cards = Object.values(SCHEMA).map(tbl => {
        const count = state.tables[tbl.name].length;
        return Utils.el('article', { className: 'schema-card' }, [
          Utils.el('div', { className: 'flex-between' }, [
            Utils.el('h3', { className: 'mono', textContent: tbl.name }),
            Utils.el('span', { className: 'pill pill-ok', textContent: `${count} rows` })
          ]),
          Utils.el('p', { className: 'text-sm text-muted', textContent: tbl.description }),
          Utils.el('div', { className: 'flex-between' }, [
            Utils.el('span', { className: 'text-xs mono text-muted', textContent: tbl.indexes[0] }),
            Utils.el('button', {
              type: 'button',
              className: 'btn btn-sm btn-secondary',
              textContent: 'Open Table',
              dataset: { openTable: tbl.name }
            })
          ])
        ]);
      });

      document.getElementById('schema-topology-cards').replaceChildren(...cards);
    }

    function statusPill(val) {
      const str = String(val);
      if (['ONLINE', 'ACTIVE', 'INFO'].includes(str)) {
        return Utils.el('span', { className: 'pill pill-ok', textContent: `● ${str}` });
      }
      if (['DEGRADED', 'DRAINING', 'ROLLING', 'WARN'].includes(str)) {
        return Utils.el('span', { className: 'pill pill-warn', textContent: `▲ ${str}` });
      }
      return Utils.el('span', { className: 'pill pill-danger', textContent: `■ ${str}` });
    }

    function renderCrud() {
      const state = appStore.getState();
      const schema = SCHEMA[state.activeTable];
      const allRows = state.tables[state.activeTable];

      // Sidebar table list
      const listNodes = Object.values(SCHEMA).map(tbl => {
        const isSelected = tbl.name === state.activeTable;
        const btn = Utils.el('button', {
          type: 'button',
          className: 'table-btn',
          'aria-pressed': String(isSelected),
          dataset: { selectTable: tbl.name }
        }, [
          Utils.el('span', { className: 'mono', textContent: tbl.name }),
          Utils.el('span', { className: 'pill pill-ok', textContent: String(state.tables[tbl.name].length) })
        ]);
        return Utils.el('li', {}, [btn]);
      });
      document.getElementById('crud-table-list').replaceChildren(...listNodes);

      document.getElementById('pinned-count').textContent = String(state.pinnedRows.length);
      document.getElementById('crud-sql-preview').textContent = state.lastSql;
      document.getElementById('active-table-heading').textContent = schema.name;
      document.getElementById('active-table-desc').textContent = schema.description;

      const undoBtn = document.getElementById('undo-delete-btn');
      undoBtn.hidden = !state.lastDeleted;

      // Status filter options
      const statusCol = schema.columns.find(c => c.name === 'status' || c.name === 'severity');
      const statusSelect = document.getElementById('crud-status-filter');
      const opts = [Utils.el('option', { value: 'ALL', textContent: 'ALL STATES' })];
      if (statusCol) {
        for (const o of statusCol.options) {
          opts.push(Utils.el('option', { value: o, textContent: o }));
        }
      }
      statusSelect.replaceChildren(...opts);
      statusSelect.value = state.statusFilter;

      // Filter & Sort rows
      const query = state.search.trim().toLowerCase();
      const pinnedSet = new Set(state.pinnedRows);

      let filtered = allRows.filter(row => {
        if (state.pinnedOnly && !pinnedSet.has(`${state.activeTable}:${row.id}`)) return false;
        if (state.statusFilter !== 'ALL') {
          const rowState = row.status ?? row.severity;
          if (rowState !== state.statusFilter) return false;
        }
        if (query) {
          return Object.values(row).some(v => String(v).toLowerCase().includes(query));
        }
        return true;
      });

      const [sortField, sortDir] = state.sort.split(':');
      const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
      filtered.sort((a, b) => {
        const key = sortField === 'primary_label' ? schema.columns[1].name : sortField;
        const cmp = collator.compare(String(a[key] ?? ''), String(b[key] ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });

      // Table Header
      const headCells = [
        Utils.el('th', { textContent: 'Pin' }),
        ...schema.columns.map(c => Utils.el('th', { textContent: c.name })),
        Utils.el('th', { textContent: 'Actions' })
      ];
      document.getElementById('crud-thead').replaceChildren(Utils.el('tr', {}, headCells));

      // Table Body
      if (!filtered.length) {
        const emptyRow = Utils.el('tr', {}, [
          Utils.el('td', {
            colspan: String(schema.columns.length + 2),
            style: 'text-align: center; padding: 2rem; color: var(--fg-muted);',
            textContent: '0 rows match the current WHERE predicate. Clear filters or click "+ INSERT Row".'
          })
        ]);
        document.getElementById('crud-tbody').replaceChildren(emptyRow);
      } else {
        const bodyRows = filtered.map(row => {
          const isPinned = pinnedSet.has(`${state.activeTable}:${row.id}`);
          const pinBtn = Utils.el('button', {
            type: 'button',
            className: 'btn btn-sm',
            'aria-pressed': String(isPinned),
            'aria-label': `${isPinned ? 'Unpin' : 'Pin'} row ${row.id}`,
            textContent: isPinned ? '★' : '☆',
            dataset: { pinId: String(row.id) }
          });

          const cells = schema.columns.map(col => {
            const val = row[col.name];
            if (col.name === 'status' || col.name === 'severity') {
              return Utils.el('td', {}, [statusPill(val)]);
            }
            return Utils.el('td', {
              className: col.name === 'id' || col.name.includes('addr') || col.name === 'updated_at' ? 'mono' : '',
              textContent: val === null || val === undefined || val === '' ? 'NULL' : String(val)
            });
          });

          const actionCell = Utils.el('td', {}, [
            Utils.el('div', { className: 'flex-row', style: 'flex-wrap: nowrap;' }, [
              Utils.el('button', {
                type: 'button',
                className: 'btn btn-sm btn-secondary',
                textContent: 'Edit',
                dataset: { editId: String(row.id) }
              }),
              Utils.el('button', {
                type: 'button',
                className: 'btn btn-sm btn-danger',
                textContent: 'Delete',
                dataset: { deleteId: String(row.id) }
              })
            ])
          ]);

          return Utils.el('tr', { dataset: { selected: String(isPinned) } }, [
            Utils.el('td', {}, [pinBtn]),
            ...cells,
            actionCell
          ]);
        });
        document.getElementById('crud-tbody').replaceChildren(...bodyRows);
      }

      document.getElementById('crud-row-summary').textContent =
        `${filtered.length} of ${allRows.length} rows displayed from ${state.activeTable}`;
    }

    function renderExplain() {
      const { sim } = appStore.getState();
      document.getElementById('sim-table').value = sim.table;
      document.getElementById('sim-predicate').value = sim.predicate;
      document.getElementById('sim-rows').value = String(sim.rows);
      document.getElementById('sim-rows-label').textContent = Utils.formatNumber(sim.rows);

      const plan = computeExplainPlan(sim);

      const cards = [
        { label: 'Access Type', value: plan.type, sub: `Index: ${plan.key}` },
        { label: 'Rows Examined', value: Utils.formatNumber(plan.rows), sub: `Filtered: ${plan.filtered}%` },
        { label: 'Optimizer Cost', value: `${plan.costUnits} units`, sub: `~${Utils.formatNumber(plan.ioPages)} InnoDB pages` }
      ];

      document.getElementById('explain-metrics').replaceChildren(
        ...cards.map(c =>
          Utils.el('article', { className: 'metric-card' }, [
            Utils.el('span', { className: 'metric-label', textContent: c.label }),
            Utils.el('strong', { className: 'metric-value', textContent: c.value }),
            Utils.el('span', { className: 'metric-sub', textContent: c.sub })
          ])
        )
      );

      const row = Utils.el('tr', {}, [
        Utils.el('td', { textContent: '1' }),
        Utils.el('td', { textContent: 'SIMPLE' }),
        Utils.el('td', { textContent: sim.table }),
        Utils.el('td', {}, [
          statusPill(plan.type === 'ALL' ? 'CRITICAL' : plan.type === 'index' ? 'WARN' : 'ONLINE')
        ]),
        Utils.el('td', { textContent: plan.possible_keys }),
        Utils.el('td', { textContent: plan.key }),
        Utils.el('td', { textContent: Utils.formatNumber(plan.rows) }),
        Utils.el('td', { textContent: plan.filtered }),
        Utils.el('td', { textContent: plan.extra })
      ]);
      document.getElementById('explain-tbody').replaceChildren(row);
    }

    function renderDdl() {
      const dump = generateFullSqlDump(appStore.getState().tables);
      document.getElementById('full-ddl-output').textContent = dump;
    }

    function renderPrefs() {
      const { prefs } = appStore.getState();
      document.documentElement.dataset.theme = prefs.theme;
      document.documentElement.dataset.density = prefs.density;
      document.documentElement.dataset.motion = prefs.motion;

      document.getElementById('pref-theme').value = prefs.theme;
      document.getElementById('pref-density').value = prefs.density;
      document.getElementById('pref-motion').value = prefs.motion;

      const audioBtn = document.getElementById('sound-toggle');
      audioBtn.setAttribute('aria-pressed', String(prefs.audio));
      audioBtn.textContent = prefs.audio ? 'Audio: On' : 'Audio: Off';
    }

    function renderApp() {
      const state = appStore.getState();
      renderPrefs();

      // Update active nav & view visibility
      document.querySelectorAll('.nav-link[data-route]').forEach(link => {
        if (link.dataset.route === state.route) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });

      document.querySelectorAll('.view-panel').forEach(panel => {
        panel.hidden = panel.id !== `view-${state.route}`;
      });

      if (state.route === 'overview') renderOverview();
      if (state.route === 'crud') renderCrud();
      if (state.route === 'explain') renderExplain();
      if (state.route === 'ddl') renderDdl();
    }

    /* ========================================================================
       MODULE 10: MODAL CRUD EDITOR (<DIALOG>)
       ======================================================================== */
    const editorDialog = document.getElementById('row-editor-dialog');
    const editorForm = document.getElementById('row-editor-form');
    let editingContext = { mode: 'insert', table: 'nodes', id: null };

    function openRowEditor(mode, tableName, existingRow = null) {
      editingContext = { mode, table: tableName, id: existingRow?.id ?? null };
      const schema = SCHEMA[tableName];
      const state = appStore.getState();

      document.getElementById('dialog-title').textContent =
        mode === 'insert' ? `INSERT INTO ${tableName}` : `UPDATE ${tableName} WHERE id = ${existingRow.id}`;
      document.getElementById('dialog-error-box').hidden = true;

      const fields = schema.columns
        .filter(col => !col.readonly)
        .map(col => {
          const fieldId = `field-${col.name}`;
          const currentVal = existingRow ? existingRow[col.name] : '';
          let control;

          if (col.fkTable) {
            const parentRows = state.tables[col.fkTable];
            control = Utils.el('select', { id: fieldId, name: col.name, className: 'select', required: 'true' },
              parentRows.map(pr =>
                Utils.el('option', {
                  value: String(pr.id),
                  textContent: `#${pr.id} — ${pr.hostname}`
                })
              )
            );
            if (currentVal) control.value = String(currentVal);
          } else if (col.type === 'ENUM') {
            control = Utils.el('select', { id: fieldId, name: col.name, className: 'select', required: 'true' },
              col.options.map(opt => Utils.el('option', { value: opt, textContent: opt }))
            );
            if (currentVal) control.value = String(currentVal);
          } else if (col.type === 'TEXT') {
            control = Utils.el('textarea', {
              id: fieldId,
              name: col.name,
              className: 'textarea',
              placeholder: col.placeholder || '',
              textContent: String(currentVal ?? '')
            });
          } else {
            control = Utils.el('input', {
              id: fieldId,
              name: col.name,
              type: col.inputType || 'text',
              className: 'input',
              required: col.required ? 'true' : null,
              pattern: col.pattern || null,
              min: col.min ?? null,
              max: col.max ?? null,
              step: col.step ?? null,
              placeholder: col.placeholder || '',
              value: currentVal !== '' && currentVal !== undefined ? String(currentVal) : ''
            });
          }

          return Utils.el('div', { className: 'field-group' }, [
            Utils.el('label', { className: 'field-label', for: fieldId }, [
              Utils.el('span', { textContent: col.name }),
              Utils.el('span', { className: 'mono text-xs', textContent: col.type })
            ]),
            control
          ]);
        });

      document.getElementById('dialog-fields').replaceChildren(...fields);
      if (typeof editorDialog.showModal === 'function') {
        editorDialog.showModal();
      } else {
        editorDialog.setAttribute('open', '');
      }
      SoundFX.ping(720, 0.04);
    }

    editorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const errBox = document.getElementById('dialog-error-box');
      if (!editorForm.checkValidity()) {
        errBox.textContent = 'Constraint violation: Check required fields and format patterns.';
        errBox.hidden = false;
        announce('Form validation failed. Please review highlighted fields.', true);
        SoundFX.ping(220, 0.09);
        return;
      }

      const schema = SCHEMA[editingContext.table];
      const formData = new FormData(editorForm);
      const record = {};

      for (const col of schema.columns) {
        if (col.readonly) continue;
        const raw = formData.get(col.name);
        if (col.fkTable || col.inputType === 'number') {
          record[col.name] = Number(raw);
        } else {
          record[col.name] = String(raw ?? '').trim();
        }
      }

      // Unique hostname constraint check on nodes
      if (editingContext.table === 'nodes') {
        const duplicate = appStore.getState().tables.nodes.find(
          n => n.hostname === record.hostname && n.id !== editingContext.id
        );
        if (duplicate) {
          errBox.textContent = `ERROR 1062 (23000): Duplicate entry '${record.hostname}' for key 'nodes.uk_hostname'`;
          errBox.hidden = false;
          SoundFX.ping(220, 0.09);
          return;
        }
      }

      if (editingContext.mode === 'insert') {
        appStore.dispatch({ type: 'INSERT_ROW', table: editingContext.table, record });
        announce(`Inserted new row into ${editingContext.table}`);
      } else {
        appStore.dispatch({ type: 'UPDATE_ROW', table: editingContext.table, id: editingContext.id, record });
        announce(`Updated row ${editingContext.id} in ${editingContext.table}`);
      }

      SoundFX.ping(880, 0.05);
      editorDialog.close();
    });

    /* ========================================================================
       MODULE 11: PLATFORM CAPABILITY INSPECTOR
       ======================================================================== */
    function renderCapabilities() {
      const checks = [
        {
          name: 'View Transitions API',
          ok: typeof document.startViewTransition === 'function',
          desc: 'Smooth cross-fade morphing between SPA routes.'
        },
        {
          name: 'CSS Anchor Positioning',
          ok: CSS.supports('position-anchor: --a') && CSS.supports('position-area: bottom'),
          desc: 'Tethers this capability inspector popover to its button.'
        },
        {
          name: 'Scroll-Driven Animations',
          ok: CSS.supports('animation-timeline: scroll()'),
          desc: 'Drives the top reading progress gauge without JS scroll listeners.'
        },
        {
          name: 'Container Queries',
          ok: CSS.supports('container-type: inline-size'),
          desc: 'Adapts the CRUD sidebar and metric cards to container width.'
        },
        {
          name: 'CSS @scope & Nesting',
          ok: CSS.supports('selector(:scope)') && CSS.supports('selector(&)'),
          desc: 'Encapsulates metric deck styles natively without BEM bloat.'
        },
        {
          name: 'CSS :has() & field-sizing',
          ok: CSS.supports('selector(:has(*))') && CSS.supports('field-sizing: content'),
          desc: 'Parent validation styling and auto-growing SQL textareas.'
        },
        {
          name: 'Native Popover & <dialog>',
          ok: HTMLElement.prototype.hasOwnProperty('popover') && typeof HTMLDialogElement === 'function',
          desc: 'Top-layer modal CRUD forms and light-dismiss overlays.'
        },
        {
          name: 'Web Audio API',
          ok: Boolean(window.AudioContext || window.webkitAudioContext),
          desc: 'Synthesizes optional tactile feedback clicks on commit.'
        },
        {
          name: 'Clipboard & localStorage',
          ok: Boolean(navigator.clipboard) && Utils.safeStorageSet(Utils.safeStorageGet() || {}),
          desc: 'One-click SQL copying and persistent transactional state.'
        }
      ];

      const nodes = checks.map(c =>
        Utils.el('div', {
          style: 'padding: 0.55rem 0.7rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-inset);'
        }, [
          Utils.el('div', { className: 'flex-between' }, [
            Utils.el('strong', { className: 'text-xs', textContent: c.name }),
            Utils.el('span', {
              className: c.ok ? 'pill pill-ok' : 'pill pill-warn',
              textContent: c.ok ? 'ACTIVE' : 'FALLBACK'
            })
          ]),
          Utils.el('p', { className: 'text-xs text-muted', style: 'margin-top: 0.25rem;', textContent: c.desc })
        ])
      );

      document.getElementById('capability-list').replaceChildren(...nodes);
    }

    /* ========================================================================
       MODULE 12: EVENT WIRING & BOOTSTRAP
       ======================================================================== */
    function bindEvents() {
      appStore.addEventListener('change', renderApp);

      // Delegate navigation links
      document.addEventListener('click', (e) => {
        const routeLink = e.target.closest('[data-route]');
        if (routeLink) {
          e.preventDefault();
          navigateTo(routeLink.dataset.route);
          return;
        }

        const openTbl = e.target.closest('[data-open-table]');
        if (openTbl) {
          appStore.dispatch({ type: 'SELECT_TABLE', table: openTbl.dataset.openTable });
          navigateTo('crud');
          return;
        }

        const selTbl = e.target.closest('[data-select-table]');
        if (selTbl) {
          appStore.dispatch({ type: 'SELECT_TABLE', table: selTbl.dataset.selectTable });
          SoundFX.ping(540, 0.03);
          return;
        }

        const pinBtn = e.target.closest('[data-pin-id]');
        if (pinBtn) {
          appStore.dispatch({
            type: 'TOGGLE_PIN',
            table: appStore.getState().activeTable,
            id: Number(pinBtn.dataset.pinId)
          });
          SoundFX.ping(660, 0.03);
          return;
        }

        const editBtn = e.target.closest('[data-edit-id]');
        if (editBtn) {
          const table = appStore.getState().activeTable;
          const row = appStore.getState().tables[table].find(r => r.id === Number(editBtn.dataset.editId));
          if (row) openRowEditor('update', table, row);
          return;
        }

        const delBtn = e.target.closest('[data-delete-id]');
        if (delBtn) {
          const table = appStore.getState().activeTable;
          const id = Number(delBtn.dataset.deleteId);
          appStore.dispatch({ type: 'DELETE_ROW', table, id });
          announce(`Deleted row ${id} from ${table}. Undo available.`);
          SoundFX.ping(300, 0.07);
        }
      });

      // CRUD controls
      document.getElementById('new-row-btn').addEventListener('click', () => {
        openRowEditor('insert', appStore.getState().activeTable);
      });

      document.getElementById('undo-delete-btn').addEventListener('click', () => {
        appStore.dispatch({ type: 'UNDO_DELETE' });
        announce('Last deleted row restored.');
        SoundFX.ping(740, 0.05);
      });

      document.getElementById('crud-search').addEventListener('input', (e) => {
        appStore.dispatch({ type: 'SET_FILTER', patch: { search: e.target.value } });
      });

      document.getElementById('crud-status-filter').addEventListener('change', (e) => {
        appStore.dispatch({ type: 'SET_FILTER', patch: { statusFilter: e.target.value } });
      });

      document.getElementById('crud-sort').addEventListener('change', (e) => {
        appStore.dispatch({ type: 'SET_FILTER', patch: { sort: e.target.value } });
      });

      document.getElementById('filter-pinned-only').addEventListener('change', (e) => {
        appStore.dispatch({ type: 'SET_FILTER', patch: { pinnedOnly: e.target.checked } });
      });

      document.getElementById('copy-last-sql').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(appStore.getState().lastSql);
          announce('SQL statement copied to clipboard.');
        } catch {
          announce('Clipboard unavailable in this browser context.', true);
        }
      });

      // Dialog close buttons
      document.getElementById('dialog-close-btn').addEventListener('click', () => editorDialog.close());
      document.getElementById('dialog-cancel-btn').addEventListener('click', () => editorDialog.close());

      // EXPLAIN Lab controls
      document.getElementById('sim-table').addEventListener('change', (e) => {
        appStore.dispatch({ type: 'SET_SIM', patch: { table: e.target.value } });
      });
      document.getElementById('sim-predicate').addEventListener('change', (e) => {
        appStore.dispatch({ type: 'SET_SIM', patch: { predicate: e.target.value } });
      });
      document.getElementById('sim-rows').addEventListener('input', (e) => {
        appStore.dispatch({ type: 'SET_SIM', patch: { rows: Number(e.target.value) } });
      });
      document.getElementById('explain-reset-btn').addEventListener('click', () => {
        appStore.dispatch({ type: 'SET_SIM', patch: { table: 'nodes', predicate: 'composite', rows: 250000 } });
      });

      // DDL Copy & Download
      document.getElementById('copy-ddl-btn').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(generateFullSqlDump(appStore.getState().tables));
          announce('Full MySQL DDL and seed dump copied.');
        } catch {
          announce('Clipboard copy blocked.', true);
        }
      });

      document.getElementById('download-sql-btn').addEventListener('click', () => {
        const sql = generateFullSqlDump(appStore.getState().tables);
        const blob = new Blob([sql], { type: 'application/sql;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = Utils.el('a', { href: url, download: 'innodb_forge_dump.sql' });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        announce('Downloaded innodb_forge_dump.sql');
      });

      // System Preferences & JSON Import/Export
      document.getElementById('pref-theme').addEventListener('change', (e) => {
        appStore.dispatch({ type: 'SET_PREF', patch: { theme: e.target.value } });
      });
      document.getElementById('pref-density').addEventListener('change', (e) => {
        appStore.dispatch({ type: 'SET_PREF', patch: { density: e.target.value } });
      });
      document.getElementById('pref-motion').addEventListener('change', (e) => {
        appStore.dispatch({ type: 'SET_PREF', patch: { motion: e.target.value } });
      });
      document.getElementById('sound-toggle').addEventListener('click', () => {
        const next = !appStore.getState().prefs.audio;
        appStore.dispatch({ type: 'SET_PREF', patch: { audio: next } });
        if (next) SoundFX.ping(780, 0.05);
      });

      document.getElementById('export-json-btn').addEventListener('click', () => {
        const json = JSON.stringify(appStore.getState().tables, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = Utils.el('a', { href: url, download: 'innodb_forge_snapshot.json' });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        announce('Exported JSON database snapshot.');
      });

      document.getElementById('import-json-input').addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2_000_000) {
          announce('File exceeds 2 MB safety limit.', true);
          return;
        }
        try {
          const parsed = JSON.parse(await file.text());
          if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.deployments) || !Array.isArray(parsed.telemetry_logs)) {
            throw new Error('Invalid schema structure');
          }
          appStore.dispatch({ type: 'REPLACE_ALL_TABLES', tables: parsed });
          announce('Database snapshot imported successfully.');
        } catch {
          announce('Invalid JSON snapshot file.', true);
        } finally {
          e.target.value = '';
        }
      });

      const resetHandler = () => {
        appStore.dispatch({ type: 'RESET_ALL' });
        announce('Database restored to factory seed records.');
      };
      document.getElementById('hero-seed-btn').addEventListener('click', resetHandler);
      document.getElementById('factory-reset-btn').addEventListener('click', resetHandler);
    }

    // Boot Application


document.addEventListener('DOMContentLoaded', () => {
    renderCapabilities();
    bindEvents();
    initBufferCanvas();
    navigateTo(parseHashRoute(), false);
  DbController.index();
});

const DbConfig = {
  baseUrl: '/innodb'
};

const DbController = {
  storageKey: 'innodb_forge_state_v1',
  validRoutes: new Set(['overview', 'crud', 'explain', 'ddl', 'settings']),
  editorDialog: null,
  editorForm: null,
  editingContext: { mode: 'insert', table: 'nodes', id: null },
  soundCtx: null,

  schema: {
    nodes: {
      name: 'nodes',
      engine: 'InnoDB',
      pk: 'id',
      description: 'Bare-metal and VM compute hosts managed by the orchestration control plane.',
      indexes: ['PRIMARY KEY (id)', 'UNIQUE KEY uk_hostname (hostname)', 'KEY idx_region_status (region, status)'],
      columns: [
        { name: 'id', type: 'BIGINT UNSIGNED', readonly: true },
        { name: 'hostname', type: 'VARCHAR(64)', required: true, pattern: '^[a-z0-9.-]{3,64}$', placeholder: 'e.g. man-edge-01.internal' },
        { name: 'ipv4_addr', type: 'VARCHAR(15)', required: true, pattern: '^(\\d{1,3}\\.){3}\\d{1,3}$', placeholder: '10.24.18.101' },
        { name: 'region', type: 'ENUM', options: ['uk-manchester', 'uk-london', 'eu-frankfurt', 'us-east'], required: true },
        { name: 'vcpu_cores', type: 'SMALLINT UNSIGNED', inputType: 'number', min: 1, max: 256, required: true },
        { name: 'status', type: 'ENUM', options: ['ONLINE', 'DEGRADED', 'DRAINING', 'OFFLINE'], required: true },
        { name: 'updated_at', type: 'TIMESTAMP', readonly: true }
      ]
    },
    deployments: {
      name: 'deployments',
      engine: 'InnoDB',
      pk: 'id',
      description: 'Service releases bound via foreign key (node_id -> nodes.id ON DELETE CASCADE).',
      indexes: ['PRIMARY KEY (id)', 'KEY fk_deploy_node (node_id)', 'KEY idx_env_status (environment, status)'],
      columns: [
        { name: 'id', type: 'BIGINT UNSIGNED', readonly: true },
        { name: 'node_id', type: 'BIGINT UNSIGNED (FK)', fkTable: 'nodes', required: true },
        { name: 'service_name', type: 'VARCHAR(64)', required: true, pattern: '^[a-z0-9_-]{2,64}$', placeholder: 'nats-broker-core' },
        { name: 'release_tag', type: 'VARCHAR(32)', required: true, placeholder: 'v2.14.0' },
        { name: 'environment', type: 'ENUM', options: ['production', 'staging', 'canary'], required: true },
        { name: 'status', type: 'ENUM', options: ['ACTIVE', 'ROLLING', 'FAILED', 'ROLLED_BACK'], required: true },
        { name: 'updated_at', type: 'TIMESTAMP', readonly: true }
      ]
    },
    telemetry_logs: {
      name: 'telemetry_logs',
      engine: 'InnoDB',
      pk: 'id',
      description: 'Append-heavy InnoDB buffer pool, IOPS, and replication lag samples per host.',
      indexes: ['PRIMARY KEY (id)', 'KEY idx_node_severity (node_id, severity)'],
      columns: [
        { name: 'id', type: 'BIGINT UNSIGNED', readonly: true },
        { name: 'node_id', type: 'BIGINT UNSIGNED (FK)', fkTable: 'nodes', required: true },
        { name: 'metric_key', type: 'VARCHAR(48)', required: true, placeholder: 'innodb_buffer_hit_pct' },
        { name: 'metric_value', type: 'DECIMAL(10,2)', inputType: 'number', step: '0.01', required: true },
        { name: 'severity', type: 'ENUM', options: ['INFO', 'WARN', 'CRITICAL'], required: true },
        { name: 'notes', type: 'TEXT', required: false, placeholder: 'Observation notes...' },
        { name: 'updated_at', type: 'TIMESTAMP', readonly: true }
      ]
    }
  },

  state: {
    route: 'overview',
    activeTable: 'nodes',
    search: '',
    statusFilter: 'ALL',
    sort: 'id:desc',
    pinnedOnly: false,
    pinnedRows: ['nodes:101', 'deployments:501'],
    tables: { nodes: [], deployments: [], telemetry_logs: [] },
    lastSql: 'SELECT * FROM nodes ORDER BY id DESC;',
    lastDeleted: null,
    explainPlan: null,
    ddlDump: '',
    sim: {
      table: 'nodes',
      predicate: 'composite',
      rows: 250000
    },
    prefs: {
      theme: 'dark',
      density: 'comfortable',
      motion: 'full',
      audio: false
    }
  },

  /* ----------------------------------------------------------------------
     BOOTSTRAP & BACKEND DELEGATION (InnodbController)
     ---------------------------------------------------------------------- */
  async index() {
    this.hydrateLocalPrefs();
    this.editorDialog = app.el('row-editor-dialog');
    this.editorForm = app.el('row-editor-form');

    this.bindEvents();
    this.renderCapabilities();
    this.initBufferCanvas();
    this.navigateTo(this.parseHashRoute(), false);

    await this.syncFromServer();
  },

  async apiPost(endpoint, payload = {}) {
    const res = await fetch(`${DbConfig.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    return data;
  },

  async syncFromServer() {
    try {
      const data = await app.get('innodb');
      if (data?.schema) this.schema = data.schema;
      if (data?.tables) this.state.tables = data.tables;
      this.persistUiPrefs();
      this.renderApp();
    } catch (err) {
      console.error('Failed to load InnoDB tables:', err);
      this.announce('Unable to reach InnodbController backend.', true);
    }
  },

  /* ----------------------------------------------------------------------
     UTILITIES, AUDIO, ACCESSIBILITY & ROUTER
     ---------------------------------------------------------------------- */
  formatNumber(num) {
    return new Intl.NumberFormat('en-GB').format(num);
  },

  hydrateLocalPrefs() {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.pinnedRows)) this.state.pinnedRows = saved.pinnedRows;
      if (saved.prefs) this.state.prefs = { ...this.state.prefs, ...saved.prefs };
    } catch {
      // Ignore storage access restrictions
    }
  },

  persistUiPrefs() {
    let ok = false;
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify({
        pinnedRows: this.state.pinnedRows,
        prefs: this.state.prefs
      }));
      ok = true;
    } catch {
      ok = false;
    }

    const statusEl = app.el('footer-storage-status');
    if (statusEl) {
      const totalRows = Object.values(this.state.tables).reduce((a, b) => a + b.length, 0);
      statusEl.textContent = ok
        ? `Storage: InnoDB Synced (${totalRows} rows) · Prefs Persisted`
        : 'Storage: InnoDB Synced · Prefs Memory-Only';
    }
  },

  ping(freq = 520, duration = 0.045) {
    if (!this.state.prefs.audio) return;
    try {
      if (!this.soundCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.soundCtx = new AudioCtx();
      }
      const osc = this.soundCtx.createOscillator();
      const gain = this.soundCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, this.soundCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.soundCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.soundCtx.destination);
      osc.start();
      osc.stop(this.soundCtx.currentTime + duration);
    } catch {
      // Audio blocked or unsupported
    }
  },

  announce(message, urgent = false) {
    const target = app.el(urgent ? 'live-alert' : 'live-status');
    if (!target) return;
    target.textContent = '';
    requestAnimationFrame(() => {
      target.textContent = message;
    });
  },

  parseHashRoute() {
    const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    return this.validRoutes.has(raw) ? raw : 'overview';
  },

  navigateTo(route, push = true) {
    const target = this.validRoutes.has(route) ? route : 'overview';
    const applyUpdate = () => {
      this.state.route = target;
      if (push && window.location.hash !== `#/${target}`) {
        window.history.pushState({ route: target }, '', `#/${target}`);
      }
      document.title = `InnoDB Forge — ${target.toUpperCase()}`;
      this.renderApp();
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      this.state.prefs.motion === 'reduced';

    if (document.startViewTransition && !reduced) {
      document.startViewTransition(applyUpdate);
    } else {
      applyUpdate();
    }
    this.ping(640, 0.035);
  },

  /* ----------------------------------------------------------------------
     PROCEDURAL CANVAS VISUALIZER (INNODB BUFFER POOL & B+TREE)
     ---------------------------------------------------------------------- */
  initBufferCanvas() {
    const canvas = app.el('buffer-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    let isVisible = true;
    let tick = 0;

    const pages = Array.from({ length: 64 }, (_, i) => ({
      id: i,
      dirty: i % 11 === 0
    }));

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const width = canvas.parentElement.clientWidth;
      const height = canvas.parentElement.clientHeight;
      ctx.clearRect(0, 0, width, height);

      const cols = 16;
      const rows = 4;
      const pad = 14;
      const gap = 6;
      const cellW = (width - pad * 2 - gap * (cols - 1)) / cols;
      const cellH = (height - pad * 2 - gap * (rows - 1)) / rows;
      const totalRows = Object.values(this.state.tables).reduce((acc, t) => acc + t.length, 0);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const page = pages[idx];
          const pulse = Math.sin(tick * 0.04 + idx * 0.35) * 0.5 + 0.5;
          const x = pad + c * (cellW + gap);
          const y = pad + r * (cellH + gap);

          if (page.dirty) {
            ctx.fillStyle = `rgba(245, 166, 35, ${0.28 + pulse * 0.45})`;
          } else if (idx < totalRows * 2) {
            ctx.fillStyle = `rgba(56, 189, 248, ${0.25 + pulse * 0.45})`;
          } else {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
          }

          ctx.beginPath();
          ctx.roundRect(x, y, Math.max(4, cellW), Math.max(4, cellH), 4);
          ctx.fill();
        }
      }
    };

    const loop = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        this.state.prefs.motion === 'reduced';
      if (isVisible && !document.hidden) {
        tick += reduced ? 0 : 1;
        draw();
      }
      if (!reduced) {
        requestAnimationFrame(loop);
      }
    };

    new ResizeObserver(() => { resize(); draw(); }).observe(canvas.parentElement);
    new IntersectionObserver((entries) => { isVisible = entries[0]?.isIntersecting ?? true; }).observe(canvas);

    resize();
    draw();
    loop();
  },

  /* ----------------------------------------------------------------------
     RENDERERS (DOM SAFE, ZERO INNERHTML WITH USER INPUT)
     ---------------------------------------------------------------------- */
  statusPill(val) {
    const str = String(val);
    if (['ONLINE', 'ACTIVE', 'INFO'].includes(str)) {
      return app.item('span', 'pill pill-ok', `● ${str}`);
    }
    if (['DEGRADED', 'DRAINING', 'ROLLING', 'WARN'].includes(str)) {
      return app.item('span', 'pill pill-warn', `▲ ${str}`);
    }
    return app.item('span', 'pill pill-danger', `■ ${str}`);
  },

  renderOverview() {
    const totalRows = Object.values(this.state.tables).reduce((sum, list) => sum + list.length, 0);
    const onlineNodes = (this.state.tables.nodes || []).filter(n => n.status === 'ONLINE').length;
    const totalCores = (this.state.tables.nodes || []).reduce((sum, n) => sum + Number(n.vcpu_cores || 0), 0);

    const metrics = [
      { label: 'Total Relational Rows', value: this.formatNumber(totalRows), sub: 'Across 3 InnoDB tables' },
      { label: 'Online Cluster Nodes', value: `${onlineNodes} / ${(this.state.tables.nodes || []).length}`, sub: `${totalCores} total vCPU cores` },
      { label: 'Pinned Bookmarks', value: this.formatNumber(this.state.pinnedRows.length), sub: 'Persisted preferences' },
      { label: 'InnoDB Page Size', value: '16 KiB', sub: 'utf8mb4_0900_ai_ci' }
    ];

    const deck = app.el('overview-metrics');
    if (deck) {
      deck.replaceChildren(...metrics.map(m => {
        const card = app.item('article', 'metric-card');
        card.append(
          app.item('span', 'metric-label', m.label),
          app.item('strong', 'metric-value', m.value),
          app.item('span', 'metric-sub', m.sub)
        );
        return card;
      }));
    }

    const cardsContainer = app.el('schema-topology-cards');
    if (cardsContainer) {
      const cards = Object.values(this.schema).map(tbl => {
        const count = (this.state.tables[tbl.name] || []).length;
        const card = app.item('article', 'schema-card');
        const top = app.item('div', 'flex-between');
        top.append(
          app.item('h3', 'mono', tbl.name),
          app.item('span', 'pill pill-ok', `${count} rows`)
        );

        const openBtn = app.item('button', 'btn btn-sm btn-secondary', 'Open Table');
        openBtn.type = 'button';
        openBtn.dataset.openTable = tbl.name;

        const bottom = app.item('div', 'flex-between');
        bottom.append(app.item('span', 'text-xs mono text-muted', tbl.indexes[0]), openBtn);

        card.append(top, app.item('p', 'text-sm text-muted', tbl.description), bottom);
        return card;
      });
      cardsContainer.replaceChildren(...cards);
    }
  },

  renderCrud() {
    const schema = this.schema[this.state.activeTable];
    if (!schema) return;
    const allRows = this.state.tables[this.state.activeTable] || [];

    const tableListEl = app.el('crud-table-list');
    if (tableListEl) {
      const listNodes = Object.values(this.schema).map(tbl => {
        const isSelected = tbl.name === this.state.activeTable;
        const btn = app.item('button', 'table-btn');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', String(isSelected));
        btn.dataset.selectTable = tbl.name;
        btn.append(
          app.item('span', 'mono', tbl.name),
          app.item('span', 'pill pill-ok', String((this.state.tables[tbl.name] || []).length))
        );
        const li = app.item('li');
        li.append(btn);
        return li;
      });
      tableListEl.replaceChildren(...listNodes);
    }

    if (app.el('pinned-count')) app.el('pinned-count').textContent = String(this.state.pinnedRows.length);
    if (app.el('crud-sql-preview')) app.el('crud-sql-preview').textContent = this.state.lastSql;
    if (app.el('active-table-heading')) app.el('active-table-heading').textContent = schema.name;
    if (app.el('active-table-desc')) app.el('active-table-desc').textContent = schema.description;
    if (app.el('undo-delete-btn')) app.el('undo-delete-btn').hidden = !this.state.lastDeleted;

    const statusCol = schema.columns.find(c => c.name === 'status' || c.name === 'severity');
    const statusSelect = app.el('crud-status-filter');
    if (statusSelect) {
      const allOpt = app.item('option', '', 'ALL STATES');
      allOpt.value = 'ALL';
      const opts = [allOpt];
      if (statusCol?.options) {
        for (const o of statusCol.options) {
          const optEl = app.item('option', '', o);
          optEl.value = o;
          opts.push(optEl);
        }
      }
      statusSelect.replaceChildren(...opts);
      statusSelect.value = this.state.statusFilter;
    }

    const query = this.state.search.trim().toLowerCase();
    const pinnedSet = new Set(this.state.pinnedRows);

    const filtered = allRows.filter(row => {
      if (this.state.pinnedOnly && !pinnedSet.has(`${this.state.activeTable}:${row.id}`)) return false;
      if (this.state.statusFilter !== 'ALL') {
        const rowState = row.status ?? row.severity;
        if (rowState !== this.state.statusFilter) return false;
      }
      if (query) {
        return Object.values(row).some(v => String(v).toLowerCase().includes(query));
      }
      return true;
    });

    const [sortField, sortDir] = this.state.sort.split(':');
    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    filtered.sort((a, b) => {
      const key = sortField === 'primary_label' ? schema.columns[1].name : sortField;
      const cmp = collator.compare(String(a[key] ?? ''), String(b[key] ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    const thead = app.el('crud-thead');
    if (thead) {
      const tr = app.item('tr');
      tr.append(app.item('th', '', 'Pin'));
      schema.columns.forEach(c => tr.append(app.item('th', '', c.name)));
      tr.append(app.item('th', '', 'Actions'));
      thead.replaceChildren(tr);
    }

    const tbody = app.el('crud-tbody');
    if (tbody) {
      if (!filtered.length) {
        const emptyTd = app.item('td', '', '0 rows match the current WHERE predicate. Clear filters or click "+ INSERT Row".');
        emptyTd.colSpan = schema.columns.length + 2;
        emptyTd.style.cssText = 'text-align: center; padding: 2rem; color: var(--fg-muted);';
        const emptyTr = app.item('tr');
        emptyTr.append(emptyTd);
        tbody.replaceChildren(emptyTr);
      } else {
        const bodyRows = filtered.map(row => {
          const isPinned = pinnedSet.has(`${this.state.activeTable}:${row.id}`);
          const pinBtn = app.item('button', 'btn btn-sm', isPinned ? '★' : '☆');
          pinBtn.type = 'button';
          pinBtn.setAttribute('aria-pressed', String(isPinned));
          pinBtn.setAttribute('aria-label', `${isPinned ? 'Unpin' : 'Pin'} row ${row.id}`);
          pinBtn.dataset.pinId = String(row.id);

          const pinTd = app.item('td');
          pinTd.append(pinBtn);

          const dataTds = schema.columns.map(col => {
            const val = row[col.name];
            const td = app.item('td');
            if (col.name === 'status' || col.name === 'severity') {
              td.append(this.statusPill(val));
            } else {
              if (col.name === 'id' || col.name.includes('addr') || col.name === 'updated_at') {
                td.className = 'mono';
              }
              td.textContent = val === null || val === undefined || val === '' ? 'NULL' : String(val);
            }
            return td;
          });

          const editBtn = app.item('button', 'btn btn-sm btn-secondary', 'Edit');
          editBtn.type = 'button';
          editBtn.dataset.editId = String(row.id);

          const delBtn = app.item('button', 'btn btn-sm btn-danger', 'Delete');
          delBtn.type = 'button';
          delBtn.dataset.deleteId = String(row.id);

          const actionGroup = app.item('div', 'flex-row');
          actionGroup.style.flexWrap = 'nowrap';
          actionGroup.append(editBtn, delBtn);

          const actionTd = app.item('td');
          actionTd.append(actionGroup);

          const tr = app.item('tr');
          tr.dataset.selected = String(isPinned);
          tr.append(pinTd, ...dataTds, actionTd);
          return tr;
        });
        tbody.replaceChildren(...bodyRows);
      }
    }

    if (app.el('crud-row-summary')) {
      app.el('crud-row-summary').textContent =
        `${filtered.length} of ${allRows.length} rows displayed from ${this.state.activeTable}`;
    }
  },

  async renderExplain() {
    const { sim } = this.state;
    if (app.el('sim-table')) app.el('sim-table').value = sim.table;
    if (app.el('sim-predicate')) app.el('sim-predicate').value = sim.predicate;
    if (app.el('sim-rows')) app.el('sim-rows').value = String(sim.rows);
    if (app.el('sim-rows-label')) app.el('sim-rows-label').textContent = this.formatNumber(sim.rows);

    try {
      const res = await this.apiPost('explain', sim);
      this.state.explainPlan = res.plan;
    } catch {
      return;
    }

    const plan = this.state.explainPlan;
    const cards = [
      { label: 'Access Type', value: plan.type, sub: `Index: ${plan.key}` },
      { label: 'Rows Examined', value: this.formatNumber(plan.rows), sub: `Filtered: ${plan.filtered}%` },
      { label: 'Optimizer Cost', value: `${plan.costUnits} units`, sub: `~${this.formatNumber(plan.ioPages)} InnoDB pages` }
    ];

    const metricsEl = app.el('explain-metrics');
    if (metricsEl) {
      metricsEl.replaceChildren(...cards.map(c => {
        const card = app.item('article', 'metric-card');
        card.append(
          app.item('span', 'metric-label', c.label),
          app.item('strong', 'metric-value', c.value),
          app.item('span', 'metric-sub', c.sub)
        );
        return card;
      }));
    }

    const tbody = app.el('explain-tbody');
    if (tbody) {
      const tr = app.item('tr');
      const statusTd = app.item('td');
      statusTd.append(this.statusPill(plan.type === 'ALL' ? 'CRITICAL' : plan.type === 'index' ? 'WARN' : 'ONLINE'));

      tr.append(
        app.item('td', '', '1'),
        app.item('td', '', 'SIMPLE'),
        app.item('td', '', sim.table),
        statusTd,
        app.item('td', '', plan.possible_keys),
        app.item('td', '', plan.key),
        app.item('td', '', this.formatNumber(plan.rows)),
        app.item('td', '', String(plan.filtered)),
        app.item('td', '', plan.extra)
      );
      tbody.replaceChildren(tr);
    }
  },

  async renderDdl() {
    try {
      const res = await this.apiPost('dump', { tables: this.state.tables });
      this.state.ddlDump = res.sql || '';
      if (app.el('full-ddl-output')) {
        app.el('full-ddl-output').textContent = this.state.ddlDump;
      }
    } catch (err) {
      console.error('Failed to generate DDL dump:', err);
    }
  },

  renderPrefs() {
    const { prefs } = this.state;
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.density = prefs.density;
    document.documentElement.dataset.motion = prefs.motion;

    if (app.el('pref-theme')) app.el('pref-theme').value = prefs.theme;
    if (app.el('pref-density')) app.el('pref-density').value = prefs.density;
    if (app.el('pref-motion')) app.el('pref-motion').value = prefs.motion;

    const audioBtn = app.el('sound-toggle');
    if (audioBtn) {
      audioBtn.setAttribute('aria-pressed', String(prefs.audio));
      audioBtn.textContent = prefs.audio ? 'Audio: On' : 'Audio: Off';
    }
  },

  renderApp() {
    this.renderPrefs();

    document.querySelectorAll('.nav-link[data-route]').forEach(link => {
      if (link.dataset.route === this.state.route) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.hidden = panel.id !== `view-${this.state.route}`;
    });

    if (this.state.route === 'overview') this.renderOverview();
    if (this.state.route === 'crud') this.renderCrud();
    if (this.state.route === 'explain') this.renderExplain();
    if (this.state.route === 'ddl') this.renderDdl();
  },

  /* ----------------------------------------------------------------------
     MODAL CRUD EDITOR & SERVER MUTATIONS
     ---------------------------------------------------------------------- */
  openRowEditor(mode, tableName, existingRow = null) {
    this.editingContext = { mode, table: tableName, id: existingRow?.id ?? null };
    const schema = this.schema[tableName];
    if (!schema || !this.editorDialog) return;

    if (app.el('dialog-title')) {
      app.el('dialog-title').textContent = mode === 'insert'
        ? `INSERT INTO ${tableName}`
        : `UPDATE ${tableName} WHERE id = ${existingRow.id}`;
    }
    if (app.el('dialog-error-box')) app.el('dialog-error-box').hidden = true;

    const fields = schema.columns.filter(col => !col.readonly).map(col => {
      const fieldId = `field-${col.name}`;
      const currentVal = existingRow ? existingRow[col.name] : '';
      let control;

      if (col.fkTable) {
        control = app.item('select', 'select');
        control.id = fieldId;
        control.name = col.name;
        control.required = true;
        (this.state.tables[col.fkTable] || []).forEach(pr => {
          const opt = app.item('option', '', `#${pr.id} — ${pr.hostname}`);
          opt.value = String(pr.id);
          control.append(opt);
        });
        if (currentVal) control.value = String(currentVal);
      } else if (col.type === 'ENUM') {
        control = app.item('select', 'select');
        control.id = fieldId;
        control.name = col.name;
        control.required = true;
        (col.options || []).forEach(o => {
          const opt = app.item('option', '', o);
          opt.value = o;
          control.append(opt);
        });
        if (currentVal) control.value = String(currentVal);
      } else if (col.type === 'TEXT') {
        control = app.item('textarea', 'textarea', String(currentVal ?? ''));
        control.id = fieldId;
        control.name = col.name;
        control.placeholder = col.placeholder || '';
      } else {
        control = app.item('input', 'input');
        control.id = fieldId;
        control.name = col.name;
        control.type = col.inputType || 'text';
        if (col.required) control.required = true;
        if (col.pattern) control.pattern = col.pattern;
        if (col.min !== undefined) control.min = String(col.min);
        if (col.max !== undefined) control.max = String(col.max);
        if (col.step !== undefined) control.step = String(col.step);
        if (col.placeholder) control.placeholder = col.placeholder;
        if (currentVal !== '' && currentVal !== undefined) control.value = String(currentVal);
      }

      const label = app.item('label', 'field-label');
      label.htmlFor = fieldId;
      label.append(app.item('span', '', col.name), app.item('span', 'mono text-xs', col.type));

      const group = app.item('div', 'field-group');
      group.append(label, control);
      return group;
    });

    if (app.el('dialog-fields')) app.el('dialog-fields').replaceChildren(...fields);
    if (typeof this.editorDialog.showModal === 'function') this.editorDialog.showModal();
    else this.editorDialog.setAttribute('open', '');
    this.ping(720, 0.04);
  },

  async handleEditorSubmit(e) {
    e.preventDefault();
    const errBox = app.el('dialog-error-box');
    if (!this.editorForm.checkValidity()) {
      if (errBox) {
        errBox.textContent = 'Constraint violation: Check required fields and format patterns.';
        errBox.hidden = false;
      }
      this.announce('Form validation failed. Please review highlighted fields.', true);
      this.ping(220, 0.09);
      return;
    }

    const schema = this.schema[this.editingContext.table];
    const formData = new FormData(this.editorForm);
    const record = {};

    for (const col of schema.columns) {
      if (col.readonly) continue;
      const raw = formData.get(col.name);
      record[col.name] = (col.fkTable || col.inputType === 'number')
        ? Number(raw)
        : String(raw ?? '').trim();
    }

    try {
      if (this.editingContext.mode === 'insert') {
        const res = await this.apiPost('insert', { table: this.editingContext.table, record });
        if (res.sql) this.state.lastSql = res.sql;
        await this.syncFromServer();
        this.announce(`Inserted new row into ${this.editingContext.table}`);
      } else {
        const res = await this.apiPost('update', {
          table: this.editingContext.table,
          id: this.editingContext.id,
          record
        });
        if (res.sql) this.state.lastSql = res.sql;
        await this.syncFromServer();
        this.announce(`Updated row ${this.editingContext.id} in ${this.editingContext.table}`);
      }

      this.ping(880, 0.05);
      this.editorDialog.close();
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
      this.announce(err.message, true);
      this.ping(220, 0.09);
    }
  },

  renderCapabilities() {
    const list = app.el('capability-list');
    if (!list) return;

    const checks = [
      { name: 'View Transitions API', ok: typeof document.startViewTransition === 'function', desc: 'Smooth cross-fade morphing between SPA routes.' },
      { name: 'CSS Anchor Positioning', ok: CSS.supports('position-anchor: --a') && CSS.supports('position-area: bottom'), desc: 'Tethers capability inspector popover to its button.' },
      { name: 'Scroll-Driven Animations', ok: CSS.supports('animation-timeline: scroll()'), desc: 'Drives reading progress gauge without JS scroll listeners.' },
      { name: 'Container Queries', ok: CSS.supports('container-type: inline-size'), desc: 'Adapts CRUD sidebar and metric cards to container width.' },
      { name: 'CSS @scope & Nesting', ok: CSS.supports('selector(:scope)') && CSS.supports('selector(&)'), desc: 'Encapsulates metric deck styles natively.' },
      { name: 'CSS :has() & field-sizing', ok: CSS.supports('selector(:has(*))') && CSS.supports('field-sizing: content'), desc: 'Parent validation styling and auto-sizing SQL textareas.' },
      { name: 'Native Popover & <dialog>', ok: HTMLElement.prototype.hasOwnProperty('popover') && typeof HTMLDialogElement === 'function', desc: 'Top-layer modal CRUD forms and light-dismiss overlays.' },
      { name: 'Web Audio API', ok: Boolean(window.AudioContext || window.webkitAudioContext), desc: 'Optional tactile feedback clicks on commit.' },
      { name: 'Clipboard & localStorage', ok: Boolean(navigator.clipboard), desc: 'One-click SQL copying and persistent UI preferences.' }
    ];

    list.replaceChildren(...checks.map(c => {
      const box = app.item('div');
      box.style.cssText = 'padding: 0.55rem 0.7rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-inset);';
      const top = app.item('div', 'flex-between');
      top.append(
        app.item('strong', 'text-xs', c.name),
        app.item('span', c.ok ? 'pill pill-ok' : 'pill pill-warn', c.ok ? 'ACTIVE' : 'FALLBACK')
      );
      box.append(top, app.item('p', 'text-xs text-muted', c.desc));
      return box;
    }));
  },

  /* ----------------------------------------------------------------------
     EVENT BINDING
     ---------------------------------------------------------------------- */
  bindEvents() {
    window.addEventListener('popstate', () => this.navigateTo(this.parseHashRoute(), false));

    document.addEventListener('click', async (e) => {
      const routeLink = e.target.closest('[data-route]');
      if (routeLink) {
        e.preventDefault();
        this.navigateTo(routeLink.dataset.route);
        return;
      }

      const openTbl = e.target.closest('[data-open-table]');
      if (openTbl) {
        this.state.activeTable = openTbl.dataset.openTable;
        this.state.statusFilter = 'ALL';
        this.state.search = '';
        this.state.lastSql = `SELECT * FROM ${this.state.activeTable} ORDER BY id DESC;`;
        this.navigateTo('crud');
        return;
      }

      const selTbl = e.target.closest('[data-select-table]');
      if (selTbl) {
        this.state.activeTable = selTbl.dataset.selectTable;
        this.state.statusFilter = 'ALL';
        this.state.search = '';
        this.state.lastSql = `SELECT * FROM ${this.state.activeTable} ORDER BY id DESC;`;
        this.ping(540, 0.03);
        this.renderCrud();
        return;
      }

      const pinBtn = e.target.closest('[data-pin-id]');
      if (pinBtn) {
        const key = `${this.state.activeTable}:${Number(pinBtn.dataset.pinId)}`;
        const set = new Set(this.state.pinnedRows);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        this.state.pinnedRows = [...set];
        this.persistUiPrefs();
        this.ping(660, 0.03);
        this.renderCrud();
        return;
      }

      const editBtn = e.target.closest('[data-edit-id]');
      if (editBtn) {
        const table = this.state.activeTable;
        const row = (this.state.tables[table] || []).find(r => Number(r.id) === Number(editBtn.dataset.editId));
        if (row) this.openRowEditor('update', table, row);
        return;
      }

      const delBtn = e.target.closest('[data-delete-id]');
      if (delBtn) {
        const table = this.state.activeTable;
        const id = Number(delBtn.dataset.deleteId);
        try {
          const res = await this.apiPost('delete', { table, id });
          if (res.deleted) {
            this.state.lastDeleted = { table, row: res.deleted };
          }
          if (res.sql) this.state.lastSql = res.sql;
          await this.syncFromServer();
          this.announce(`Deleted row ${id} from ${table}. Undo available.`);
          this.ping(300, 0.07);
        } catch (err) {
          this.announce(err.message, true);
        }
      }
    });

    app.el('new-row-btn')?.addEventListener('click', () => this.openRowEditor('insert', this.state.activeTable));

    app.el('undo-delete-btn')?.addEventListener('click', async () => {
      if (!this.state.lastDeleted) return;
      try {
        const res = await this.apiPost('restore', this.state.lastDeleted);
        this.state.lastDeleted = null;
        if (res.sql) this.state.lastSql = res.sql;
        await this.syncFromServer();
        this.announce('Last deleted row restored.');
        this.ping(740, 0.05);
      } catch (err) {
        this.announce(err.message, true);
      }
    });

    app.el('crud-search')?.addEventListener('input', (e) => {
      this.state.search = e.target.value;
      this.renderCrud();
    });

    app.el('crud-status-filter')?.addEventListener('change', (e) => {
      this.state.statusFilter = e.target.value;
      this.renderCrud();
    });

    app.el('crud-sort')?.addEventListener('change', (e) => {
      this.state.sort = e.target.value;
      this.renderCrud();
    });

    app.el('filter-pinned-only')?.addEventListener('change', (e) => {
      this.state.pinnedOnly = e.target.checked;
      this.renderCrud();
    });

    app.el('copy-last-sql')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.state.lastSql);
        this.announce('SQL statement copied to clipboard.');
      } catch {
        this.announce('Clipboard unavailable in this browser context.', true);
      }
    });

    this.editorForm?.addEventListener('submit', (e) => this.handleEditorSubmit(e));
    app.el('dialog-close-btn')?.addEventListener('click', () => this.editorDialog?.close());
    app.el('dialog-cancel-btn')?.addEventListener('click', () => this.editorDialog?.close());

    app.el('sim-table')?.addEventListener('change', (e) => {
      this.state.sim.table = e.target.value;
      this.renderExplain();
    });
    app.el('sim-predicate')?.addEventListener('change', (e) => {
      this.state.sim.predicate = e.target.value;
      this.renderExplain();
    });
    app.el('sim-rows')?.addEventListener('input', (e) => {
      this.state.sim.rows = Number(e.target.value);
      this.renderExplain();
    });
    app.el('explain-reset-btn')?.addEventListener('click', () => {
      this.state.sim = { table: 'nodes', predicate: 'composite', rows: 250000 };
      this.renderExplain();
    });

    app.el('copy-ddl-btn')?.addEventListener('click', async () => {
      try {
        await this.renderDdl();
        await navigator.clipboard.writeText(this.state.ddlDump);
        this.announce('Full MySQL DDL and seed dump copied.');
      } catch {
        this.announce('Clipboard copy blocked.', true);
      }
    });

    app.el('download-sql-btn')?.addEventListener('click', async () => {
      await this.renderDdl();
      const blob = new Blob([this.state.ddlDump], { type: 'application/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = app.item('a');
      a.href = url;
      a.download = 'innodb_forge_dump.sql';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.announce('Downloaded innodb_forge_dump.sql');
    });

    app.el('pref-theme')?.addEventListener('change', (e) => {
      this.state.prefs.theme = e.target.value;
      this.persistUiPrefs();
      this.renderPrefs();
    });
    app.el('pref-density')?.addEventListener('change', (e) => {
      this.state.prefs.density = e.target.value;
      this.persistUiPrefs();
      this.renderPrefs();
    });
    app.el('pref-motion')?.addEventListener('change', (e) => {
      this.state.prefs.motion = e.target.value;
      this.persistUiPrefs();
      this.renderPrefs();
    });
    app.el('sound-toggle')?.addEventListener('click', () => {
      this.state.prefs.audio = !this.state.prefs.audio;
      this.persistUiPrefs();
      this.renderPrefs();
      if (this.state.prefs.audio) this.ping(780, 0.05);
    });

    app.el('export-json-btn')?.addEventListener('click', () => {
      const json = JSON.stringify(this.state.tables, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = app.item('a');
      a.href = url;
      a.download = 'innodb_forge_snapshot.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.announce('Exported JSON database snapshot.');
    });

    app.el('import-json-input')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2_000_000) {
        this.announce('File exceeds 2 MB safety limit.', true);
        return;
      }
      try {
        const parsed = JSON.parse(await file.text());
        await this.apiPost('importSnapshot', { tables: parsed });
        this.state.lastDeleted = null;
        this.state.lastSql = '-- Snapshot imported & committed';
        await this.syncFromServer();
        this.announce('Database snapshot imported successfully.');
      } catch {
        this.announce('Invalid JSON snapshot file.', true);
      } finally {
        e.target.value = '';
      }
    });

    const resetHandler = async () => {
      try {
        await this.apiPost('reset');
        this.state.pinnedRows = ['nodes:101', 'deployments:501'];
        this.state.lastDeleted = null;
        this.state.lastSql = '-- Factory seed dataset restored';
        this.persistUiPrefs();
        await this.syncFromServer();
        this.announce('Database restored to factory seed records.');
      } catch (err) {
        this.announce(err.message, true);
      }
    };

    app.el('hero-seed-btn')?.addEventListener('click', resetHandler);
    app.el('factory-reset-btn')?.addEventListener('click', resetHandler);
  }
};
