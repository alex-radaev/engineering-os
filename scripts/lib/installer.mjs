import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CLAUDE_IMPORT_BLOCK = [
  "<!-- crew:start -->",
  "@.claude/crew/constitution.md",
  "<!-- crew:end -->"
].join("\n");

const LEGACY_IMPORT_BLOCK_RE = /<!--\s*engineering-os:start\s*-->[\s\S]*?<!--\s*engineering-os:end\s*-->/;
const GITIGNORE_BLOCK_RE = /#\s*crew:start[\s\S]*?#\s*crew:end\s*/;

const GITIGNORE_BLOCK = [
  "# crew:start",
  ".claude/logs/",
  ".claude/artifacts/crew/",
  ".claude/state/crew/claims.json",
  ".claude/state/crew/*.jsonl",
  ".claude/settings.local.json",
  "# crew:end"
].join("\n");

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
2. Spawn only specialist agents: builder, reviewer, researcher, validator, deployer, or another explicitly named specialist.
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
5. Decide whether the work is tiny enough for direct lead execution or should be decomposed into bounded tasks.
6. Choose mode: \`single-session\`, \`assisted single-session\`, or \`team run\`.
7. Choose pace: \`slow\`, \`medium\`, or \`fast\`.
8. Apply the default gate policy:
   - if code changed -> review required
   - if behavior can be exercised meaningfully -> validation expected
   - if work crosses an environment boundary -> deployment evidence and post-deploy validation expected
   - if production is affected -> explicit user approval required before promotion
9. For substantial code-bearing work, prefer builder-owned tasks instead of direct lead coding.
10. Spawn multiple builders only when write scopes are disjoint and the split is independently reviewable.
11. Run reviewer on completed implementation tasks before treating them as done.
12. Run validator at meaningful milestones or at the end when integrated behavior is ready to exercise.
13. Use claims only when parallel work might collide.
14. Use approvals when scope, ownership, policy, or destructive actions need an explicit decision.
15. Leave inspectable artifacts for substantial work.

## Mode Guidance

- \`single-session\`: reserve for tiny, tightly scoped edits; if you write code directly, first read builder-specific guidance and follow builder standards.
- \`assisted single-session\`: stay primary and use one builder or a small number of bounded specialists without turning it into a coordinating team.
- \`team run\`: assign explicit ownership to multiple specialists only when the split is clean.

## Task-Driven Development

- Treat substantial implementation as a sequence of bounded tasks, not one blurry block of work.
- Each task should have:
  - one owner
  - allowed scope
  - forbidden scope
  - a concrete deliverable
- Builder owns code-bearing tasks, including tests for changed behavior when practical.
- Reviewer gates completed implementation tasks before they are considered done.
- Validator checks integrated behavior periodically or at the end once the system can be exercised meaningfully.
- The lead closes tasks, updates run memory, and decides the next handoff.

## Artifact Habit

For substantial work, prefer:

- \`write-run-brief\` near the start
- \`write-handoff\` when ownership changes or a specialist completes bounded work
- \`write-review-result\` when review materially validates implementation
- \`write-validation-result\` when validation materially validates behavior
- \`write-deployment-result\` when deployment materially validates an environment transition
- \`write-final-synthesis\` when the run ends

## Gate Defaults

- If code changed, review is required by default.
- If behavior can be exercised meaningfully, validation is expected by default.
- If work crosses an environment boundary, deployment evidence plus post-deploy validation are expected by default.
- If a gate is skipped, say so explicitly and give a concrete reason.

## Runnable Deliverables

- If the result is runnable or directly testable, the final synthesis must include exact local run and test steps.
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
- whether tests were added or updated, and why not if they were skipped
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
- test adequacy summary
- required follow-up, if rejected

## Validation Result

Every validation result must be one of:

- \`passed\`
- \`failed\`
- \`blocked\`

And include:

- environment
- scenario
- executed evidence checked
- inferred confidence, if any
- gaps, risks, or blockers
- recommended next step

## Deployment Result

Every deployment result should include:

- target environment
- target revision or rollout target
- outcome: \`deployed\`, \`verified\`, \`blocked\`, or \`rolled_back\`
- evidence checked
- risks, blockers, or follow-up
- recommended next step

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
- \`validations/\` for behavior-validation evidence and verdicts
- \`deployments/\` for environment-transition evidence and outcomes
`;

const STATE_README_TEMPLATE = `# Crew State

This directory stores lightweight repo-local coordination state.

- \`claims.json\` tracks current file ownership claims
- \`history.jsonl\` stores append-only claim and release events
- \`approvals.jsonl\` stores approval requests and resolutions
- \`sprint.json\` is an optional sprint or focus configuration
`;

const USER_ASSET_README_TEMPLATE = `# Crew User Assets

This directory stores optional personal Crew overlays used across repositories.

Keep these files:

- short
- repo-agnostic
- additive

Do not restate the base Crew workflow or role contracts here. Use these files only for your personal defaults and preferences.
`;

const USER_OVERLAY_TEMPLATES = {
  "lead.md": `# Lead Overlay

Optional personal lead guidance used across repositories.

- Keep additions short and repo-agnostic.
- Prefer refinements, not restatements of the base workflow.
- Add only defaults you want the lead to apply everywhere.
`,
  "builder.md": `# Builder Overlay

Optional personal builder guidance used across repositories.

- Keep additions short and repo-agnostic.
- Focus on implementation habits you want everywhere.
- Do not redefine builder ownership or lead authority.
`,
  "reviewer.md": `# Reviewer Overlay

Optional personal reviewer guidance used across repositories.

- Keep additions short and repo-agnostic.
- Focus on review priorities and review style preferences.
- Do not redefine the review verdict model.
`,
  "researcher.md": `# Researcher Overlay

Optional personal researcher guidance used across repositories.

- Keep additions short and repo-agnostic.
- Focus on evidence style and output shape preferences.
- Do not expand researcher into implementation ownership.
`,
  "validator.md": `# Validator Overlay

Optional personal validator guidance used across repositories.

- Keep additions short and repo-agnostic.
- Focus on scenario and evidence habits you want everywhere.
- Do not redefine deployment or promotion authority.
`,
  "deployer.md": `# Deployer Overlay

Optional personal deployer guidance used across repositories.

- Keep additions short and repo-agnostic.
- Focus on deployment evidence and safety habits.
- Do not remove approval boundaries.
`,
  "workflow.md": `# Workflow Overlay

Optional personal Crew workflow additions used across repositories.

- Keep additions short and repo-agnostic.
- Add only lightweight preferences or reminders.
- Do not restate or fork the base Crew workflow.
`,
  "protocol.md": `# Protocol Overlay

Optional personal Crew protocol additions used across repositories.

- Keep additions short and repo-agnostic.
- Add only small reporting preferences or formatting habits.
- Do not fork the shared protocol shapes.
`
};

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

async function updateGitignore(repoPath, writes) {
  const gitignorePath = path.join(repoPath, ".gitignore");
  const existing = await fs.readFile(gitignorePath, "utf8").catch(() => null);

  if (existing === null) {
    await writeFileIfChanged(gitignorePath, `${GITIGNORE_BLOCK}\n`);
    writes.push(path.relative(repoPath, gitignorePath));
    return;
  }

  const next = GITIGNORE_BLOCK_RE.test(existing)
    ? existing.replace(GITIGNORE_BLOCK_RE, `${GITIGNORE_BLOCK}\n`)
    : `${existing.trimEnd()}\n\n${GITIGNORE_BLOCK}\n`;

  const changed = await writeFileIfChanged(gitignorePath, next);
  if (changed) {
    writes.push(path.relative(repoPath, gitignorePath));
  }
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
    path.join(repoPath, ".claude", "artifacts", "crew", "validations"),
    path.join(repoPath, ".claude", "artifacts", "crew", "deployments"),
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
  await updateGitignore(repoPath, writes);

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

export async function installUserAssets(options = {}) {
  const homePath = path.resolve(options.homePath || os.homedir());
  const crewPath = path.join(homePath, ".claude", "crew");
  const legacyPath = path.join(homePath, ".claude", "engineering-os");
  const writes = [];

  await ensureDir(crewPath);

  const readmePath = path.join(crewPath, "README.md");
  if (await writeFileIfChanged(readmePath, `${USER_ASSET_README_TEMPLATE}\n`)) {
    writes.push(readmePath);
  }

  for (const [fileName, contents] of Object.entries(USER_OVERLAY_TEMPLATES)) {
    const filePath = path.join(crewPath, fileName);
    if (await writeFileIfMissing(filePath, `${contents}\n`)) {
      writes.push(filePath);
    }
  }

  return {
    mode: "install-user-assets",
    homePath,
    crewPath,
    writes,
    legacyPathDetected: await pathExists(legacyPath)
  };
}
