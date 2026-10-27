# Sharpishly Skills & Agents Architecture (`SKILLS & AGENTS.md`)

This document outlines the architecture, integration patterns, and operational guidelines for agent execution, skill modularity, and automated task routing within the Sharpishly ecosystem.

---

## 1. Core Philosophy

In alignment with our zero-dependency, low-abstraction ethos and Paul Graham's principle of *"Don't do things that scale,"* agents and skills within Sharpishly are designed as lightweight, decoupled routines rather than heavy, framework-bound autonomous systems. 

* **Direct Execution**: Skills encapsulate specific domain logic or workflow patterns as modular components.
* **Asynchronous Integration**: Agents leverage our native file-backed job queue (`storage/jobs/`) for execution, state persistence, and recovery.
* **Deterministic Routing**: Task dispatching relies on explicit handler maps and platform registries rather than opaque reflection or magical auto-discovery.

---

## 2. Skill Architecture

Skills represent reusable functional blocks or specialized assistant capabilities.

### Structure & Conventions
* **Modular Placement**: Skills reside in dedicated namespaces or directories within the application framework.
* **Zero Bloat**: Skills execute without external third-party SDK dependencies where native PHP constructs suffice.
* **Stateless Operation**: Skills accept structured input arrays (payloads) and return deterministic results or throw explicit exceptions upon failure.

---

## 3. Agent & Worker Architecture

Background agents run as long-lived CLI processes (`PHP_SAPI === 'cli'`) coordinated via shell dispatchers and monitored through disk-based states.

### Lifecycle & State Machine
Every agent task transitions through clear disk-backed states:
1. **`queued/`**: Submitted tasks awaiting worker pickup.
2. **`processing/`**: Actively claimed tasks locked via file locking (`flock()`).
3. **`completed/`**: Successfully executed tasks containing execution metadata and results.
4. **`failed/`**: Interrupted or errored tasks preserved for inspection and recovery.

### Execution Flow Example
```php
// Agent worker loop processing dispatched jobs through platform handlers
$handlers = [
    'indeed'   => fn(array $job) => (new IndeedClient())->submit($job),
    'linkedin' => fn(array $job) => (new LinkedInClient())->submit($job),
    // Additional platform handlers...
];