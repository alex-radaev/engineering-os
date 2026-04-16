import fs from "node:fs/promises";
import path from "node:path";

const CLAUDE_IMPORT_BLOCK = [
  "<!-- crew:start -->",
  "@.claude/crew/constitution.md",
  "<!-- crew:end -->"
].join("\n");

const LEGACY_IMPORT_BLOCK_RE = /<!--\s*engineering-os:start\s*-->[\s\S]*?<!--\s*engineering-os:end\s*-->/;

const CONSTITUTION_TEMPLATE = `# Crew Constitution

This repository uses the Crew harness for structured software work inside Claude Code.

## Activation

- Crew runs have one lead and optional specialists.
- Do not assume the current session is the lead just because these files are present.
- The session explicitly running a Crew workflow command is the lead for that run.
- Spawned agents are specialists and must follow their role definition plus their assigned mission.
- If role-specific instructions conflict with general Crew guidance, role-specific instructions win.

## Core Rules

1. Prefer single-session unless delegation clearly helps.
2. Spawn only specialist agents: builder, reviewer, researcher, or another explicitly named specialist.
3. Keep one owner per task.
4. Keep task scope explicit and bounded.
5. Avoid same-file parallel editing.
6. Use explicit handoff and review reporting for substantial work.
7. Escalate destructive, wide-scope, policy, or architecture decisions instead of improvising them.
`;

const WORKFLOW_TEMPLATE = `# Crew Workflow

This file is command-loaded run guidance for the lead. It is not always-on startup context.

## Lead Identity

- If a workflow command invoked this file, you are the lead for the current run.
- No separate lead subagent is required.
- Before substantial work, check for custom lead guidance in this order, if present:
  1. \`~/.claude/crew/lead.md\`
  2. \`.claude/crew/lead.md\`

## Run Sequence

1. Verify the current workspace path.
2. Read the repo wake-up brief.
3. Confirm the returned \`repoPath\` matches the current working directory.
4. Restate the active objective plus in-scope and out-of-scope boundaries.
5. Choose mode: \`single-session\`, \`assisted single-session\`, or \`team run\`.
6. Choose pace: \`slow\`, \`medium\`, or \`fast\`.
7. Spawn specialists only if they reduce uncertainty or split clean ownership.
8. Use claims only when parallel work might collide.
9. Use approvals when scope, ownership, policy, or destructive actions need an explicit decision.
10. Leave inspectable artifacts for substantial work.

## Mode Guidance

- \`single-session\`: do the work directly; do not spawn specialists.
- \`assisted single-session\`: stay primary and use bounded specialist help without turning it into a coordinating team.
- \`team run\`: assign explicit ownership to multiple specialists only when the split is clean.

## Artifact Habit

For substantial work, prefer:

- \`write-run-brief\` near the start
- \`write-handoff\` when ownership changes or a specialist completes bounded work
- \`write-review-result\` when review materially validates implementation
- \`write-final-synthesis\` when the run ends

## Review Default

- Substantial implementation work should normally end with reviewer validation.
- If review is skipped, say so explicitly and give a concrete reason.
`;

const PROTOCOL_TEMPLATE = `# Crew Protocol

This file defines the shared reporting shapes used by the lead and specialists.

## Start Acknowledgement

Every specialist should begin with:

- what I own
- what I will not change
- what I need from others, if anything
- what I will deliver

## Progress Update

Use when reporting mid-task:

- current status
- whether scope is still valid
- blocker, if any
- next expected handoff

## Completion Report

Every specialist completion should include:

- what changed or what was found
- changed files or evidence checked
- confidence level
- risks or open questions
- suggested next handoff

## Review Result

Every review result must be one of:

- \`approved\`
- \`approved_with_notes\`
- \`rejected\`

And include:

- evidence checked
- risk or failure summary
- required follow-up, if rejected

## Handoff Quality Bar

Good handoffs are:

- bounded
- specific
- inspectable
- honest about uncertainty
`;

const ARTIFACT_README_TEMPLATE = `# Crew Artifacts

This directory stores inspectable run artifacts for the Crew harness.

- \`runs/\` for run briefs and final syntheses
- \`handoffs/\` for task ownership and completion notes
- \`reviews/\` for review results and rejection notes
`;

const STATE_README_TEMPLATE = `# Crew State

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
    "Crew keeps this repo-local so coordination remains inspectable."
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

printf '{"schemaVersion":"1.0","source":"crew","timestamp":"%s","event":"%s","repoPath":"%s","payloadPath":"%s"}\\n' \\
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
            description: "crew:session-start"
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
            description: "crew:task-created"
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
            description: "crew:task-completed"
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
            description: "crew:subagent-start"
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
            description: "crew:subagent-stop"
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

async function writeFileIfMissing(filePath, contents, options = {}) {
  if (await pathExists(filePath)) {
    return false;
  }
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, options);
  return true;
}

function isCrewHook(entry) {
  const hooks = Array.isArray(entry?.hooks) ? entry.hooks : [];
  return hooks.some((hook) => {
    const command = hook?.command || "";
    const description = hook?.description || "";
    return (
      command.includes(".claude/hooks/log_event.sh") ||
      description.startsWith("crew:") ||
      description.startsWith("engineering-os:")
    );
  });
}

function mergeHooks(existingHooks = {}, desiredHooks = {}) {
  const result = { ...existingHooks };
  for (const [eventName, hookDefs] of Object.entries(desiredHooks)) {
    const current = Array.isArray(result[eventName]) ? result[eventName] : [];
    const preserved = current.filter((entry) => !isCrewHook(entry));
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
      "This repository uses the Crew harness.",
      "Keep repo-specific guidance here and leave shared workflow rules in the Crew files below.",
      "",
      CLAUDE_IMPORT_BLOCK,
      ""
    ].join("\n");
    await writeFileIfChanged(claudePath, contents);
    writes.push(path.relative(repoPath, claudePath));
    return;
  }

  if (existing.includes("<!-- crew:start -->")) {
    return;
  }

  if (LEGACY_IMPORT_BLOCK_RE.test(existing)) {
    const next = existing.replace(LEGACY_IMPORT_BLOCK_RE, CLAUDE_IMPORT_BLOCK);
    await writeFileIfChanged(claudePath, `${next.trimEnd()}\n`);
    writes.push(path.relative(repoPath, claudePath));
    return;
  }

  const next = `${existing.trimEnd()}\n\n${CLAUDE_IMPORT_BLOCK}\n`;
  await writeFileIfChanged(claudePath, next);
  writes.push(path.relative(repoPath, claudePath));
}

async function renamePathIfNeeded(repoPath, fromParts, toParts, writes) {
  const fromPath = path.join(repoPath, ...fromParts);
  const toPath = path.join(repoPath, ...toParts);

  if (!(await pathExists(fromPath)) || (await pathExists(toPath))) {
    return;
  }

  await ensureDir(path.dirname(toPath));
  await fs.rename(fromPath, toPath);
  writes.push(path.relative(repoPath, toPath));
}

async function migrateLegacyHarness(repoPath, writes) {
  await renamePathIfNeeded(
    repoPath,
    [".claude", "engineering-os"],
    [".claude", "crew"],
    writes
  );
  await renamePathIfNeeded(
    repoPath,
    [".claude", "artifacts", "engineering-os"],
    [".claude", "artifacts", "crew"],
    writes
  );
  await renamePathIfNeeded(
    repoPath,
    [".claude", "state", "engineering-os"],
    [".claude", "state", "crew"],
    writes
  );
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
    {
      filePath: path.join(repoPath, ".claude", "crew", "constitution.md"),
      contents: `${CONSTITUTION_TEMPLATE}\n`
    },
    {
      filePath: path.join(repoPath, ".claude", "crew", "workflow.md"),
      contents: `${WORKFLOW_TEMPLATE}\n`
    },
    {
      filePath: path.join(repoPath, ".claude", "crew", "protocol.md"),
      contents: `${PROTOCOL_TEMPLATE}\n`
    },
    {
      filePath: path.join(repoPath, ".claude", "artifacts", "crew", "README.md"),
      contents: `${ARTIFACT_README_TEMPLATE}\n`,
      preserveExisting: true
    },
    {
      filePath: path.join(repoPath, ".claude", "state", "crew", "README.md"),
      contents: `${STATE_README_TEMPLATE}\n`,
      preserveExisting: true
    },
    {
      filePath: path.join(repoPath, ".claude", "state", "crew", "claims.json"),
      contents: `${JSON.stringify(CLAIMS_TEMPLATE, null, 2)}\n`,
      preserveExisting: true
    },
    {
      filePath: path.join(repoPath, ".claude", "state", "crew", "history.jsonl"),
      contents: "",
      preserveExisting: true
    },
    {
      filePath: path.join(repoPath, ".claude", "state", "crew", "approvals.jsonl"),
      contents: "",
      preserveExisting: true
    },
    {
      filePath: path.join(repoPath, ".claude", "state", "crew", "sprint.json"),
      contents: `${JSON.stringify(SPRINT_TEMPLATE, null, 2)}\n`,
      preserveExisting: true
    },
    {
      filePath: path.join(repoPath, ".claude", "hooks", "log_event.sh"),
      contents: HOOK_SCRIPT_TEMPLATE
    }
  ];

  for (const { filePath, contents, preserveExisting = false } of files) {
    const isHookScript = filePath.endsWith("log_event.sh");
    const writer = preserveExisting ? writeFileIfMissing : writeFileIfChanged;
    const changed = await writer(filePath, contents, isHookScript ? { mode: 0o755 } : {});
    if (changed) {
      writes.push(path.relative(repoPath, filePath));
    }
  }

  const directories = [
    path.join(repoPath, ".claude", "artifacts", "crew", "runs"),
    path.join(repoPath, ".claude", "artifacts", "crew", "handoffs"),
    path.join(repoPath, ".claude", "artifacts", "crew", "reviews"),
    path.join(repoPath, ".claude", "logs"),
    path.join(repoPath, ".claude", "state", "crew")
  ];
  for (const directory of directories) {
    await ensureDir(directory);
  }
}

export async function auditRepo(repoPath) {
  return {
    repoPath,
    exists: await pathExists(repoPath),
    hasClaudeMd: await pathExists(path.join(repoPath, "CLAUDE.md")),
    hasDotClaude: await pathExists(path.join(repoPath, ".claude")),
    hasSettings: await pathExists(path.join(repoPath, ".claude", "settings.json")),
    hasHarnessLayer:
      (await pathExists(path.join(repoPath, ".claude", "crew", "constitution.md"))) &&
      (await pathExists(path.join(repoPath, ".claude", "crew", "workflow.md"))) &&
      (await pathExists(path.join(repoPath, ".claude", "crew", "protocol.md"))),
    hasStateLayer: await pathExists(path.join(repoPath, ".claude", "state", "crew", "claims.json"))
  };
}

export async function bootstrapRepo(repoPath) {
  if (!(await pathExists(repoPath))) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }

  const writes = [];
  await migrateLegacyHarness(repoPath, writes);
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
