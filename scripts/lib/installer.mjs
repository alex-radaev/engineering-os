import fs from "node:fs/promises";
import path from "node:path";

const GLOBAL_MEMORY_VERSION = "1.1";
const GLOBAL_METADATA_TEMPLATE = {
  managedBy: "engineering-os",
  version: GLOBAL_MEMORY_VERSION,
  files: ["constitution.md", "workflow.md"]
};

const CLAUDE_IMPORT_BLOCK = [
  "<!-- engineering-os:start -->",
  "<!-- Engineering OS global memory lives in ~/.claude/engineering-os/. Run /crew:install after plugin updates that change framework memory. -->",
  "<!-- engineering-os:end -->"
].join("\n");

const CONSTITUTION_TEMPLATE = `# Engineering OS Constitution

This repository uses the Engineering OS harness for structured software work inside Claude Code.

## Core Rules

1. Keep one owner per task.
2. Keep task scope explicit.
3. Retrieve bounded repo context before substantial work.
4. Require structured handoffs for substantial work.
5. Treat review as a gate, not a courtesy.
6. Treat validation and deployment evidence as separate gates when behavior or environments are involved.
7. Leave durable artifacts and repo memory behind when work would matter later.

## Team Roles

- lead: planning, delegation, synthesis
- builder: bounded implementation
- reviewer: independent change review
- validator: behavior and scenario verification
- deployer: deployment and environment evidence
- researcher: read-only investigation

## Memory And Artifact Habit

Substantial work should start from bounded repo memory:

- \`CLAUDE.md\`
- \`.claude/engineering-os/*.md\`
- latest relevant wake-up context and artifacts

Substantial work should leave inspectable artifacts under:

- \`.claude/artifacts/engineering-os/runs/\`
- \`.claude/artifacts/engineering-os/handoffs/\`
- \`.claude/artifacts/engineering-os/reviews/\`
- \`.claude/artifacts/engineering-os/validations/\`
- \`.claude/artifacts/engineering-os/deployments/\`

For shipping work, keep durable repo deployment guidance in:

- \`.claude/engineering-os/deployment.md\`

## Scope Discipline

Stop and re-scope if:

- two agents need the same file
- the assignment boundary is unclear
- the work needs a broader refactor than assigned
`;

const WORKFLOW_TEMPLATE = `# Engineering OS Workflow

## Preferred Sequence

1. verify the repo and current workspace
2. retrieve bounded wake-up context before substantial work
3. choose mode: single-session, assisted single-session, or team run
4. define task ownership and scope
5. implement or investigate in bounded chunks
6. review code-bearing work before calling it done
7. validate behavior when it can be exercised meaningfully
8. gather deployment evidence when shipping through environments
9. leave a final synthesis

## Default Gate Policy

- code changed -> independent review required
- runnable, observable, or user-visible behavior changed -> validation expected
- deployment or promotion work -> deployment evidence expected
- production promotion -> explicit user approval required

## Write-Back Discipline

- substantial run start -> run brief
- ownership change -> handoff
- review completion -> review result immediately
- validation completion -> validation result immediately
- meaningful deployment evidence -> deployment check immediately
- substantial completion -> final synthesis

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
- \`validations/\` for validation plans and validation results
- \`deployments/\` for deployment checks and environment evidence
`;

const STATE_README_TEMPLATE = `# Engineering OS State

This directory stores lightweight repo-local coordination state.

- \`claims.json\` tracks current file ownership claims
- \`history.jsonl\` stores append-only claim and release events
- \`approvals.jsonl\` stores approval requests and resolutions
- \`workflow-state.json\` stores the current run and gate badge state
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

const GIT_GATE_REMINDER_TEMPLATE = `#!/usr/bin/env bash
set -euo pipefail

payload="$(cat || true)"
if [ -z "$payload" ]; then
  exit 0
fi

HOOK_PAYLOAD="$payload" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

function hasCommitLikeCommand(command) {
  return /(^|[;&|()]|\\s)git\\s+commit(\\s|$)/.test(command);
}

function hasPrLikeCommand(command) {
  return /(^|[;&|()]|\\s)gh\\s+pr\\s+(create|merge)(\\s|$)/.test(command);
}

function pendingBadges(run) {
  const pending = [];
  if (run?.gates?.review?.status === "required") pending.push("review_required");
  if (run?.gates?.validation?.status === "expected") pending.push("validation_expected");
  if (run?.gates?.deployment?.dev?.status === "expected") pending.push("dev_deploy_expected");
  if (run?.gates?.deployment?.prod?.status === "expected") pending.push("prod_deploy_expected");
  return pending;
}

function missingArtifactWrites(run) {
  const missing = [];
  const hasPendingGates = Boolean(
    run?.gates?.review?.status === "required" ||
    run?.gates?.validation?.status === "expected" ||
    run?.gates?.deployment?.dev?.status === "expected" ||
    run?.gates?.deployment?.prod?.status === "expected"
  );
  const hasAnyGate = Boolean(
    run?.gates?.review ||
    run?.gates?.validation ||
    run?.gates?.deployment?.dev ||
    run?.gates?.deployment?.prod
  );
  const hasMeaningfulProgress = Boolean(
    hasAnyGate ||
    run?.artifacts?.handoffs?.length ||
    run?.artifacts?.reviewResult ||
    run?.artifacts?.validationPlan ||
    run?.artifacts?.validationResult ||
    run?.artifacts?.deploymentChecks?.dev ||
    run?.artifacts?.deploymentChecks?.prod ||
    run?.next
  );
  const hasCompletedPhaseEvidence = Boolean(
    run?.gates?.review?.status === "passed" ||
    run?.gates?.review?.status === "failed" ||
    run?.gates?.review?.status === "skipped" ||
    run?.gates?.validation?.status === "passed" ||
    run?.gates?.validation?.status === "failed" ||
    run?.gates?.validation?.status === "skipped" ||
    run?.gates?.deployment?.dev?.status === "passed" ||
    run?.gates?.deployment?.dev?.status === "failed" ||
    run?.gates?.deployment?.dev?.status === "skipped" ||
    run?.gates?.deployment?.prod?.status === "passed" ||
    run?.gates?.deployment?.prod?.status === "failed" ||
    run?.gates?.deployment?.prod?.status === "skipped" ||
    run?.artifacts?.reviewResult ||
    run?.artifacts?.validationResult ||
    run?.artifacts?.deploymentChecks?.dev ||
    run?.artifacts?.deploymentChecks?.prod
  );
  const substantialRun = Boolean(
    run?.mode === "assisted single-session" ||
    run?.mode === "team run" ||
    run?.artifacts?.handoffs?.length ||
    run?.artifacts?.validationPlan ||
    run?.artifacts?.validationResult ||
    run?.artifacts?.deploymentChecks?.dev ||
    run?.artifacts?.deploymentChecks?.prod ||
    run?.gates?.validation ||
    run?.gates?.deployment?.dev ||
    run?.gates?.deployment?.prod
  );

  if ((run?.gates?.review?.status === "passed" || run?.gates?.review?.status === "failed") && !run?.artifacts?.reviewResult) {
    missing.push("review-result artifact");
  }
  if ((run?.gates?.validation?.status === "passed" || run?.gates?.validation?.status === "failed") && !run?.artifacts?.validationResult) {
    missing.push("validation-result artifact");
  }
  if ((run?.gates?.deployment?.dev?.status === "passed" || run?.gates?.deployment?.dev?.status === "failed") && !run?.artifacts?.deploymentChecks?.dev) {
    missing.push("dev deployment-check artifact");
  }
  if ((run?.gates?.deployment?.prod?.status === "passed" || run?.gates?.deployment?.prod?.status === "failed") && !run?.artifacts?.deploymentChecks?.prod) {
    missing.push("prod deployment-check artifact");
  }
  if (substantialRun && hasMeaningfulProgress && !run?.artifacts?.runBrief) {
    missing.push("run-brief artifact");
  }
  if (substantialRun && hasCompletedPhaseEvidence && !hasPendingGates && !run?.artifacts?.finalSynthesis) {
    missing.push("final-synthesis artifact");
  }
  return missing;
}

const input = JSON.parse(process.env.HOOK_PAYLOAD || "{}");
if (input.hook_event_name !== "PreToolUse" || input.tool_name !== "Bash") {
  process.exit(0);
}

const command = input.tool_input?.command || "";
const isCommit = hasCommitLikeCommand(command);
const isPr = hasPrLikeCommand(command);
if (!isCommit && !isPr) {
  process.exit(0);
}

const cwd = input.cwd || process.cwd();
const workflowPath = path.join(cwd, ".claude", "state", "engineering-os", "workflow-state.json");
if (!fs.existsSync(workflowPath)) {
  process.exit(0);
}

const workflowState = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
const currentRun = workflowState.currentRun;
if (!currentRun) {
  process.exit(0);
}

const pending = pendingBadges(currentRun);
const missingWrites = missingArtifactWrites(currentRun);
if (pending.length === 0 && missingWrites.length === 0) {
  process.exit(0);
}

const action = isCommit ? "git commit" : "gh pr";
const messageParts = ["Crew reminder:"];
if (pending.length > 0) {
  messageParts.push(\`pending workflow gates before \${action}: \${pending.join(", ")}\`);
}
if (missingWrites.length > 0) {
  messageParts.push(\`phase-complete write-backs still missing before \${action}: \${missingWrites.join(", ")}\`);
}
messageParts.push("Recommended next step: write the matching review/validation/deployment artifact now, or record an explicit skip before moving on.");
const message = messageParts.join(" ");

process.stdout.write(JSON.stringify({
  continue: true,
  suppressOutput: true,
  systemMessage: message
}));
NODE
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
    ],
    PreToolUse: [
      {
        matcher: "Bash",
        hooks: [
          {
            type: "command",
            command: "${PWD}/.claude/hooks/check_git_gate.sh",
            description: "engineering-os:git-gate-reminder"
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
    return command.includes(".claude/hooks/log_event.sh")
      || command.includes(".claude/hooks/check_git_gate.sh")
      || description.startsWith("engineering-os:");
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
      path.join(repoPath, ".claude", "state", "engineering-os", "workflow-state.json"),
      `${JSON.stringify({
        version: "1.0",
        updatedAt: "2026-01-01T00:00:00.000Z",
        currentRun: null,
        recentRuns: []
      }, null, 2)}\n`
    ],
    [
      path.join(repoPath, ".claude", "state", "engineering-os", "sprint.json"),
      `${JSON.stringify(SPRINT_TEMPLATE, null, 2)}\n`
    ],
    [
      path.join(repoPath, ".claude", "hooks", "log_event.sh"),
      HOOK_SCRIPT_TEMPLATE
    ],
    [
      path.join(repoPath, ".claude", "hooks", "check_git_gate.sh"),
      GIT_GATE_REMINDER_TEMPLATE
    ]
  ];

  for (const [filePath, contents] of files) {
    const isHookScript = filePath.endsWith("log_event.sh") || filePath.endsWith("check_git_gate.sh");
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
    path.join(repoPath, ".claude", "artifacts", "engineering-os", "validations"),
    path.join(repoPath, ".claude", "artifacts", "engineering-os", "deployments"),
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
    hasWorkflowState: await pathExists(path.join(repoPath, ".claude", "state", "engineering-os", "workflow-state.json")),
    global
  };
}

function buildWelcome({ mode, repoScoped = false }) {
  const commands = repoScoped
    ? ["/crew:brief-me", "/crew:build", "/crew:fix", "/crew:ship"]
    : ["/crew:init", "/crew:adopt", "/crew:brief-me"];

  const headlineByMode = {
    init: "Crew is now wired into this repo. Excellent judgment.",
    bootstrap: "This repo is now on Crew. Tasteful choice.",
    "install-global": "Crew global memory is installed. Bold and correct."
  };

  return {
    headline: headlineByMode[mode] || "Crew is ready.",
    commands,
    guidance: repoScoped
      ? "Start with /crew:brief-me for a quick situational report, then /crew:build or /crew:fix for real work."
      : "Use /crew:init for a new repo, /crew:adopt for an existing repo, and /crew:brief-me once a repo is wired in."
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
    audit: await auditRepo(repoPath),
    welcome: buildWelcome({ mode: "bootstrap", repoScoped: true })
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
    global: await inspectGlobalInstall(),
    welcome: buildWelcome({ mode: "install-global", repoScoped: false })
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
    audit: result.audit,
    welcome: buildWelcome({ mode: "init", repoScoped: true })
  };
}
