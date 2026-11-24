    // ============================================================
    // SIMULATED REPOSITORY DATA
    // ============================================================
    const BRANCH_COLORS = {
      main: "oklch(0.78 0.14 195)",
      develop: "oklch(0.72 0.15 145)",
      "feature/auth": "oklch(0.75 0.14 310)",
      "feature/graph": "oklch(0.78 0.14 85)",
      hotfix: "oklch(0.65 0.18 25)"
    };

    // Commits ordered newest → oldest (topological for layout we reverse)
    const COMMITS = [
      { hash: "a8f3c21", short: "a8f3c21", message: "Merge branch 'feature/graph' into main", author: "Elena R.", email: "elena@studio.dev", date: "2026-11-18T14:22:00Z", parents: ["b4e9a10", "c7d2f88"], branch: "main", isMerge: true,
        files: [{ path: "src/graph/layout.js", status: "M" }, { path: "src/graph/render.js", status: "A" }, { path: "README.md", status: "M" }],
        diff: `diff --git a/src/graph/layout.js b/src/graph/layout.js
--- a/src/graph/layout.js
+++ b/src/graph/layout.js
@@ -12,6 +12,9 @@
+  // lane assignment for merge commits
+  if (commit.isMerge) lanes.unshift(0);
   return lanes;` },
      { hash: "c7d2f88", short: "c7d2f88", message: "Add interactive node selection and tooltips", author: "Julian V.", email: "julian@studio.dev", date: "2026-11-17T19:05:00Z", parents: ["e1b6d44"], branch: "feature/graph", isMerge: false,
        files: [{ path: "src/graph/render.js", status: "A" }, { path: "src/graph/events.js", status: "A" }],
        diff: `diff --git a/src/graph/render.js b/src/graph/render.js
new file mode 100644
--- /dev/null
+++ b/src/graph/render.js
@@ -0,0 +1,40 @@
+export function drawNode(ctx, node) {
+  ctx.beginPath();
+  ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
+  ctx.fill();
+}` },
      { hash: "e1b6d44", short: "e1b6d44", message: "Implement lane-based commit graph layout", author: "Julian V.", email: "julian@studio.dev", date: "2026-11-16T11:40:00Z", parents: ["b4e9a10"], branch: "feature/graph", isMerge: false,
        files: [{ path: "src/graph/layout.js", status: "A" }, { path: "src/graph/lanes.js", status: "A" }],
        diff: `+export function assignLanes(commits) { ... }` },
      { hash: "b4e9a10", short: "b4e9a10", message: "Merge branch 'feature/auth' into main", author: "Elena R.", email: "elena@studio.dev", date: "2026-11-14T16:18:00Z", parents: ["9c2a7e1", "f3a1b09"], branch: "main", isMerge: true,
        files: [{ path: "src/auth/session.js", status: "A" }, { path: "src/auth/login.js", status: "A" }, { path: "src/app.js", status: "M" }],
        diff: `+import { createSession } from './auth/session.js';` },
      { hash: "f3a1b09", short: "f3a1b09", message: "Add session persistence and token refresh", author: "Mira C.", email: "mira@studio.dev", date: "2026-11-13T09:55:00Z", parents: ["d8e4c22"], branch: "feature/auth", isMerge: false,
        files: [{ path: "src/auth/session.js", status: "A" }, { path: "src/auth/token.js", status: "A" }],
        diff: `+export function refreshToken() { ... }` },
      { hash: "d8e4c22", short: "d8e4c22", message: "Scaffold auth module and login form", author: "Mira C.", email: "mira@studio.dev", date: "2026-11-12T15:30:00Z", parents: ["9c2a7e1"], branch: "feature/auth", isMerge: false,
        files: [{ path: "src/auth/login.js", status: "A" }, { path: "src/auth/index.js", status: "A" }],
        diff: `+export function LoginForm() { ... }` },
      { hash: "9c2a7e1", short: "9c2a7e1", message: "Improve accessibility of commit list and focus management", author: "Elena R.", email: "elena@studio.dev", date: "2026-11-10T13:12:00Z", parents: ["7b5f3a0"], branch: "main", isMerge: false,
        files: [{ path: "src/ui/CommitList.js", status: "M" }, { path: "src/a11y/focus.js", status: "A" }],
        diff: `+  list.setAttribute('role', 'listbox');` },
      { hash: "7b5f3a0", short: "7b5f3a0", message: "Add dark/light theme tokens with oklch", author: "Julian V.", email: "julian@studio.dev", date: "2026-11-08T10:45:00Z", parents: ["2e9d1c4"], branch: "main", isMerge: false,
        files: [{ path: "styles/tokens.css", status: "A" }, { path: "styles/themes.css", status: "A" }],
        diff: `+  --accent: oklch(0.78 0.14 195);` },
      { hash: "2e9d1c4", short: "2e9d1c4", message: "Hotfix: correct parent resolution on orphan commits", author: "Sam O.", email: "sam@studio.dev", date: "2026-11-07T18:20:00Z", parents: ["5a8b2f7"], branch: "hotfix", isMerge: false,
        files: [{ path: "src/git/parse.js", status: "M" }],
        diff: `-  if (!parents.length) parents = [null];
+  if (!parents.length) parents = [];` },
      { hash: "5a8b2f7", short: "5a8b2f7", message: "Merge hotfix into main", author: "Elena R.", email: "elena@studio.dev", date: "2026-11-07T19:01:00Z", parents: ["1c4e9a2", "2e9d1c4"], branch: "main", isMerge: true,
        files: [{ path: "src/git/parse.js", status: "M" }],
        diff: `Merge commit` },
      { hash: "1c4e9a2", short: "1c4e9a2", message: "Introduce file history walker and blame-lite", author: "Elena R.", email: "elena@studio.dev", date: "2026-11-05T14:08:00Z", parents: ["0f7b3d6"], branch: "main", isMerge: false,
        files: [{ path: "src/git/history.js", status: "A" }, { path: "src/git/blame.js", status: "A" }],
        diff: `+export function walkFileHistory(path, commits) { ... }` },
      { hash: "0f7b3d6", short: "0f7b3d6", message: "Add commit detail dialog and diff pane", author: "Julian V.", email: "julian@studio.dev", date: "2026-11-03T11:22:00Z", parents: ["8d2a5c1"], branch: "main", isMerge: false,
        files: [{ path: "src/ui/CommitDialog.js", status: "A" }, { path: "src/ui/DiffView.js", status: "A" }],
        diff: `+function renderDiff(diffText) { ... }` },
      { hash: "8d2a5c1", short: "8d2a5c1", message: "Basic commit list with author and relative time", author: "Mira C.", email: "mira@studio.dev", date: "2026-11-01T16:40:00Z", parents: ["4e1b9f0"], branch: "main", isMerge: false,
        files: [{ path: "src/ui/CommitList.js", status: "A" }, { path: "src/utils/time.js", status: "A" }],
        diff: `+export function relativeTime(iso) { ... }` },
      { hash: "4e1b9f0", short: "4e1b9f0", message: "Initial project scaffold and README", author: "Elena R.", email: "elena@studio.dev", date: "2026-10-28T09:15:00Z", parents: [], branch: "main", isMerge: false,
        files: [{ path: "README.md", status: "A" }, { path: "package.json", status: "A" }, { path: "src/app.js", status: "A" }],
        diff: `+# Git Lens Workbench
+Zero-dependency visual Git explorer.` }
    ];

    // Reverse for chronological processing (oldest first)
    const COMMITS_ASC = [...COMMITS].reverse();

    const FILES = [
      "src/app.js", "src/graph/layout.js", "src/graph/render.js", "src/graph/events.js",
      "src/graph/lanes.js", "src/auth/session.js", "src/auth/login.js", "src/auth/token.js",
      "src/auth/index.js", "src/git/parse.js", "src/git/history.js", "src/git/blame.js",
      "src/ui/CommitList.js", "src/ui/CommitDialog.js", "src/ui/DiffView.js",
      "src/a11y/focus.js", "src/utils/time.js", "styles/tokens.css", "styles/themes.css",
      "README.md", "package.json"
    ];

    // ============================================================
    // UTILITIES
    // ============================================================
    const uid = () => Math.random().toString(36).slice(2, 9);
    function escapeHtml(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
    function formatDate(iso) {
      try {
        return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
      } catch { return iso; }
    }
    function relativeTime(iso) {
      const diff = (Date.now() - new Date(iso).getTime()) / 1000;
      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
      if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
      if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
      if (diff < 604800) return rtf.format(-Math.round(diff / 86400), "day");
      return formatDate(iso);
    }
    function debounce(fn, ms = 180) {
      let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    }
    function toast(msg, ms = 2600) {
      const region = document.getElementById("toasts");
      const el = document.createElement("div");
      el.className = "toast"; el.textContent = msg;
      region.appendChild(el);
      setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity 0.25s"; setTimeout(() => el.remove(), 260); }, ms);
    }

    // ============================================================
    // STORAGE & STATE
    // ============================================================
    const STORAGE_KEY = "git-lens-v1";
    function loadStore() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const d = JSON.parse(raw);
        return d?.version === 1 ? d : null;
      } catch { return null; }
    }
    function saveStore(s) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          version: 1, favorites: [...s.favorites], settings: s.settings, notes: s.notes
        }));
        return true;
      } catch { toast("Storage unavailable"); return false; }
    }

    const defaultSettings = { theme: "system", motion: "system" };
    function createState() {
      const saved = loadStore();
      return {
        favorites: new Set(saved?.favorites || []),
        notes: saved?.notes || {},
        settings: { ...defaultSettings, ...(saved?.settings || {}) },
        route: { path: "/", params: {} },
        filters: { query: "", branch: "all", author: "all" },
        selectedHash: null,
        selectedFile: null,
        graphMode: "repo" // repo | file
      };
    }

    let state = createState();
    const listeners = new Set();
    function getState() { return state; }
    function setState(partial) {
      state = { ...state, ...partial };
      if (partial.favorites || partial.settings || partial.notes) saveStore(state);
      listeners.forEach(fn => fn(state));
    }
    function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

    function dispatch(action) {
      switch (action.type) {
        case "SET_ROUTE": setState({ route: action.route }); break;
        case "SET_FILTERS": setState({ filters: { ...state.filters, ...action.filters } }); break;
        case "SELECT_COMMIT": setState({ selectedHash: action.hash }); break;
        case "SELECT_FILE": setState({ selectedFile: action.path, graphMode: action.path ? "file" : "repo" }); break;
        case "TOGGLE_FAV": {
          const next = new Set(state.favorites);
          if (next.has(action.hash)) next.delete(action.hash); else next.add(action.hash);
          setState({ favorites: next });
          toast(next.has(action.hash) ? "Bookmarked" : "Removed bookmark");
          break;
        }
        case "SET_SETTINGS":
          setState({ settings: { ...state.settings, ...action.settings } });
          applySettings();
          break;
        case "RESET":
          setState({ favorites: new Set(), notes: {}, settings: { ...defaultSettings } });
          applySettings();
          toast("Local data reset");
          break;
      }
    }

    // ============================================================
    // THEME
    // ============================================================
    function applySettings() {
      const { theme, motion } = state.settings;
      const root = document.documentElement;
      if (theme === "system") {
        root.dataset.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } else root.dataset.theme = theme;
      if (motion === "system") root.removeAttribute("data-motion");
      else root.dataset.motion = motion;
      const isDark = root.dataset.theme === "dark";
      document.querySelector(".icon-sun")?.classList.toggle("hidden", isDark);
      document.querySelector(".icon-moon")?.classList.toggle("hidden", !isDark);
    }

    // ============================================================
    // ROUTING (hash)
    // ============================================================
    function parseHash() {
      const hash = location.hash.slice(1) || "/";
      const parts = hash.replace(/\/$/, "").split("/").filter(Boolean);
      if (!parts.length) return { path: "/", params: {} };
      if (parts[0] === "graph") return { path: "/graph", params: {} };
      if (parts[0] === "history") return { path: "/history", params: { file: parts[1] ? decodeURIComponent(parts[1]) : null } };
      if (parts[0] === "commits") return { path: "/commits", params: {} };
      if (parts[0] === "commit" && parts[1]) return { path: "/commit", params: { hash: parts[1] } };
      if (parts[0] === "settings") return { path: "/settings", params: {} };
      return { path: "/404", params: {} };
    }
    function navigate(to, { replace = false } = {}) {
      const url = to.startsWith("#") ? to : `#${to}`;
      if (replace) history.replaceState(null, "", url);
      else history.pushState(null, "", url);
      handleRoute();
    }
    function handleRoute() {
      const route = parseHash();
      dispatch({ type: "SET_ROUTE", route });
      if (route.path === "/history" && route.params.file) {
        dispatch({ type: "SELECT_FILE", path: route.params.file });
      }
      updateNav(route.path);
      render();
      document.getElementById("main")?.focus({ preventScroll: true });
    }
    function updateNav(path) {
      document.querySelectorAll("[data-route]").forEach(el => {
        const r = el.getAttribute("data-route");
        el.setAttribute("aria-current", (r === path || (r === "/history" && path === "/history")) ? "page" : "false");
      });
    }

    // ============================================================
    // GRAPH LAYOUT ENGINE
    // ============================================================
    function buildGraphLayout(commits, { fileFilter = null } = {}) {
      // Filter commits that touch the file (for file-history mode)
      let list = [...commits];
      if (fileFilter) {
        list = list.filter(c => c.files.some(f => f.path === fileFilter));
      }
      // Work oldest → newest for lane assignment
      const ordered = [...list].reverse();
      const hashToCommit = Object.fromEntries(ordered.map(c => [c.hash, c]));
      const positions = new Map(); // hash → { x, y, lane, color }
      const lanes = []; // active lane occupancy
      const ROW_H = 56;
      const LANE_W = 28;
      const PAD_X = 40;
      const PAD_Y = 28;

      function allocLane() {
        for (let i = 0; i < lanes.length; i++) if (lanes[i] === null) return i;
        lanes.push(null);
        return lanes.length - 1;
      }

      ordered.forEach((c, idx) => {
        let lane;
        // Prefer parent lane
        if (c.parents.length && positions.has(c.parents[0])) {
          lane = positions.get(c.parents[0]).lane;
        } else {
          lane = allocLane();
        }
        // Free parent lanes that are no longer needed (simplified)
        c.parents.forEach(p => {
          // keep simple: we don't free aggressively
        });
        lanes[lane] = c.hash;
        const color = BRANCH_COLORS[c.branch] || BRANCH_COLORS.main;
        positions.set(c.hash, {
          x: PAD_X + lane * LANE_W,
          y: PAD_Y + idx * ROW_H,
          lane,
          color,
          commit: c
        });
      });

      // Edges
      const edges = [];
      ordered.forEach(c => {
        const to = positions.get(c.hash);
        c.parents.forEach(ph => {
          const from = positions.get(ph);
          if (from && to) {
            edges.push({ from, to, isMerge: c.isMerge && c.parents[0] !== ph });
          }
        });
      });

      const width = PAD_X + Math.max(3, lanes.length) * LANE_W + 420;
      const height = PAD_Y * 2 + ordered.length * ROW_H;
      return { positions, edges, width, height, ordered };
    }

    function renderGraphSVG(container, layout, { onSelect } = {}) {
      container.replaceChildren();
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "graph-svg");
      svg.setAttribute("width", layout.width);
      svg.setAttribute("height", layout.height);
      svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Commit graph");

      // Edges first
      const edgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      layout.edges.forEach(e => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const midY = (e.from.y + e.to.y) / 2;
        const d = e.from.x === e.to.x
          ? `M${e.from.x},${e.from.y} L${e.to.x},${e.to.y}`
          : `M${e.from.x},${e.from.y} C${e.from.x},${midY} ${e.to.x},${midY} ${e.to.x},${e.to.y}`;
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", e.isMerge ? "oklch(0.75 0.14 310)" : e.to.color);
        path.setAttribute("stroke-width", e.isMerge ? "2" : "1.75");
        path.setAttribute("opacity", "0.85");
        edgeGroup.appendChild(path);
      });
      svg.appendChild(edgeGroup);

      // Nodes + labels
      const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      layout.ordered.forEach(c => {
        const pos = layout.positions.get(c.hash);
        if (!pos) return;
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "graph-node");
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", `${c.short}: ${c.message}`);
        g.dataset.hash = c.hash;
        if (state.selectedHash === c.hash) g.setAttribute("aria-selected", "true");

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", pos.x);
        circle.setAttribute("cy", pos.y);
        circle.setAttribute("r", c.isMerge ? 8 : 6);
        circle.setAttribute("fill", pos.color);
        circle.setAttribute("stroke", "var(--bg)");
        circle.setAttribute("stroke-width", "2");
        g.appendChild(circle);

        if (c.isMerge) {
          const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          inner.setAttribute("cx", pos.x);
          inner.setAttribute("cy", pos.y);
          inner.setAttribute("r", 3);
          inner.setAttribute("fill", "var(--bg)");
          g.appendChild(inner);
        }

        const hashText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        hashText.setAttribute("x", pos.x + 16);
        hashText.setAttribute("y", pos.y - 6);
        hashText.setAttribute("class", "graph-label");
        hashText.textContent = c.short;
        g.appendChild(hashText);

        const msgText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        msgText.setAttribute("x", pos.x + 16);
        msgText.setAttribute("y", pos.y + 10);
        msgText.setAttribute("class", "graph-msg");
        const msg = c.message.length > 52 ? c.message.slice(0, 50) + "…" : c.message;
        msgText.textContent = msg;
        g.appendChild(msgText);

        g.addEventListener("click", () => onSelect?.(c.hash));
        g.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelect?.(c.hash); }
        });
        nodeGroup.appendChild(g);
      });
      svg.appendChild(nodeGroup);
      container.appendChild(svg);
    }

    // ============================================================
    // FILE HISTORY HELPERS
    // ============================================================
    function commitsForFile(path) {
      return COMMITS.filter(c => c.files.some(f => f.path === path));
    }

    // ============================================================
    // CAPABILITY INSPECTOR
    // ============================================================
    function detectCapabilities() {
      const s = (cond) => { try { return !!cond; } catch { return false; } };
      return [
        { name: "View Transitions", on: s(document.startViewTransition), desc: "Smooth view changes" },
        { name: "Container Queries", on: CSS.supports("container-type", "inline-size"), desc: "Adaptive commit rows" },
        { name: "Popover API", on: s(HTMLElement.prototype.hasOwnProperty("popover")), desc: "Capability panel" },
        { name: "<dialog>", on: s(typeof HTMLDialogElement !== "undefined"), desc: "Commit detail modal" },
        { name: ":has()", on: CSS.supports("selector(:has(*))"), desc: "Parent-state styling" },
        { name: "CSS Nesting", on: CSS.supports("selector(&)"), desc: "Organized styles" },
        { name: "Anchor Positioning", on: CSS.supports("anchor-name", "--a"), desc: "Future popover placement" },
        { name: "Scroll-driven Anim", on: CSS.supports("animation-timeline", "scroll()"), desc: "Progress effects" },
        { name: "Web Animations", on: s(Element.prototype.animate), desc: "Micro-interactions" },
        { name: "Canvas 2D", on: s(document.createElement("canvas").getContext("2d")), desc: "Hero particles" },
        { name: "localStorage", on: (() => { try { localStorage.setItem("__t","1"); localStorage.removeItem("__t"); return true; } catch { return false; } })(), desc: "Bookmarks & settings" },
        { name: "Clipboard API", on: s(navigator.clipboard?.writeText), desc: "Copy commit hash" },
        { name: "Intl.RelativeTime", on: s(Intl.RelativeTimeFormat), desc: "Relative dates" }
      ];
    }
    function renderCapabilities() {
      const list = document.getElementById("cap-list");
      if (!list) return;
      list.replaceChildren(...detectCapabilities().map(c => {
        const row = document.createElement("div");
        row.className = "cap-item";
        row.innerHTML = `
          <span class="cap-dot ${c.on ? "on" : "off"}"></span>
          <span class="cap-name">${escapeHtml(c.name)}</span>
          <span class="text-xs" style="color:var(--text-faint)">${c.on ? "active" : "n/a"}</span>
          <span class="cap-desc">${escapeHtml(c.desc)}</span>`;
        return row;
      }));
    }

    // ============================================================
    // COMMIT DETAIL DIALOG
    // ============================================================
    function openCommitDialog(hash) {
      const c = COMMITS.find(x => x.hash === hash);
      if (!c) return;
      const dialog = document.getElementById("commit-dialog");
      document.getElementById("dlg-title").textContent = c.short;
      const body = document.getElementById("dlg-body");
      body.replaceChildren();

      const head = document.createElement("div");
      head.innerHTML = `
        <p style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-2)">${escapeHtml(c.message)}</p>
        <p class="text-sm text-muted">${escapeHtml(c.author)} · ${formatDate(c.date)} · <span class="mono">${c.hash}</span></p>
        <div class="chip-group mt-2" style="margin-top:var(--space-3)">
          <span class="badge ${c.isMerge ? "badge-merge" : "badge-branch"}">${c.isMerge ? "merge" : escapeHtml(c.branch)}</span>
        </div>`;
      body.appendChild(head);

      const filesTitle = document.createElement("h3");
      filesTitle.className = "text-sm"; filesTitle.style.margin = "var(--space-5) 0 var(--space-2)";
      filesTitle.style.fontWeight = "650"; filesTitle.textContent = "Files changed";
      body.appendChild(filesTitle);

      const fileList = document.createElement("div");
      fileList.className = "file-list";
      c.files.forEach(f => {
        const row = document.createElement("div");
        row.className = "file-row";
        row.innerHTML = `<span class="status ${f.status}">${f.status}</span><span>${escapeHtml(f.path)}</span>`;
        row.addEventListener("click", () => {
          dialog.close();
          navigate(`#/history/${encodeURIComponent(f.path)}`);
        });
        fileList.appendChild(row);
      });
      body.appendChild(fileList);

      if (c.diff) {
        const diffTitle = document.createElement("h3");
        diffTitle.className = "text-sm"; diffTitle.style.margin = "var(--space-5) 0 var(--space-2)";
        diffTitle.style.fontWeight = "650"; diffTitle.textContent = "Diff excerpt";
        body.appendChild(diffTitle);
        const pre = document.createElement("pre");
        pre.className = "diff-view card-body";
        pre.style.background = "var(--bg)"; pre.style.borderRadius = "var(--radius)";
        pre.style.padding = "var(--space-3)";
        c.diff.split("\n").forEach(line => {
          const span = document.createElement("div");
          if (line.startsWith("+") && !line.startsWith("+++")) span.className = "diff-add";
          else if (line.startsWith("-") && !line.startsWith("---")) span.className = "diff-del";
          else if (line.startsWith("@@")) span.className = "diff-hunk";
          span.textContent = line;
          pre.appendChild(span);
        });
        body.appendChild(pre);
      }

      const footer = document.getElementById("dlg-footer");
      footer.replaceChildren();
      const copyBtn = document.createElement("button");
      copyBtn.type = "button"; copyBtn.className = "btn btn-secondary"; copyBtn.textContent = "Copy hash";
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(c.hash);
          toast("Hash copied");
        } catch { toast("Clipboard unavailable"); }
      });
      const favBtn = document.createElement("button");
      favBtn.type = "button"; favBtn.className = "btn btn-secondary";
      favBtn.textContent = state.favorites.has(c.hash) ? "Unbookmark" : "Bookmark";
      favBtn.addEventListener("click", () => {
        dispatch({ type: "TOGGLE_FAV", hash: c.hash });
        favBtn.textContent = state.favorites.has(c.hash) ? "Unbookmark" : "Bookmark";
      });
      const closeBtn = document.createElement("button");
      closeBtn.type = "button"; closeBtn.className = "btn btn-primary"; closeBtn.textContent = "Close";
      closeBtn.addEventListener("click", () => dialog.close());
      footer.append(copyBtn, favBtn, closeBtn);

      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }

    // ============================================================
    // VIEWS
    // ============================================================
    function renderOverview() {
      const main = document.getElementById("main");
      document.getElementById("main-layout").classList.remove("has-sidebar");
      document.getElementById("sidebar").replaceChildren();
      main.replaceChildren();

      const hero = document.createElement("section");
      hero.className = "hero";
      hero.innerHTML = `
        <canvas class="hero-visual" aria-hidden="true"></canvas>
        <div class="hero-content">
          <h1>Git Lens Workbench</h1>
          <p>Explore commits, merges, and file lineage as a living graph. Branch lanes, merge joins, and interactive diffs — all local, zero dependencies.</p>
          <div class="hero-actions">
            <a href="#/graph" class="btn btn-primary" data-link>Open Commit Graph</a>
            <a href="#/history" class="btn btn-secondary" data-link>File History</a>
          </div>
        </div>`;
      main.appendChild(hero);
      requestAnimationFrame(() => startHeroCanvas(hero.querySelector("canvas")));

      const stats = document.createElement("div");
      stats.className = "stats-row";
      const branches = new Set(COMMITS.map(c => c.branch));
      const merges = COMMITS.filter(c => c.isMerge).length;
      stats.innerHTML = `
        <div class="stat-card"><div class="stat-value">${COMMITS.length}</div><div class="stat-label">Commits</div></div>
        <div class="stat-card"><div class="stat-value">${branches.size}</div><div class="stat-label">Branches</div></div>
        <div class="stat-card"><div class="stat-value">${merges}</div><div class="stat-label">Merges</div></div>
        <div class="stat-card"><div class="stat-value">${state.favorites.size}</div><div class="stat-label">Bookmarks</div></div>`;
      main.appendChild(stats);

      // Mini recent commits
      const section = document.createElement("section");
      section.innerHTML = `<h2 style="font-size:var(--text-xl);margin-bottom:var(--space-4)">Recent activity</h2>`;
      const list = document.createElement("div");
      list.className = "commit-list card";
      COMMITS.slice(0, 6).forEach(c => {
        const row = document.createElement("div");
        row.className = "commit-row";
        row.innerHTML = `
          <span class="lane-dot" style="background:${BRANCH_COLORS[c.branch] || BRANCH_COLORS.main}"></span>
          <div>
            <div class="msg">${escapeHtml(c.message)}</div>
            <div class="meta"><span class="hash">${c.short}</span> · ${escapeHtml(c.author)} · ${relativeTime(c.date)}</div>
          </div>
          ${c.isMerge ? '<span class="badge badge-merge">merge</span>' : ""}`;
        row.addEventListener("click", () => openCommitDialog(c.hash));
        list.appendChild(row);
      });
      section.appendChild(list);
      main.appendChild(section);
      document.title = "Overview · Git Lens Workbench";
    }

    function renderGraph() {
      const main = document.getElementById("main");
      document.getElementById("main-layout").classList.remove("has-sidebar");
      document.getElementById("sidebar").replaceChildren();
      main.replaceChildren();

      const header = document.createElement("div");
      header.className = "page-header";
      header.innerHTML = `
        <div>
          <h1 class="page-title">Commit Graph</h1>
          <p class="page-desc">Full repository history. Nodes are commits; colored lanes are branches; purple edges indicate merges. Click any node for details.</p>
        </div>`;
      main.appendChild(header);

      const wrap = document.createElement("div");
      wrap.className = "graph-wrap";
      wrap.id = "graph-container";
      main.appendChild(wrap);

      const layout = buildGraphLayout(COMMITS);
      renderGraphSVG(wrap, layout, {
        onSelect: (hash) => {
          dispatch({ type: "SELECT_COMMIT", hash });
          openCommitDialog(hash);
        }
      });
      document.title = "Graph · Git Lens Workbench";
    }

    function renderFileHistory() {
      const main = document.getElementById("main");
      document.getElementById("main-layout").classList.add("has-sidebar");
      const sidebar = document.getElementById("sidebar");
      sidebar.replaceChildren();

      // File picker
      const title = document.createElement("h3");
      title.className = "text-sm"; title.style.fontWeight = "650"; title.style.color = "var(--text-muted)";
      title.style.marginBottom = "var(--space-2)"; title.textContent = "Files";
      sidebar.appendChild(title);

      const search = document.createElement("div");
      search.className = "search-bar"; search.style.marginBottom = "var(--space-3)";
      search.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>`;
      const input = document.createElement("input");
      input.type = "search"; input.placeholder = "Filter files…"; input.setAttribute("aria-label", "Filter files");
      search.appendChild(input);
      sidebar.appendChild(search);

      const fileList = document.createElement("div");
      fileList.className = "file-list";
      sidebar.appendChild(fileList);

      function renderFileList(q = "") {
        fileList.replaceChildren();
        const filtered = FILES.filter(f => f.toLowerCase().includes(q.toLowerCase()));
        filtered.forEach(path => {
          const row = document.createElement("button");
          row.type = "button"; row.className = "file-row";
          row.style.width = "100%"; row.style.textAlign = "left";
          row.textContent = path;
          if (state.selectedFile === path) row.style.background = "var(--surface)";
          row.addEventListener("click", () => {
            dispatch({ type: "SELECT_FILE", path });
            navigate(`#/history/${encodeURIComponent(path)}`, { replace: true });
            renderFileHistoryMain();
          });
          fileList.appendChild(row);
        });
      }
      input.addEventListener("input", debounce(e => renderFileList(e.target.value)));
      renderFileList();

      renderFileHistoryMain();
      document.title = "File History · Git Lens Workbench";
    }

    function renderFileHistoryMain() {
      const main = document.getElementById("main");
      // Keep sidebar, only refresh main content
      const existingHeader = main.querySelector(".page-header");
      if (existingHeader) main.replaceChildren();

      const path = state.selectedFile;
      const header = document.createElement("div");
      header.className = "page-header";
      header.innerHTML = `
        <div>
          <h1 class="page-title">File History</h1>
          <p class="page-desc">${path ? `<span class="mono">${escapeHtml(path)}</span> — commits that touched this file, shown as a lineage graph.` : "Select a file to see its commit lineage and how branches split around it."}</p>
        </div>`;
      main.appendChild(header);

      if (!path) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.innerHTML = `<h3>No file selected</h3><p>Choose a path from the sidebar to visualize its history.</p>`;
        main.appendChild(empty);
        return;
      }

      const commits = commitsForFile(path);
      if (!commits.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.innerHTML = `<h3>No history</h3><p>This path has no recorded changes in the sample repository.</p>`;
        main.appendChild(empty);
        return;
      }

      const wrap = document.createElement("div");
      wrap.className = "graph-wrap";
      main.appendChild(wrap);
      const layout = buildGraphLayout(commits, { fileFilter: path });
      renderGraphSVG(wrap, layout, {
        onSelect: (hash) => openCommitDialog(hash)
      });

      // Also list the commits for this file
      const listTitle = document.createElement("h3");
      listTitle.style.cssText = "font-size:var(--text-lg);margin:var(--space-6) 0 var(--space-3)";
      listTitle.textContent = `${commits.length} commit${commits.length === 1 ? "" : "s"}`;
      main.appendChild(listTitle);
      const list = document.createElement("div");
      list.className = "commit-list card";
      commits.forEach(c => {
        const f = c.files.find(x => x.path === path);
        const row = document.createElement("div");
        row.className = "commit-row";
        row.innerHTML = `
          <span class="lane-dot" style="background:${BRANCH_COLORS[c.branch] || BRANCH_COLORS.main}"></span>
          <div>
            <div class="msg">${escapeHtml(c.message)}</div>
            <div class="meta"><span class="hash">${c.short}</span> · ${escapeHtml(c.author)} · <span class="status ${f?.status}">${f?.status || "?"}</span></div>
          </div>`;
        row.addEventListener("click", () => openCommitDialog(c.hash));
        list.appendChild(row);
      });
      main.appendChild(list);
    }

    function renderCommits() {
      const main = document.getElementById("main");
      document.getElementById("main-layout").classList.add("has-sidebar");
      const sidebar = document.getElementById("sidebar");
      sidebar.replaceChildren();

      // Filters
      const searchWrap = document.createElement("div");
      searchWrap.className = "search-bar";
      searchWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>`;
      const searchInput = document.createElement("input");
      searchInput.type = "search"; searchInput.placeholder = "Search message, author, hash…";
      searchInput.value = state.filters.query;
      searchInput.addEventListener("input", debounce(e => {
        dispatch({ type: "SET_FILTERS", filters: { query: e.target.value } });
        renderCommitList();
      }));
      searchWrap.appendChild(searchInput);
      sidebar.appendChild(searchWrap);

      const branchTitle = document.createElement("h3");
      branchTitle.className = "text-sm"; branchTitle.style.cssText = "font-weight:650;color:var(--text-muted);margin:var(--space-4) 0 var(--space-2)";
      branchTitle.textContent = "Branch";
      sidebar.appendChild(branchTitle);
      const branchGroup = document.createElement("div");
      branchGroup.className = "chip-group";
      const branches = ["all", ...new Set(COMMITS.map(c => c.branch))];
      branches.forEach(b => {
        const chip = document.createElement("button");
        chip.type = "button"; chip.className = "chip"; chip.textContent = b;
        chip.setAttribute("aria-pressed", String(state.filters.branch === b));
        chip.addEventListener("click", () => {
          dispatch({ type: "SET_FILTERS", filters: { branch: b } });
          renderCommits();
        });
        branchGroup.appendChild(chip);
      });
      sidebar.appendChild(branchGroup);

      main.replaceChildren();
      const header = document.createElement("div");
      header.className = "page-header";
      header.innerHTML = `<div><h1 class="page-title">Commit Log</h1><p class="page-desc">Searchable, filterable history of every commit.</p></div>`;
      main.appendChild(header);

      const results = document.createElement("div");
      results.id = "commit-results";
      main.appendChild(results);
      renderCommitList();
      document.title = "Commits · Git Lens Workbench";
    }

    function renderCommitList() {
      const results = document.getElementById("commit-results");
      if (!results) return;
      const { query, branch } = state.filters;
      let list = [...COMMITS];
      if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(c =>
          c.message.toLowerCase().includes(q) ||
          c.author.toLowerCase().includes(q) ||
          c.hash.includes(q) ||
          c.short.includes(q)
        );
      }
      if (branch !== "all") list = list.filter(c => c.branch === branch);

      results.replaceChildren();
      const count = document.createElement("p");
      count.className = "text-sm text-muted mb-4";
      count.textContent = `${list.length} commit${list.length === 1 ? "" : "s"}`;
      results.appendChild(count);

      if (!list.length) {
        results.innerHTML += `<div class="empty-state"><h3>No commits match</h3><p>Try a different query or branch filter.</p></div>`;
        return;
      }

      const listEl = document.createElement("div");
      listEl.className = "commit-list card";
      list.forEach(c => {
        const row = document.createElement("div");
        row.className = "commit-row";
        row.innerHTML = `
          <span class="lane-dot" style="background:${BRANCH_COLORS[c.branch] || BRANCH_COLORS.main}"></span>
          <div>
            <div class="msg">${escapeHtml(c.message)}</div>
            <div class="meta"><span class="hash">${c.short}</span> · ${escapeHtml(c.author)} · ${relativeTime(c.date)} · ${escapeHtml(c.branch)}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${c.isMerge ? '<span class="badge badge-merge">merge</span>' : ""}
            <button type="button" class="fav-btn btn-icon" aria-pressed="${state.favorites.has(c.hash)}" aria-label="Bookmark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${state.favorites.has(c.hash) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </button>
          </div>`;
        row.querySelector(".fav-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          dispatch({ type: "TOGGLE_FAV", hash: c.hash });
          renderCommitList();
        });
        row.addEventListener("click", () => openCommitDialog(c.hash));
        listEl.appendChild(row);
      });
      results.appendChild(listEl);
    }

    function renderSettings() {
      const main = document.getElementById("main");
      document.getElementById("main-layout").classList.remove("has-sidebar");
      main.replaceChildren();
      const header = document.createElement("div");
      header.className = "page-header";
      header.innerHTML = `<div><h1 class="page-title">System</h1><p class="page-desc">Theme, motion preference, and local data.</p></div>`;
      main.appendChild(header);

      const grid = document.createElement("div");
      grid.style.cssText = "display:grid;gap:var(--space-5);max-width:520px";

      const appear = document.createElement("div");
      appear.className = "card";
      appear.innerHTML = `<div class="card-header"><span class="card-title">Appearance</span></div>`;
      const body = document.createElement("div");
      body.className = "card-body"; body.style.display = "flex"; body.style.flexDirection = "column"; body.style.gap = "var(--space-4)";
      const themeField = document.createElement("div");
      themeField.className = "field";
      themeField.innerHTML = `<label>Color theme</label>`;
      const themeSelect = document.createElement("select");
      [["system","System"],["dark","Dark"],["light","Light"]].forEach(([v,l]) => {
        const o = document.createElement("option"); o.value = v; o.textContent = l;
        if (state.settings.theme === v) o.selected = true;
        themeSelect.appendChild(o);
      });
      themeSelect.addEventListener("change", () => dispatch({ type: "SET_SETTINGS", settings: { theme: themeSelect.value } }));
      themeField.appendChild(themeSelect);
      body.appendChild(themeField);

      const motionField = document.createElement("div");
      motionField.className = "field";
      motionField.innerHTML = `<label>Motion</label>`;
      const motionSelect = document.createElement("select");
      [["system","System preference"],["full","Full motion"],["reduce","Reduced motion"]].forEach(([v,l]) => {
        const o = document.createElement("option"); o.value = v; o.textContent = l;
        if (state.settings.motion === v) o.selected = true;
        motionSelect.appendChild(o);
      });
      motionSelect.addEventListener("change", () => dispatch({ type: "SET_SETTINGS", settings: { motion: motionSelect.value } }));
      motionField.appendChild(motionSelect);
      body.appendChild(motionField);
      appear.appendChild(body);
      grid.appendChild(appear);

      const dataCard = document.createElement("div");
      dataCard.className = "card";
      dataCard.innerHTML = `<div class="card-header"><span class="card-title">Local data</span></div>`;
      const dataBody = document.createElement("div");
      dataBody.className = "card-body";
      const resetBtn = document.createElement("button");
      resetBtn.type = "button"; resetBtn.className = "btn btn-secondary"; resetBtn.textContent = "Clear bookmarks & settings";
      resetBtn.addEventListener("click", () => dispatch({ type: "RESET" }));
      dataBody.appendChild(resetBtn);
      dataCard.appendChild(dataBody);
      grid.appendChild(dataCard);

      const about = document.createElement("div");
      about.className = "card";
      about.innerHTML = `
        <div class="card-header"><span class="card-title">About</span></div>
        <div class="card-body text-sm text-muted" style="line-height:1.65">
          <p>Git Lens Workbench is a demonstration SPA that visualizes a simulated Git repository. All data is local and illustrative. No real Git process is invoked.</p>
        </div>`;
      grid.appendChild(about);
      main.appendChild(grid);
      document.title = "System · Git Lens Workbench";
    }

    function render404() {
      const main = document.getElementById("main");
      document.getElementById("main-layout").classList.remove("has-sidebar");
      main.innerHTML = `<div class="empty-state"><h1 class="page-title">Not found</h1><p class="page-desc" style="margin:var(--space-3) auto">This route does not exist.</p><a href="#/" class="btn btn-primary" data-link>Overview</a></div>`;
      document.title = "Not Found · Git Lens Workbench";
    }

    // ============================================================
    // HERO CANVAS
    // ============================================================
    let heroAnim = null;
    function startHeroCanvas(canvas) {
      if (!canvas) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.dataset.motion === "reduce";
      const dpr = Math.min(devicePixelRatio || 1, 2);
      let w, h;
      const nodes = [];
      function resize() {
        w = canvas.clientWidth; h = canvas.clientHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function init() {
        nodes.length = 0;
        for (let i = 0; i < (reduce ? 8 : 18); i++) {
          nodes.push({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.3,
            r: 2 + Math.random() * 2.5, a: 0.2 + Math.random() * 0.4
          });
        }
      }
      resize(); init();
      new ResizeObserver(() => { resize(); init(); }).observe(canvas);

      function frame() {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
        const g = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.8);
        g.addColorStop(0, "oklch(0.35 0.08 195 / 0.3)");
        g.addColorStop(1, "oklch(0.15 0.02 220 / 0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        if (reduce) return;
        // simple links
        ctx.strokeStyle = "oklch(0.7 0.1 195 / 0.15)";
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            if (dx * dx + dy * dy < 120 * 120) {
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
        }
        nodes.forEach(n => {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = `oklch(0.78 0.12 195 / ${n.a})`; ctx.fill();
        });
        heroAnim = requestAnimationFrame(frame);
      }
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { if (!heroAnim) heroAnim = requestAnimationFrame(frame); }
        else { cancelAnimationFrame(heroAnim); heroAnim = null; }
      }, { threshold: 0.1 });
      io.observe(canvas);
      if (!reduce) heroAnim = requestAnimationFrame(frame);
      else frame();
    }

    // ============================================================
    // RENDER DISPATCH
    // ============================================================
    function render() {
      const path = state.route.path;
      const update = () => {
        if (path === "/") renderOverview();
        else if (path === "/graph") renderGraph();
        else if (path === "/history") renderFileHistory();
        else if (path === "/commits") renderCommits();
        else if (path === "/commit") { openCommitDialog(state.route.params.hash); renderGraph(); }
        else if (path === "/settings") renderSettings();
        else render404();
      };
      if (document.startViewTransition && document.documentElement.dataset.motion !== "reduce") {
        document.startViewTransition(update);
      } else update();
    }

    // ============================================================
    // WIRING
    // ============================================================
    document.addEventListener("click", e => {
      const link = e.target.closest("[data-link]");
      if (link?.href) {
        const url = new URL(link.href);
        if (url.origin === location.origin && url.hash) {
          e.preventDefault();
          navigate(url.hash);
        }
      }
    });
    window.addEventListener("popstate", handleRoute);
    window.addEventListener("hashchange", handleRoute);
    document.getElementById("btn-theme")?.addEventListener("click", () => {
      const cur = state.settings.theme;
      const next = cur === "dark" ? "light" : cur === "light" ? "system" : "dark";
      dispatch({ type: "SET_SETTINGS", settings: { theme: next } });
      toast(`Theme: ${next}`);
    });
    document.getElementById("dlg-close")?.addEventListener("click", () => document.getElementById("commit-dialog").close());
    document.getElementById("commit-dialog")?.addEventListener("click", e => {
      if (e.target === e.currentTarget) e.currentTarget.close();
    });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (state.settings.theme === "system") applySettings();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") document.getElementById("commit-dialog")?.close();
    });

    applySettings();
    renderCapabilities();
    handleRoute();
