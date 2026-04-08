import fs from "node:fs/promises";
import path from "node:path";

const GLOBAL_MEMORY_VERSION = "1.0";
const GLOBAL_METADATA_TEMPLATE = {
  managedBy: "engineering-os",
  version: GLOBAL_MEMORY_VERSION,
  files: ["constitution.md", "workflow.md"]
};

const CLAUDE_IMPORT_BLOCK = [
  "<!-- engineering-os:start -->",
  "<!-- Engineering OS global memory lives in ~/.claude/engineering-os/. Run /engineering-os:install-global after plugin updates that change framework memory. -->",
  "<!-- engineering-os:end -->"
].join("\n");

const CONSTITUTION_TEMPLATE = `# Engineering OS Constitution

This repository uses the Engineering OS harness for structured software work inside Claude Code.

## Core Rules

1. Keep one owner per task.
2. Keep task scope explicit.
3. Prefer a single session unless parallelism clearly helps.
4. Require structured handoffs for substantial work.
5. Treat review as a gate, not a courtesy.

## Team Roles

- lead: planning, delegation, synthesis
- builder: bounded implementation
- reviewer: validation and regression detection
- researcher: read-only investigation

## Artifact Habit

Substantial work should leave inspectable artifacts under:

- \`.claude/artifacts/engineering-os/runs/\`
- \`.claude/artifacts/engineering-os/handoffs/\`
- \`.claude/artifacts/engineering-os/reviews/\`

## Scope Discipline

Stop and re-scope if:

- two agents need the same file
- the assignment boundary is unclear
- the work needs a broader refactor than assigned
`;

const WORKFLOW_TEMPLATE = `# Engineering OS Workflow

## Preferred Sequence

1. clarify the objective
2. choose mode: single-session or team run
3. choose pace: slow, medium, or fast
4. define task ownership and scope
5. implement or investigate
6. review before calling work done
7. leave a final synthesis

## Handoff Format

Every substantial handoff should include:

- objective
- owner
- allowed scope
- forbidden scope
- deliverable
- changed files or evidence
- confidence level
- risks or open questions
- suggested next handoff
`;

const ARTIFACT_README_TEMPLATE = `# Engineering OS Artifacts

This directory stores inspectable run artifacts for the Engineering OS harness.

- \`runs/\` for run briefs and final syntheses
- \`handoffs/\` for task ownership and completion notes
- \`reviews/\` for review results and rejection notes
`;

const STATE_README_TEMPLATE = `# Engineering OS State

This directory stores lightweight repo-local coordination state.

- \`claims.json\` tracks current file ownership claims
- \`history.jsonl\` stores append-only claim and release events
- \`approvals.jsonl\` stores approval requests and resolutions
- \`sprint.json\` is an optional sprint or focus configuration
`;

const CLAIMS_TEMPLATE = {
  version: "1.0",
  updatedAt: "2026-01-01T00:00:00.000Z",
  claims: {},
  warnings: []
};

const SPRINT_TEMPLATE = {
  focus: "P1",
  notes: [
    "Replace or remove this file if you do not use sprint-style priorities.",
    "Engineering OS keeps this repo-local so coordination remains inspectable."
  ]
};

const HOOK_SCRIPT_TEMPLATE = `#!/usr/bin/env bash
set -euo pipefail

event_name="\${1:-unknown}"
project_dir="\${CLAUDE_PROJECT_DIR:-$PWD}"
log_dir="\${project_dir}/.claude/logs"
payload_dir="\${log_dir}/payloads"
timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
stamp="$(date -u +"%Y%m%dT%H%M%SZ")"
payload_path="\${payload_dir}/\${stamp}-$$-\${event_name}.json"
events_path="\${log_dir}/events.jsonl"

mkdir -p "$payload_dir"

if [ -t 0 ]; then
  printf '{}\\n' > "$payload_path"
else
  cat > "$payload_path"
fi

printf '{"schemaVersion":"1.0","source":"engineering-os","timestamp":"%s","event":"%s","repoPath":"%s","payloadPath":"%s"}\\n' \\
  "$timestamp" \\
  "$event_name" \\
  "$project_dir" \\
  "$payload_path" >> "$events_path"
`;

const DEFAULT_SETTINGS = {
  hooks: {
    SessionStart: [
      {
        matcher: "startup|clear|compact",
        hooks: [
          {
            type: "command",
            command: "${PWD}/.claude/hooks/log_event.sh session_start",
            description: "engineering-os:session-start"
          }
        ]
      }
    ],
    TaskCreated: [
      {
        hooks: [
          {
            type: "command",
            command: "${PWD}/.claude/hooks/log_event.sh task_created",
            description: "engineering-os:task-created"
          }
        ]
      }
    ],
    TaskCompleted: [
      {
        hooks: [
          {
            type: "command",
            command: "${PWD}/.claude/hooks/log_event.sh task_completed",
            description: "engineering-os:task-completed"
          }
        ]
      }
    ],
    SubagentStart: [
      {
        hooks: [
          {
            type: "command",
            command: "${PWD}/.claude/hooks/log_event.sh subagent_start",
            description: "engineering-os:subagent-start"
          }
        ]
      }
    ],
    SubagentStop: [
      {
        hooks: [
          {
            type: "command",
            command: "${PWD}/.claude/hooks/log_event.sh subagent_stop",
            description: "engineering-os:subagent-stop"
          }
        ]
      }
    ]
  }
};

function indentJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeFileIfChanged(filePath, contents, options = {}) {
  const existing = await fs.readFile(filePath, "utf8").catch(() => null);
  if (existing === contents) {
    return false;
  }
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, options);
  return true;
}

function isEngineeringOsHook(entry) {
  const hooks = Array.isArray(entry?.hooks) ? entry.hooks : [];
  return hooks.some((hook) => {
    const command = hook?.command || "";
    const description = hook?.description || "";
    return command.includes(".claude/hooks/log_event.sh") || description.startsWith("engineering-os:");
  });
}

function mergeHooks(existingHooks = {}, desiredHooks = {}) {
  const result = { ...existingHooks };
  for (const [eventName, hookDefs] of Object.entries(desiredHooks)) {
    const current = Array.isArray(result[eventName]) ? result[eventName] : [];
    const preserved = current.filter((entry) => !isEngineeringOsHook(entry));
    const nextEntries = [...preserved];
    const seen = new Set(nextEntries.map((item) => JSON.stringify(item)));
    for (const hookDef of hookDefs) {
      const serialized = JSON.stringify(hookDef);
      if (!seen.has(serialized)) {
        nextEntries.push(hookDef);
        seen.add(serialized);
      }
    }
    result[eventName] = nextEntries;
  }
  return result;
}

async function updateClaudeMd(repoPath, writes) {
  const claudePath = path.join(repoPath, "CLAUDE.md");
  const existing = await fs.readFile(claudePath, "utf8").catch(() => null);

  if (existing === null) {
    const contents = [
      "# Repo Instructions",
      "",
      "This repository uses the Engineering OS harness.",
      "",
      CLAUDE_IMPORT_BLOCK,
      ""
    ].join("\n");
    await writeFileIfChanged(claudePath, contents);
    writes.push(path.relative(repoPath, claudePath));
    return;
  }

  if (existing.includes("<!-- engineering-os:start -->")) {
    return;
  }

  const next = `${existing.trimEnd()}\n\n${CLAUDE_IMPORT_BLOCK}\n`;
  await writeFileIfChanged(claudePath, next);
  writes.push(path.relative(repoPath, claudePath));
}

async function updateSettings(repoPath, writes) {
  const settingsPath = path.join(repoPath, ".claude", "settings.json");
  const existing = await fs.readFile(settingsPath, "utf8").catch(() => null);
  const current = existing ? JSON.parse(existing) : {};
  const next = {
    ...current,
    hooks: mergeHooks(current.hooks, DEFAULT_SETTINGS.hooks)
  };

  const changed = await writeFileIfChanged(settingsPath, indentJson(next));
  if (changed) {
    writes.push(path.relative(repoPath, settingsPath));
  }
}

async function writeHarnessFiles(repoPath, writes) {
  const files = [
    [
      path.join(repoPath, ".claude", "artifacts", "engineering-os", "README.md"),
      `${ARTIFACT_README_TEMPLATE}\n`
    ],
    [
      path.join(repoPath, ".claude", "state", "engineering-os", "README.md"),
      `${STATE_README_TEMPLATE}\n`
    ],
    [
      path.join(repoPath, ".claude", "state", "engineering-os", "claims.json"),
      `${JSON.stringify(CLAIMS_TEMPLATE, null, 2)}\n`
    ],
    [
      path.join(repoPath, ".claude", "state", "engineering-os", "history.jsonl"),
      ""
    ],
    [
      path.join(repoPath, ".claude", "state", "engineering-os", "approvals.jsonl"),
      ""
    ],
    [
      path.join(repoPath, ".claude", "state", "engineering-os", "sprint.json"),
      `${JSON.stringify(SPRINT_TEMPLATE, null, 2)}\n`
    ],
    [
      path.join(repoPath, ".claude", "hooks", "log_event.sh"),
      HOOK_SCRIPT_TEMPLATE
    ]
  ];

  for (const [filePath, contents] of files) {
    const isHookScript = filePath.endsWith("log_event.sh");
    const changed = await writeFileIfChanged(
      filePath,
      contents,
      isHookScript ? { mode: 0o755 } : {}
    );
    if (changed) {
      writes.push(path.relative(repoPath, filePath));
    }
  }

  const directories = [
    path.join(repoPath, ".claude", "artifacts", "engineering-os", "runs"),
    path.join(repoPath, ".claude", "artifacts", "engineering-os", "handoffs"),
    path.join(repoPath, ".claude", "artifacts", "engineering-os", "reviews"),
    path.join(repoPath, ".claude", "logs"),
    path.join(repoPath, ".claude", "state", "engineering-os")
  ];
  for (const directory of directories) {
    await ensureDir(directory);
  }
}

export async function auditRepo(repoPath) {
  const global = await inspectGlobalInstall();
  return {
    repoPath,
    exists: await pathExists(repoPath),
    hasClaudeMd: await pathExists(path.join(repoPath, "CLAUDE.md")),
    hasDotClaude: await pathExists(path.join(repoPath, ".claude")),
    hasSettings: await pathExists(path.join(repoPath, ".claude", "settings.json")),
    hasHarnessLayer: await pathExists(path.join(repoPath, ".claude", "artifacts", "engineering-os")),
    hasStateLayer: await pathExists(path.join(repoPath, ".claude", "state", "engineering-os", "claims.json")),
    global
  };
}

export async function bootstrapRepo(repoPath) {
  if (!(await pathExists(repoPath))) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }

  const writes = [];
  await updateClaudeMd(repoPath, writes);
  await writeHarnessFiles(repoPath, writes);
  await updateSettings(repoPath, writes);

  return {
    mode: "bootstrap",
    repoPath,
    writes,
    audit: await auditRepo(repoPath)
  };
}

const GLOBAL_IMPORT_LINES = [
  "@~/.claude/engineering-os/constitution.md",
  "@~/.claude/engineering-os/workflow.md"
];

function globalPaths(homeDir) {
  const globalDir = path.join(homeDir, ".claude", "engineering-os");
  return {
    globalDir,
    constitution: path.join(globalDir, "constitution.md"),
    workflow: path.join(globalDir, "workflow.md"),
    metadata: path.join(globalDir, "metadata.json"),
    claudeMd: path.join(homeDir, ".claude", "CLAUDE.md")
  };
}

async function inspectGlobalInstall() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const paths = globalPaths(homeDir);
  const metadata = await fs.readFile(paths.metadata, "utf8")
    .then((raw) => JSON.parse(raw))
    .catch(() => null);
  const hasImports = await fs.readFile(paths.claudeMd, "utf8")
    .then((raw) => GLOBAL_IMPORT_LINES.every((line) => raw.includes(line)))
    .catch(() => false);

  const hasConstitution = await pathExists(paths.constitution);
  const hasWorkflow = await pathExists(paths.workflow);
  const hasGlobalMemory = hasConstitution && hasWorkflow && hasImports;

  return {
    hasGlobalMemory,
    globalMemoryVersion: metadata?.version || null,
    expectedGlobalMemoryVersion: GLOBAL_MEMORY_VERSION,
    globalMemoryStale: hasGlobalMemory && metadata?.version !== GLOBAL_MEMORY_VERSION,
    hasGlobalImports: hasImports,
    globalMemoryPath: path.join(homeDir, ".claude", "engineering-os")
  };
}

export async function installGlobal() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const paths = globalPaths(homeDir);
  const writes = [];

  const constitutionChanged = await writeFileIfChanged(paths.constitution, `${CONSTITUTION_TEMPLATE}\n`);
  if (constitutionChanged) {
    writes.push("~/.claude/engineering-os/constitution.md");
  }

  const workflowChanged = await writeFileIfChanged(paths.workflow, `${WORKFLOW_TEMPLATE}\n`);
  if (workflowChanged) {
    writes.push("~/.claude/engineering-os/workflow.md");
  }

  const metadataChanged = await writeFileIfChanged(
    paths.metadata,
    `${JSON.stringify(GLOBAL_METADATA_TEMPLATE, null, 2)}\n`
  );
  if (metadataChanged) {
    writes.push("~/.claude/engineering-os/metadata.json");
  }

  const existing = await fs.readFile(paths.claudeMd, "utf8").catch(() => "");
  const missingLines = GLOBAL_IMPORT_LINES.filter((line) => !existing.includes(line));
  if (missingLines.length > 0) {
    const prefix = missingLines.join("\n");
    const next = existing ? `${prefix}\n\n${existing}` : `${prefix}\n`;
    await ensureDir(path.dirname(paths.claudeMd));
    await fs.writeFile(paths.claudeMd, next);
    writes.push("~/.claude/CLAUDE.md");
  }

  return {
    mode: "install-global",
    writes,
    global: await inspectGlobalInstall()
  };
}

export async function initRepo(repoPath, options = {}) {
  if (await pathExists(repoPath)) {
    const entries = await fs.readdir(repoPath).catch(() => []);
    if (entries.length > 0 && !options.allowExisting) {
      throw new Error(
        `Target directory already exists and is not empty: ${repoPath}. Pass --allow-existing to reuse it.`
      );
    }
  } else {
    await ensureDir(repoPath);
  }

  const writes = [];
  const gitPath = path.join(repoPath, ".git");
  if (!(await pathExists(gitPath))) {
    await ensureDir(gitPath);
    writes.push(".git/");
  }

  const result = await bootstrapRepo(repoPath);
  return {
    mode: "init",
    repoPath,
    writes: [...writes, ...result.writes],
    audit: result.audit
  };
}
