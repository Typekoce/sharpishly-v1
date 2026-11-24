/**
 * inno_db_controller.js
 * Zero-dependency JS MVC for InnoDB Workbench:
 * BaseModel -> InnodbModel | BaseController -> InnoDbController
 */

const STORAGE_KEY = 'innodb_forge_state_v1';

const INNODB_SCHEMA = {
  nodes: {
    name: 'nodes',
    pk: 'id',
    description: 'Compute hosts managed by the control plane.',
    indexes: ['PRIMARY KEY (id)', 'UNIQUE KEY uk_hostname (hostname)', 'KEY idx_region_status (region, status)'],
    columns: [
      { name: 'id', type: 'BIGINT UNSIGNED', readonly: true },
      { name: 'hostname', type: 'VARCHAR(64)', required: true, pattern: '^[a-z0-9.-]{3,64}$', placeholder: 'man-edge-01.internal' },
      { name: 'ipv4_addr', type: 'VARCHAR(15)', required: true, pattern: '^(\\d{1,3}\\.){3}\\d{1,3}$', placeholder: '10.24.18.101' },
      { name: 'region', type: 'ENUM', options: ['uk-manchester', 'uk-london', 'eu-frankfurt', 'us-east'], required: true },
      { name: 'vcpu_cores', type: 'SMALLINT UNSIGNED', inputType: 'number', min: 1, max: 256, required: true },
      { name: 'status', type: 'ENUM', options: ['ONLINE', 'DEGRADED', 'DRAINING', 'OFFLINE'], required: true },
      { name: 'updated_at', type: 'TIMESTAMP', readonly: true }
    ]
  },
  deployments: {
    name: 'deployments',
    pk: 'id',
    description: 'Releases linked via node_id -> nodes.id (ON DELETE CASCADE).',
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
    pk: 'id',
    description: 'Buffer pool, IOPS, and latency samples per host.',
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

function seedData() {
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
      { id: 9001, node_id: 101, metric_key: 'innodb_buffer_hit_pct', metric_value: 99.84, severity: 'INFO', notes: 'Buffer pool warmed.', updated_at: '2026-11-19 14:10:00' },
      { id: 9002, node_id: 102, metric_key: 'replica_lag_seconds', metric_value: 0.02, severity: 'INFO', notes: 'Semi-sync nominal.', updated_at: '2026-11-19 14:11:15' },
      { id: 9003, node_id: 103, metric_key: 'nats_msg_throughput_sec', metric_value: 14820.5, severity: 'INFO', notes: 'Zero backpressure.', updated_at: '2026-11-19 14:12:40' },
      { id: 9004, node_id: 104, metric_key: 'innodb_row_lock_waits', metric_value: 47.0, severity: 'WARN', notes: 'Batch upsert contention.', updated_at: '2026-11-19 14:15:09' },
      { id: 9005, node_id: 105, metric_key: 'nvme_queue_depth', metric_value: 128.0, severity: 'CRITICAL', notes: 'Draining prior to swap.', updated_at: '2026-11-19 14:18:33' }
    ]
  };
}

/* ============================================================================
 * BASE MODEL & INNODB MODEL (Mirrors PHP BaseModel -> InnodbModel -> Db)
 * ========================================================================== */
const BaseModel = {
  tbl: 'nodes',
  endpointPrefix: 'innodb',

  nowSql() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  },

  sqlVal(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
    return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  },

  async syncRemote(action, payload) {
    if (typeof app === 'undefined' || typeof app.post !== 'function') return null;
    try {
      return await app.post(`${this.endpointPrefix}/${action}`, payload);
    } catch {
      return null;
    }
  },

  create(table, record) {
    const state = this.getState();
    const list = state.tables[table] || [];
    const nextId = list.length ? Math.max(...list.map((r) => Number(r.id) || 0)) + 1 : 1;
    const row = { id: nextId, ...record, updated_at: this.nowSql() };
    state.tables[table] = [row, ...list];
    state.lastSql = `INSERT INTO \`${table}\` (${Object.keys(row).join(', ')})\nVALUES (${Object.values(row).map(this.sqlVal).join(', ')});`;
    this.saveState();
    void this.syncRemote('save', { table, row });
    return row;
  },

  read(table, { search = '', status = 'ALL', sort = 'id:desc', pinnedOnly = false } = {}) {
    const state = this.getState();
    const schema = INNODB_SCHEMA[table] || INNODB_SCHEMA.nodes;
    const rows = state.tables[table] || [];
    const pinned = new Set(state.pinnedRows);
    const q = search.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (pinnedOnly && !pinned.has(`${table}:${row.id}`)) return false;
      if (status !== 'ALL' && (row.status ?? row.severity) !== status) return false;
      if (q && !Object.values(row).some((v) => String(v).toLowerCase().includes(q))) return false;
      return true;
    });

    const [field, dir] = sort.split(':');
    const key = field === 'primary_label' ? (schema.columns[1]?.name || 'id') : field;
    const cmp = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    return filtered.sort((a, b) => {
      const res = cmp.compare(String(a[key] ?? ''), String(b[key] ?? ''));
      return dir === 'asc' ? res : -res;
    });
  },

  update(table, id, patch) {
    const state = this.getState();
    let updatedRow = null;
    state.tables[table] = (state.tables[table] || []).map((r) => {
      if (r.id !== id) return r;
      updatedRow = { ...r, ...patch, updated_at: this.nowSql() };
      return updatedRow;
    });
    const sets = Object.entries(patch).map(([k, v]) => `\`${k}\` = ${this.sqlVal(v)}`).join(', ');
    state.lastSql = `UPDATE \`${table}\`\nSET ${sets}, updated_at = NOW()\nWHERE id = ${Number(id)};`;
    this.saveState();
    if (updatedRow) void this.syncRemote('save', { table, row: updatedRow });
    return updatedRow;
  },

  delete(table, id) {
    const state = this.getState();
    const list = state.tables[table] || [];
    const target = list.find((r) => r.id === id);
    if (!target) return false;

    state.lastDeleted = { table, row: structuredClone(target) };
    state.tables[table] = list.filter((r) => r.id !== id);
    if (table === 'nodes') {
      state.tables.deployments = (state.tables.deployments || []).filter((d) => Number(d.node_id) !== Number(id));
      state.tables.telemetry_logs = (state.tables.telemetry_logs || []).filter((t) => Number(t.node_id) !== Number(id));
    }
    state.lastSql = `DELETE FROM \`${table}\` WHERE id = ${Number(id)};`;
    this.saveState();
    void this.syncRemote('delete', { table, id });
    return true;
  }
};

const InnodbModel = Object.assign(Object.create(BaseModel), {
  tbl: 'nodes',

  getState() {
    window.App = window.App || {};
    App.data = App.data || {};
    if (!App.data.innodb) {
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      } catch {
        saved = null;
      }
      App.data.innodb = {
        database: saved?.database || 'innodb_forge',
        charset: saved?.charset || 'utf8mb4',
        collation: saved?.collation || 'utf8mb4_0900_ai_ci',
        route: 'overview',
        activeTable: 'nodes',
        search: '',
        statusFilter: 'ALL',
        sort: 'id:desc',
        pinnedOnly: false,
        pinnedRows: saved?.pinnedRows || ['nodes:101', 'deployments:501'],
        tables: saved?.tables || seedData(),
        lastSql: 'SELECT * FROM `nodes` ORDER BY id DESC;',
        lastDeleted: null,
        sim: { table: 'nodes', predicate: 'composite', rows: 250000 },
        prefs: saved?.prefs || { theme: 'dark', density: 'comfortable', motion: 'full', audio: false }
      };
    }
    return App.data.innodb;
  },

  saveState() {
    const s = this.getState();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        database: s.database,
        charset: s.charset,
        collation: s.collation,
        tables: s.tables,
        pinnedRows: s.pinnedRows,
        prefs: s.prefs
      }));
      return true;
    } catch {
      return false;
    }
  },

  createDatabase(name, charset = 'utf8mb4', collation = 'utf8mb4_0900_ai_ci') {
    const s = this.getState();
    const safeName = String(name || s.database).trim().replace(/[^a-zA-Z0-9_]/g, '_') || 'innodb_forge';
    s.database = safeName;
    s.charset = charset;
    s.collation = collation;
    s.lastSql = `CREATE DATABASE IF NOT EXISTS \`${safeName}\` DEFAULT CHARACTER SET ${charset} DEFAULT COLLATE ${collation};`;
    this.saveState();
    void this.syncRemote('createDatabase', { database: safeName, charset, collation });
    return s;
  },

  createTable(tableName, definition = {}) {
    const s = this.getState();
    const safeTbl = String(tableName || '').trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!safeTbl) return null;

    if (!INNODB_SCHEMA[safeTbl]) {
      INNODB_SCHEMA[safeTbl] = {
        name: safeTbl,
        pk: 'id',
        description: definition.description || `Custom InnoDB table \`${safeTbl}\`.`,
        indexes: definition.indexes || ['PRIMARY KEY (id)', `KEY idx_${safeTbl}_status (status)`],
        columns: definition.columns || [
          { name: 'id', type: 'BIGINT UNSIGNED', readonly: true },
          { name: 'title', type: 'VARCHAR(120)', required: true, placeholder: 'Item title' },
          { name: 'status', type: 'ENUM', options: ['ONLINE', 'DEGRADED', 'OFFLINE'], required: true },
          { name: 'updated_at', type: 'TIMESTAMP', readonly: true }
        ]
      };
    }
    if (!s.tables[safeTbl]) {
      s.tables[safeTbl] = definition.rows || [];
    }
    s.activeTable = safeTbl;
    s.lastSql = `CREATE TABLE IF NOT EXISTS \`${safeTbl}\` (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, PRIMARY KEY (id)) ENGINE=InnoDB DEFAULT CHARSET=${s.charset} COLLATE=${s.collation};`;
    this.saveState();
    void this.syncRemote('createTable', { table: safeTbl, definition });
    return INNODB_SCHEMA[safeTbl];
  },

  undoDelete() {
    const s = this.getState();
    if (!s.lastDeleted) return false;
    const { table, row } = s.lastDeleted;
    s.tables[table] = [row, ...(s.tables[table] || [])];
    s.lastDeleted = null;
    s.lastSql = `-- RESTORED ROW id=${row.id} INTO \`${table}\``;
    this.saveState();
    return true;
  },

  togglePin(table, id) {
    const s = this.getState();
    const key = `${table}:${id}`;
    const set = new Set(s.pinnedRows);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    s.pinnedRows = [...set];
    this.saveState();
  },

  explain({ table, predicate, rows }) {
    const n = Number(rows);
    const idx = (INNODB_SCHEMA[table] || INNODB_SCHEMA.nodes).indexes[2] || 'idx_secondary';
    if (predicate === 'pk') {
      return { type: 'const', possible_keys: 'PRIMARY', key: 'PRIMARY', rows: 1, filtered: '100.00', extra: 'Using index', cost: 1.0, pages: 3 };
    }
    if (predicate === 'composite') {
      const est = Math.max(1, Math.round(n * 0.012));
      return { type: 'ref', possible_keys: idx, key: idx, rows: est, filtered: '100.00', extra: 'Using where; Using index', cost: Number((est * 0.25 + 2.4).toFixed(1)), pages: Math.max(4, Math.ceil(est / 40)) };
    }
    if (predicate === 'prefix_miss') {
      return { type: 'index', possible_keys: 'NULL', key: idx, rows: n, filtered: '35.00', extra: 'Using where; Using index', cost: Number((n * 0.18).toFixed(1)), pages: Math.ceil(n / 90) };
    }
    return { type: 'ALL', possible_keys: 'NULL', key: 'NULL', rows: n, filtered: '11.11', extra: 'Using where (Full Scan)', cost: Number((n * 0.42).toFixed(1)), pages: Math.ceil(n / 32) };
  },

  toSqlDump() {
    const s = this.getState();
    const lines = [
      `-- InnoDB Forge SQL Dump (${s.database})`,
      'SET NAMES utf8mb4;',
      'SET FOREIGN_KEY_CHECKS = 0;',
      `CREATE DATABASE IF NOT EXISTS \`${s.database}\` DEFAULT CHARACTER SET ${s.charset} DEFAULT COLLATE ${s.collation};`,
      `USE \`${s.database}\`;`,
      '',
      `CREATE TABLE IF NOT EXISTS \`nodes\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`hostname\` VARCHAR(64) NOT NULL,
  \`ipv4_addr\` VARCHAR(15) NOT NULL,
  \`region\` ENUM('uk-manchester','uk-london','eu-frankfurt','us-east') NOT NULL,
  \`vcpu_cores\` SMALLINT UNSIGNED NOT NULL DEFAULT 4,
  \`status\` ENUM('ONLINE','DEGRADED','DRAINING','OFFLINE') NOT NULL DEFAULT 'ONLINE',
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_hostname\` (\`hostname\`),
  KEY \`idx_region_status\` (\`region\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=${s.charset} COLLATE=${s.collation};`,
      `CREATE TABLE IF NOT EXISTS \`deployments\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`node_id\` BIGINT UNSIGNED NOT NULL,
  \`service_name\` VARCHAR(64) NOT NULL,
  \`release_tag\` VARCHAR(32) NOT NULL,
  \`environment\` ENUM('production','staging','canary') NOT NULL DEFAULT 'production',
  \`status\` ENUM('ACTIVE','ROLLING','FAILED','ROLLED_BACK') NOT NULL DEFAULT 'ACTIVE',
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`fk_deploy_node\` (\`node_id\`),
  CONSTRAINT \`fk_deployments_node\` FOREIGN KEY (\`node_id\`) REFERENCES \`nodes\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=${s.charset} COLLATE=${s.collation};`,
      `CREATE TABLE IF NOT EXISTS \`telemetry_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`node_id\` BIGINT UNSIGNED NOT NULL,
  \`metric_key\` VARCHAR(48) NOT NULL,
  \`metric_value\` DECIMAL(10,2) NOT NULL,
  \`severity\` ENUM('INFO','WARN','CRITICAL') NOT NULL DEFAULT 'INFO',
  \`notes\` TEXT NULL,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_node_severity\` (\`node_id\`, \`severity\`),
  CONSTRAINT \`fk_telemetry_node\` FOREIGN KEY (\`node_id\`) REFERENCES \`nodes\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=${s.charset} COLLATE=${s.collation};`,
      ''
    ];

    for (const [tbl, rows] of Object.entries(s.tables)) {
      if (!rows.length) continue;
      const cols = Object.keys(rows[0]);
      const vals = rows.map((r) => `  (${cols.map((c) => this.sqlVal(r[c])).join(', ')})`).join(',\n');
      lines.push(`INSERT INTO \`${tbl}\` (${cols.join(', ')}) VALUES\n${vals};\n`);
    }

    lines.push('SET FOREIGN_KEY_CHECKS = 1;');
    return lines.join('\n');
  },

  resetSeed() {
    const s = this.getState();
    s.tables = seedData();
    s.pinnedRows = ['nodes:101', 'deployments:501'];
    s.lastDeleted = null;
    s.lastSql = '-- Factory seed data restored';
    this.saveState();
  }
});

/* ============================================================================
 * BASE CONTROLLER & INNODB CONTROLLER (Mirrors PHP BaseController -> InnodbController)
 * ========================================================================== */
const BaseController = {
  model: BaseModel,
  editing: { mode: 'insert', table: 'nodes', id: null },

  el(id) {
    return typeof app !== 'undefined' && typeof app.el === 'function' ? app.el(id) : document.getElementById(id);
  },

  item(tag, className = '', text = '') {
    if (typeof app !== 'undefined' && typeof app.item === 'function') return app.item(tag, className, text);
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  },

  debug(label, detail) {
    if (typeof app !== 'undefined' && typeof app.dBug === 'function') app.dBug(label, detail);
    else console.log({ [label]: detail });
  },

  beep(freq = 640, ms = 45) {
    if (!this.model.getState().prefs.audio) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this._audioCtx = this._audioCtx || new Ctx();
      const osc = this._audioCtx.createOscillator();
      const gain = this._audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, this._audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this._audioCtx.currentTime + ms / 1000);
      osc.connect(gain);
      gain.connect(this._audioCtx.destination);
      osc.start();
      osc.stop(this._audioCtx.currentTime + ms / 1000);
    } catch {
      // Ignore restricted audio context
    }
  },

  statusBadge(val) {
    const s = String(val);
    const cls = ['ONLINE', 'ACTIVE', 'INFO'].includes(s)
      ? 'pill pill-ok'
      : ['DEGRADED', 'DRAINING', 'ROLLING', 'WARN'].includes(s)
        ? 'pill pill-warn'
        : 'pill pill-danger';
    const prefix = cls.endsWith('ok') ? '● ' : cls.endsWith('warn') ? '▲ ' : '■ ';
    return this.item('span', cls, `${prefix}${s}`);
  },

  metricCard(label, value, sub) {
    return this.item('article', 'metric-card', [
      this.item('span', 'metric-label', label),
      this.item('strong', 'metric-value', String(value)),
      this.item('span', 'metric-sub', sub)
    ]);
  },

  downloadFile(filename, content, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = this.item('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

const InnoDbController = Object.assign(Object.create(BaseController), {
  model: InnodbModel,

  index() {
    this.debug('Controller', 'InnoDbController');
    const state = this.model.getState();
    const hashRoute = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (hashRoute && ['overview', 'crud', 'explain', 'ddl', 'settings'].includes(hashRoute)) {
      state.route = hashRoute;
    }
    this.bindEvents();
    this.initCanvas();
    this.render();
  },

  createDatabase(config = {}) {
    const s = this.model.createDatabase(config.name, config.charset, config.collation);
    this.render();
    return s;
  },

  createTable(tableName, definition = {}) {
    const tbl = this.model.createTable(tableName, definition);
    this.render();
    return tbl;
  },

  navigate(route) {
    const s = this.model.getState();
    s.route = ['overview', 'crud', 'explain', 'ddl', 'settings'].includes(route) ? route : 'overview';
    if (window.location.hash !== `#/${s.route}`) {
      history.pushState({ route: s.route }, '', `#/${s.route}`);
    }
    this.beep(640, 35);
    this.render();
  },

  openEditor(mode, table, row = null) {
    const dialog = this.el('row-editor-dialog');
    const fieldsBox = this.el('dialog-fields');
    const errBox = this.el('dialog-error-box');
    const schema = INNODB_SCHEMA[table];
    if (!dialog || !fieldsBox || !schema) return;

    this.editing = { mode, table, id: row?.id ?? null };
    this.el('dialog-title').textContent = mode === 'insert' ? `INSERT INTO ${table}` : `UPDATE ${table} WHERE id = ${row.id}`;
    if (errBox) errBox.hidden = true;

    const s = this.model.getState();
    const inputs = schema.columns.filter((c) => !c.readonly).map((col) => {
      const id = `field-${col.name}`;
      const cur = row ? row[col.name] : '';
      let ctrl;

      if (col.fkTable) {
        ctrl = this.item('select', 'select');
        ctrl.id = id;
        ctrl.name = col.name;
        ctrl.required = true;
        for (const p of s.tables[col.fkTable] || []) {
          const opt = this.item('option', '', `#${p.id} — ${p.hostname || p.id}`);
          opt.value = String(p.id);
          ctrl.appendChild(opt);
        }
        if (cur) ctrl.value = String(cur);
      } else if (col.type === 'ENUM') {
        ctrl = this.item('select', 'select');
        ctrl.id = id;
        ctrl.name = col.name;
        ctrl.required = true;
        for (const o of col.options || []) {
          const opt = this.item('option', '', o);
          opt.value = o;
          ctrl.appendChild(opt);
        }
        if (cur) ctrl.value = String(cur);
      } else if (col.type === 'TEXT') {
        ctrl = this.item('textarea', 'textarea', String(cur ?? ''));
        ctrl.id = id;
        ctrl.name = col.name;
        ctrl.placeholder = col.placeholder || '';
      } else {
        ctrl = this.item('input', 'input');
        ctrl.id = id;
        ctrl.name = col.name;
        ctrl.type = col.inputType || 'text';
        if (col.required) ctrl.required = true;
        if (col.pattern) ctrl.pattern = col.pattern;
        if (col.min !== undefined) ctrl.min = String(col.min);
        if (col.max !== undefined) ctrl.max = String(col.max);
        if (col.step !== undefined) ctrl.step = String(col.step);
        ctrl.placeholder = col.placeholder || '';
        ctrl.value = cur !== '' && cur !== undefined ? String(cur) : '';
      }

      const label = this.item('label', 'field-label', [
        this.item('span', '', col.name),
        this.item('span', 'mono text-xs', col.type)
      ]);
      label.htmlFor = id;
      return this.item('div', 'field-group', [label, ctrl]);
    });

    fieldsBox.replaceChildren(...inputs);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    this.beep(720, 40);
  },

  submitEditor(form) {
    const errBox = this.el('dialog-error-box');
    const s = this.model.getState();
    const { mode, table, id } = this.editing;
    const schema = INNODB_SCHEMA[table];

    if (!form.checkValidity()) {
      if (errBox) {
        errBox.textContent = 'Constraint violation: Check required fields and format patterns.';
        errBox.hidden = false;
      }
      this.beep(220, 90);
      return;
    }

    const fd = new FormData(form);
    const record = {};
    for (const col of schema.columns) {
      if (col.readonly) continue;
      const raw = fd.get(col.name);
      record[col.name] = (col.fkTable || col.inputType === 'number') ? Number(raw) : String(raw ?? '').trim();
    }

    if (table === 'nodes') {
      const dup = (s.tables.nodes || []).find((n) => n.hostname === record.hostname && n.id !== id);
      if (dup) {
        if (errBox) {
          errBox.textContent = `ERROR 1062 (23000): Duplicate entry '${record.hostname}' for key 'nodes.uk_hostname'`;
          errBox.hidden = false;
        }
        this.beep(220, 90);
        return;
      }
    }

    if (mode === 'insert') this.model.create(table, record);
    else this.model.update(table, id, record);

    this.beep(880, 50);
    this.el('row-editor-dialog')?.close();
    this.render();
  },

  render() {
    const s = this.model.getState();
    document.documentElement.dataset.theme = s.prefs.theme;
    document.documentElement.dataset.density = s.prefs.density;
    document.documentElement.dataset.motion = s.prefs.motion;

    document.querySelectorAll('.nav-link[data-route]').forEach((a) => {
      if (a.dataset.route === s.route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    document.querySelectorAll('.view-panel').forEach((sec) => {
      sec.hidden = sec.id !== `view-${s.route}`;
    });

    if (s.route === 'overview') this.renderOverview();
    else if (s.route === 'crud') this.renderCrud();
    else if (s.route === 'explain') this.renderExplain();
    else if (s.route === 'ddl') this.renderDdl();
    else if (s.route === 'settings') this.renderSettings();
  },

  renderOverview() {
    const s = this.model.getState();
    const totalRows = Object.values(s.tables).reduce((acc, list) => acc + list.length, 0);
    const online = (s.tables.nodes || []).filter((n) => n.status === 'ONLINE').length;
    const cores = (s.tables.nodes || []).reduce((acc, n) => acc + Number(n.vcpu_cores || 0), 0);

    this.el('overview-metrics')?.replaceChildren(
      this.metricCard('Total Relational Rows', totalRows.toLocaleString('en-GB'), `Across ${Object.keys(INNODB_SCHEMA).length} InnoDB tables`),
      this.metricCard('Online Cluster Nodes', `${online} / ${(s.tables.nodes || []).length}`, `${cores} total vCPU cores`),
      this.metricCard('Pinned Bookmarks', String(s.pinnedRows.length), 'Persisted in localStorage'),
      this.metricCard('InnoDB Page Size', '16 KiB', s.collation)
    );

    const cards = Object.values(INNODB_SCHEMA).map((tbl) => {
      const openBtn = this.item('button', 'btn btn-sm btn-secondary', 'Open Table');
      openBtn.type = 'button';
      openBtn.dataset.openTable = tbl.name;

      return this.item('article', 'schema-card', [
        this.item('div', 'flex-between', [
          this.item('h3', 'mono', tbl.name),
          this.item('span', 'pill pill-ok', `${(s.tables[tbl.name] || []).length} rows`)
        ]),
        this.item('p', 'text-sm text-muted', tbl.description),
        this.item('div', 'flex-between', [
          this.item('span', 'text-xs mono text-muted', tbl.indexes[0]),
          openBtn
        ])
      ]);
    });
    this.el('schema-topology-cards')?.replaceChildren(...cards);
  },

  renderCrud() {
    const s = this.model.getState();
    const schema = INNODB_SCHEMA[s.activeTable] || INNODB_SCHEMA.nodes;
    const rows = this.model.read(schema.name, {
      search: s.search,
      status: s.statusFilter,
      sort: s.sort,
      pinnedOnly: s.pinnedOnly
    });

    this.el('crud-table-list')?.replaceChildren(
      ...Object.values(INNODB_SCHEMA).map((tbl) => {
        const btn = this.item('button', 'table-btn', [
          this.item('span', 'mono', tbl.name),
          this.item('span', 'pill pill-ok', String((s.tables[tbl.name] || []).length))
        ]);
        btn.type = 'button';
        btn.setAttribute('aria-pressed', String(tbl.name === schema.name));
        btn.dataset.selectTable = tbl.name;
        return this.item('li', '', [btn]);
      })
    );

    if (this.el('pinned-count')) this.el('pinned-count').textContent = String(s.pinnedRows.length);
    if (this.el('crud-sql-preview')) this.el('crud-sql-preview').textContent = s.lastSql;
    if (this.el('active-table-heading')) this.el('active-table-heading').textContent = schema.name;
    if (this.el('active-table-desc')) this.el('active-table-desc').textContent = schema.description;
    if (this.el('undo-delete-btn')) this.el('undo-delete-btn').hidden = !s.lastDeleted;

    const statusSelect = this.el('crud-status-filter');
    if (statusSelect) {
      const statusCol = schema.columns.find((c) => c.name === 'status' || c.name === 'severity');
      const opts = [this.item('option', '', 'ALL STATES')];
      opts[0].value = 'ALL';
      for (const o of statusCol?.options || []) {
        const opt = this.item('option', '', o);
        opt.value = o;
        opts.push(opt);
      }
      statusSelect.replaceChildren(...opts);
      statusSelect.value = s.statusFilter;
    }

    this.el('crud-thead')?.replaceChildren(
      this.item('tr', '', [
        this.item('th', '', 'Pin'),
        ...schema.columns.map((c) => this.item('th', '', c.name)),
        this.item('th', '', 'Actions')
      ])
    );

    const pinned = new Set(s.pinnedRows);
    const tbody = this.el('crud-tbody');
    if (tbody) {
      if (!rows.length) {
        const td = this.item('td', '', '0 rows match the current WHERE predicate.');
        td.colSpan = schema.columns.length + 2;
        td.style.textAlign = 'center';
        td.style.padding = '2rem';
        tbody.replaceChildren(this.item('tr', '', [td]));
      } else {
        tbody.replaceChildren(...rows.map((r) => {
          const isPin = pinned.has(`${schema.name}:${r.id}`);
          const pinBtn = this.item('button', 'btn btn-sm', isPin ? '★' : '☆');
          pinBtn.type = 'button';
          pinBtn.dataset.pinId = String(r.id);

          const editBtn = this.item('button', 'btn btn-sm btn-secondary', 'Edit');
          editBtn.type = 'button';
          editBtn.dataset.editId = String(r.id);

          const delBtn = this.item('button', 'btn btn-sm btn-danger', 'Delete');
          delBtn.type = 'button';
          delBtn.dataset.deleteId = String(r.id);

          const cells = schema.columns.map((col) => {
            const val = r[col.name];
            if (col.name === 'status' || col.name === 'severity') return this.item('td', '', [this.statusBadge(val)]);
            const mono = col.name === 'id' || col.name.includes('addr') || col.name === 'updated_at';
            return this.item('td', mono ? 'mono' : '', val ?? 'NULL');
          });

          const tr = this.item('tr', '', [
            this.item('td', '', [pinBtn]),
            ...cells,
            this.item('td', '', [this.item('div', 'flex-row', [editBtn, delBtn])])
          ]);
          tr.dataset.selected = String(isPin);
          return tr;
        }));
      }
    }

    if (this.el('crud-row-summary')) {
      this.el('crud-row-summary').textContent = `${rows.length} of ${(s.tables[schema.name] || []).length} rows from ${schema.name}`;
    }
  },

  renderExplain() {
    const { sim } = this.model.getState();
    const plan = this.model.explain(sim);
    if (this.el('sim-table')) this.el('sim-table').value = sim.table;
    if (this.el('sim-predicate')) this.el('sim-predicate').value = sim.predicate;
    if (this.el('sim-rows')) this.el('sim-rows').value = String(sim.rows);
    if (this.el('sim-rows-label')) this.el('sim-rows-label').textContent = Number(sim.rows).toLocaleString('en-GB');

    this.el('explain-metrics')?.replaceChildren(
      this.metricCard('Access Type', plan.type, `Index: ${plan.key}`),
      this.metricCard('Rows Examined', plan.rows.toLocaleString('en-GB'), `Filtered: ${plan.filtered}%`),
      this.metricCard('Optimizer Cost', `${plan.cost} units`, `~${plan.pages.toLocaleString('en-GB')} InnoDB pages`)
    );

    this.el('explain-tbody')?.replaceChildren(
      this.item('tr', '', [
        this.item('td', '', '1'),
        this.item('td', '', 'SIMPLE'),
        this.item('td', '', sim.table),
        this.item('td', '', [this.statusBadge(plan.type === 'ALL' ? 'CRITICAL' : plan.type === 'index' ? 'WARN' : 'ONLINE')]),
        this.item('td', '', plan.possible_keys),
        this.item('td', '', plan.key),
        this.item('td', '', plan.rows.toLocaleString('en-GB')),
        this.item('td', '', plan.filtered),
        this.item('td', '', plan.extra)
      ])
    );
  },

  renderDdl() {
    if (this.el('full-ddl-output')) {
      this.el('full-ddl-output').textContent = this.model.toSqlDump();
    }
  },

  renderSettings() {
    const { prefs } = this.model.getState();
    if (this.el('pref-theme')) this.el('pref-theme').value = prefs.theme;
    if (this.el('pref-density')) this.el('pref-density').value = prefs.density;
    if (this.el('pref-motion')) this.el('pref-motion').value = prefs.motion;
  },

  initCanvas() {
    const canvas = this.el('buffer-canvas');
    if (!canvas?.getContext || this._canvasStarted) return;
    this._canvasStarted = true;
    const ctx = canvas.getContext('2d');
    let tick = 0;

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cols = 16;
      const rows = 4;
      const pad = 14;
      const gap = 6;
      const cw = (w - pad * 2 - gap * (cols - 1)) / cols;
      const ch = (h - pad * 2 - gap * (rows - 1)) / rows;
      const totalRows = Object.values(this.model.getState().tables).reduce((a, b) => a + b.length, 0);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const pulse = Math.sin(tick * 0.04 + idx * 0.35) * 0.5 + 0.5;
          ctx.fillStyle = idx % 11 === 0
            ? `rgba(245, 166, 35, ${0.28 + pulse * 0.45})`
            : idx < totalRows * 2
              ? `rgba(56, 189, 248, ${0.25 + pulse * 0.45})`
              : 'rgba(148, 163, 184, 0.14)';
          ctx.beginPath();
          ctx.roundRect(pad + c * (cw + gap), pad + r * (ch + gap), Math.max(4, cw), Math.max(4, ch), 4);
          ctx.fill();
        }
      }
      if (this.model.getState().prefs.motion !== 'reduced' && !document.hidden) tick += 1;
      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);
  },

  bindEvents() {
    if (this._bound) return;
    this._bound = true;
    const s = this.model.getState();

    window.addEventListener('popstate', () => this.index());

    document.addEventListener('click', (e) => {
      const routeEl = e.target.closest('[data-route]');
      if (routeEl) { e.preventDefault(); this.navigate(routeEl.dataset.route); return; }

      const openTbl = e.target.closest('[data-open-table]');
      if (openTbl) { s.activeTable = openTbl.dataset.openTable; this.navigate('crud'); return; }

      const selTbl = e.target.closest('[data-select-table]');
      if (selTbl) { s.activeTable = selTbl.dataset.selectTable; s.statusFilter = 'ALL'; s.search = ''; this.render(); return; }

      const pinBtn = e.target.closest('[data-pin-id]');
      if (pinBtn) { this.model.togglePin(s.activeTable, Number(pinBtn.dataset.pinId)); this.render(); return; }

      const editBtn = e.target.closest('[data-edit-id]');
      if (editBtn) {
        const row = (s.tables[s.activeTable] || []).find((r) => r.id === Number(editBtn.dataset.editId));
        if (row) this.openEditor('update', s.activeTable, row);
        return;
      }

      const delBtn = e.target.closest('[data-delete-id]');
      if (delBtn) {
        this.model.delete(s.activeTable, Number(delBtn.dataset.deleteId));
        this.beep(300, 70);
        this.render();
      }
    });

    this.el('row-editor-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitEditor(e.currentTarget);
    });
    this.el('dialog-close-btn')?.addEventListener('click', () => this.el('row-editor-dialog')?.close());
    this.el('dialog-cancel-btn')?.addEventListener('click', () => this.el('row-editor-dialog')?.close());
    this.el('new-row-btn')?.addEventListener('click', () => this.openEditor('insert', s.activeTable));
    this.el('undo-delete-btn')?.addEventListener('click', () => { this.model.undoDelete(); this.render(); });

    this.el('crud-search')?.addEventListener('input', (e) => { s.search = e.target.value; this.renderCrud(); });
    this.el('crud-status-filter')?.addEventListener('change', (e) => { s.statusFilter = e.target.value; this.renderCrud(); });
    this.el('crud-sort')?.addEventListener('change', (e) => { s.sort = e.target.value; this.renderCrud(); });
    this.el('filter-pinned-only')?.addEventListener('change', (e) => { s.pinnedOnly = e.target.checked; this.renderCrud(); });

    this.el('copy-last-sql')?.addEventListener('click', () => navigator.clipboard?.writeText(s.lastSql));
    this.el('copy-ddl-btn')?.addEventListener('click', () => navigator.clipboard?.writeText(this.model.toSqlDump()));
    this.el('download-sql-btn')?.addEventListener('click', () => this.downloadFile('innodb_forge_dump.sql', this.model.toSqlDump(), 'application/sql'));

    this.el('sim-table')?.addEventListener('change', (e) => { s.sim.table = e.target.value; this.renderExplain(); });
    this.el('sim-predicate')?.addEventListener('change', (e) => { s.sim.predicate = e.target.value; this.renderExplain(); });
    this.el('sim-rows')?.addEventListener('input', (e) => { s.sim.rows = Number(e.target.value); this.renderExplain(); });
    this.el('explain-reset-btn')?.addEventListener('click', () => { s.sim = { table: 'nodes', predicate: 'composite', rows: 250000 }; this.renderExplain(); });

    this.el('pref-theme')?.addEventListener('change', (e) => { s.prefs.theme = e.target.value; this.model.saveState(); this.render(); });
    this.el('pref-density')?.addEventListener('change', (e) => { s.prefs.density = e.target.value; this.model.saveState(); this.render(); });
    this.el('pref-motion')?.addEventListener('change', (e) => { s.prefs.motion = e.target.value; this.model.saveState(); this.render(); });
    this.el('sound-toggle')?.addEventListener('click', (e) => {
      s.prefs.audio = !s.prefs.audio;
      e.currentTarget.setAttribute('aria-pressed', String(s.prefs.audio));
      e.currentTarget.textContent = s.prefs.audio ? 'Audio: On' : 'Audio: Off';
      this.model.saveState();
    });

    this.el('export-json-btn')?.addEventListener('click', () => this.downloadFile('innodb_forge_snapshot.json', JSON.stringify(s.tables, null, 2), 'application/json'));
    this.el('import-json-input')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (parsed.nodes && parsed.deployments && parsed.telemetry_logs) {
          s.tables = parsed;
          this.model.saveState();
          this.render();
        }
      } finally {
        e.target.value = '';
      }
    });

    const reset = () => { this.model.resetSeed(); this.render(); };
    this.el('hero-seed-btn')?.addEventListener('click', reset);
    this.el('factory-reset-btn')?.addEventListener('click', reset);
  }
});

if (typeof app !== 'undefined') {
  app.innodb = InnoDbController;
}

document.addEventListener('DOMContentLoaded', () => InnoDbController.index(), { once: true });