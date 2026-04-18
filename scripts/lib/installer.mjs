import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CLAUDE_IMPORT_BLOCK = [
  "<!-- crew:start -->",
  "@~/.claude/crew/constitution.md",
  "<!-- crew:end -->"
].join("\n");

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

1. Prefer single-session unless delegation clearly helps. Unnecessary delegation costs the user context and coordination overhead.
2. Spawn only specialist agents: builder, reviewer, researcher, validator, deployer, or another explicitly named specialist.
3. Keep one owner per task. Shared ownership creates merge conflicts and confused accountability that cost the user time.
4. Keep task scope explicit and bounded. Ambiguous scope leads to wasted effort and work that has to be redone.
5. Avoid same-file parallel editing — concurrent edits create merge conflicts and surprises the user has to clean up.
6. Use explicit handoff and review reporting for substantial work. Without them, the next agent or session starts blind.
7. Escalate destructive, wide-scope, policy, or architecture decisions instead of improvising them — these are decisions the user should own.
8. Treat automated tests for changed behavior as the default deliverable on code-bearing work. Builders own writing them; reviewers reject by default when they are missing without a concrete low-risk deferral reason. Silent test gaps erode the user's safety net.
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
8. Apply the default gate policy (see Gate Defaults below). Each gate protects the user from a different class of risk — skipping a gate silently means the user assumes it passed when it did not.
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
- Builder owns code-bearing tasks; reviewer gates them before they are considered done; validator exercises integrated behavior. See the constitution's test-as-default rule for coverage expectations.
- Lead does upstream exploration via built-in subagents (Explore/Plan) and passes findings (files, call_sites, design_notes) in the handoff. Specialists should not freelance exploration to compensate for thin handoffs.
- The lead closes tasks, updates run memory, and decides the next handoff.
- Each handoff carries a \`size\` field: \`light\` or \`standard\` (default). Use \`size: light\` for trivial tasks (typo fixes, variable renames, one-line config changes) — the specialist skips the artifact write but still emits the structured completion message. Use \`size: standard\` (default) for anything substantive — feature work, bug fixes with tests, cross-file refactors.

## Help Request Handling

- Specialists surface scope-blockers via a \`help_request\` field in their completion or progress update (shape defined in the protocol). The lead must acknowledge every \`help_request\` explicitly — approve or deny.
- **Default bias: approve.** Approve when the request is bounded and the specialist would otherwise bloat its own context or freelance outside scope. Deny only when the request is clearly out-of-scope, speculative, or duplicates existing work.
- On approve: spawn the requested helper scoped to the question. If the harness runs teammates, introduce the helper by name to the requester so they can coordinate peer-to-peer. If specialists are one-shot subagents, dispatch a fresh specialist with the scoped mission and route findings back.
- On deny: respond with a concrete reason. The specialist adjusts within existing scope or returns failure with the denial on record.
- Silently dropping a \`help_request\` is a protocol failure — the user will see the gap in the completion message.

## Helper Teardown

Helpers spawned in response to a \`help_request\` are temporary — the lead is responsible for tearing them down when they are no longer needed. Two triggers operate together:

- **Primary (specialist-signaled):** read \`helpers_done\` from specialist progress updates and completions. For each named helper, shut it down (via the platform's shutdown mechanism, e.g. SendMessage shutdown_request when running as a team).
- **Safety net (lead-periodic):** every 3 specialist events, or at major milestones (design complete, implementation complete, review complete), run a roster check. For each active helper, confirm a requester is still using it. If idle with no recent cross-messages, initiate shutdown.

**Concurrent cap: max 2 active helpers at any time.** If at cap and a new \`help_request\` arrives, respond to the requester with: "one helper must finish first — can you reuse an existing helper or wait?" Do not exceed the cap silently.

**End-of-run cleanup:** the final lead step before completion is a roster check confirming all helpers spawned during the run have been torn down. Orphaned helpers surviving past run end is a protocol failure — surface manual cleanup to the user if teardown fails.

## Artifact Habit

The user depends on these artifacts to resume work after compaction, across sessions, or when context is lost. Skipping a write-back means the next session starts with no record of what happened.

For substantial work, prefer:

- \`write-run-brief\` near the start
- \`write-handoff\` when ownership changes or a specialist completes bounded work
- \`write-review-result\` when review materially validates implementation
- \`write-validation-result\` when validation materially validates behavior
- \`write-deployment-result\` when deployment materially validates an environment transition
- \`write-final-synthesis\` when the run ends

Specialists on \`size: light\` handoffs skip the artifact write. The structured completion message shape is still required — review, \`help_request\`, and \`helpers_done\` behave identically to \`size: standard\`.

At end of run, confirm no active helpers remain before final synthesis (see Helper Teardown).

## Gate Defaults

- If code changed, review is required by default (protects from regressions and quality erosion).
- If behavior can be exercised meaningfully, validation is expected by default (protects from shipping broken behavior).
- If work crosses an environment boundary, deployment evidence plus post-deploy validation are expected by default (protects from unverified environment state).
- If production is affected, explicit user approval is required before promotion (protects the user's production systems).
- If a gate is skipped, say so explicitly and give a concrete reason.

## Runnable Deliverables

- If the result is runnable or directly testable, the final synthesis must include exact local run and test steps.
`;

const PROTOCOL_TEMPLATE = `# Crew Protocol

This file defines the shared reporting shapes used by the lead and specialists.

## Custom Instructions Lookup

Before starting work, every role (lead and specialists) should check for personal then repo-local custom instructions for that role, in this order, if present:

1. \`~/.claude/crew/<role>.md\` (personal overlay across repos)
2. \`.claude/crew/<role>.md\` (repo-local overlay)

Precedence: repo-local overrides personal; assigned mission and core role boundaries override both.

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
- \`helpers_done\` entry, if a helper you requested is no longer needed (see Helpers Done below)

## Completion Report

Every specialist completion should include:

- what changed or what was found
- changed files or evidence checked
- whether tests were added or updated, or the exact deferral reason plus the missing coverage if they were skipped
- confidence level
- risks or open questions
- suggested next handoff
- \`help_request\` entry, if the specialist hit a scope-blocker it believes warrants lead intervention (see Help Request below)
- \`helpers_done\` entry, if a helper you requested during this task is no longer needed (see Helpers Done below)

## Help Request

A specialist that hits a scope-blocker — capability outside its mission, information it cannot gather within its assigned files, a design question that needs a decision — should surface a \`help_request\` rather than freelance outside scope, bloat its context by grepping from scratch, or return silently incomplete work.

Include the \`help_request\` in the completion (or a progress update if blocking mid-task). Shape:

\`\`\`yaml
help_request:
  kind: research | validation | design_question | capability_gap
  question: "concrete, scoped ask"
  scope_note: "why this is outside my assigned mission"
  urgency: blocking | informational
\`\`\`

Field guidance:

- \`kind\` — one of the four known kinds. Unknown kinds are allowed but the lead may deny with reason.
  - \`research\` — code reading, architecture tracing, or dependency questions outside assigned files.
  - \`validation\` — externally observable behavior that needs exercising, not just reading.
  - \`design_question\` — a decision the specialist cannot make alone (edge case, tradeoff, constraint clarification).
  - \`capability_gap\` — a tool, credential, or environment the specialist does not have.
- \`question\` — concrete and scoped; a helper should be able to act on it without further clarification.
- \`scope_note\` — one sentence on why this is outside the assigned mission. Helps the lead decide approve vs. deny quickly.
- \`urgency\` — \`blocking\` means the specialist cannot make progress without an answer; \`informational\` means the specialist can continue but flagged the gap.

The specialist emits the request mode-agnostically. Whether the lead resolves it by spawning a fresh one-shot specialist or by introducing a persistent teammate is the lead's call based on the active coordination mode.

## Help Request Response (lead)

When a specialist's completion or progress update contains a \`help_request\`, acknowledge it explicitly and decide:

- **Approve** — spawn the requested helper scoped to the question. If the harness is running teammates, introduce the helper by name to the requester (e.g. "researcher-1 is scoped to X; message them directly"). If specialists are one-shot subagents, dispatch a fresh specialist with the scoped mission and route findings back.
- **Deny** — respond with a concrete reason. The specialist then either adjusts within its existing scope or returns failure with the denial on record.

**Default bias: approve.** Lead reluctance to spawn is a known failure mode. Approve when the request is bounded and the specialist would otherwise freelance outside scope or bloat its context. Deny only when the request is clearly out-of-scope, speculative, or duplicates existing work.

Do not silently drop a \`help_request\`. An unacknowledged request is a protocol failure — the user sees the gap in the completion message.

## Helpers Done

When a specialist that requested a helper no longer needs it, the specialist signals teardown in its next progress update or completion:

\`\`\`yaml
helpers_done:
  - name: researcher-1
    reason: "answer integrated, no further research needed"
\`\`\`

The lead reads this signal and tears down the named helper(s). Forgetting to emit \`helpers_done\` leaks teammates into indefinite life — name every helper you requested that is no longer needed.

Teardown has two triggers, used as belt + suspenders:

- **Primary (specialist-signaled):** the requester emits \`helpers_done\` as above. This is the normal path.
- **Safety net (lead-periodic):** every 3 specialist events, or at major milestones (design complete, implementation complete, review complete), the lead runs a roster check. Any helper with no recent cross-messages and no requester using it gets shut down.

Specialist forgetting ≠ leaked teammate (safety net catches it). Lead over-aggressive ≠ premature shutdown (safety net requires true idle).

## Review Result

Every review result must be one of:

- \`approved\`
- \`approved_with_notes\`
- \`rejected\`

And include:

- evidence checked
- risk or failure summary
- test adequacy summary
- whether missing automated coverage blocks approval
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

For substantive specialist tasks, the lead must populate:

- \`files\` — specific paths the specialist should read or modify
- \`call_sites\` — where the affected logic is invoked, for cross-cutting changes
- \`design_notes\` — decisions, edge cases, and constraints the lead has already identified

Specialists cannot delegate exploration to subagents. A handoff missing \`files\` or \`call_sites\` on a substantive task is a thin handoff; the specialist should emit a \`help_request\` (see Help Request below) rather than grep from scratch.

## Handoff Shape

The lead sets a \`size\` field on every specialist handoff:

\`\`\`
size: light | standard   (default: standard)
\`\`\`

- \`standard\` (default) — substantive work; specialist writes the role-appropriate artifact AND emits the structured completion message.
- \`light\` — trivial work (typo fixes, one-line config tweaks, variable renames); specialist emits the structured completion message only and skips the artifact write.

The completion message shape is identical in both sizes. Only the persisted artifact is conditional. Review gating, \`help_request\`, and \`helpers_done\` behave the same way regardless of size.

## Closing Discipline

A specialist's turn is not complete until the final actions of the turn are:

1. If the handoff specifies \`size: standard\` (or omits \`size\` — default is standard), persist the role-appropriate artifact via \`node "\${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" <writer> --repo "$PWD" --title "<short title>" ...\`. Writers by role: builder -> \`write-handoff\`; reviewer -> \`write-review-result\`; validator -> \`write-validation-result\`; deployer -> \`write-deployment-result\`; researcher -> \`write-handoff\` when findings ship ownership forward. Field discipline enforced by the CLI: \`write-handoff\` requires \`--title\`, \`--summary\`, \`--files\` (and refuses \`--size light\`); \`write-review-result\` requires \`--title\`, \`--decision\` (or \`--verdict\`), \`--evidence\`. Sparse invocations are rejected with a non-zero exit. If the handoff specifies \`size: light\`, skip this step.
2. Emit a final structured completion message using the shape for the role (completion report, review result, validation result, or deployment result). This step is required for both sizes.

Do not end the turn after a mid-implementation tool call — if you are about to return control without the completion message, stop and emit it first. If a hard blocker prevents the artifact write on a \`size: standard\` task, still emit the structured completion message and name the blocker explicitly.
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

const DEFAULT_PERMISSIONS_ALLOW = [
  "Write(.claude/artifacts/crew/**)",
  "Edit(.claude/artifacts/crew/**)",
  "Write(.claude/state/crew/**)",
  "Edit(.claude/state/crew/**)",
  "Write(.claude/logs/**)",
  "Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs:*)"
];

const DEFAULT_SETTINGS = {
  permissions: {
    allow: DEFAULT_PERMISSIONS_ALLOW
  },
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
      description.startsWith("crew:")
    );
  });
}

function mergePermissions(existing = {}, desiredAllow = []) {
  const currentAllow = Array.isArray(existing.allow) ? existing.allow : [];
  const seen = new Set(currentAllow);
  const merged = [...currentAllow];
  for (const entry of desiredAllow) {
    if (!seen.has(entry)) {
      merged.push(entry);
      seen.add(entry);
    }
  }
  return { ...existing, allow: merged };
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

async function updateSettings(repoPath, writes) {
  const settingsPath = path.join(repoPath, ".claude", "settings.json");
  const existing = await fs.readFile(settingsPath, "utf8").catch(() => null);
  const current = existing ? JSON.parse(existing) : {};
  const next = {
    ...current,
    permissions: mergePermissions(current.permissions, DEFAULT_PERMISSIONS_ALLOW),
    hooks: mergeHooks(current.hooks, DEFAULT_SETTINGS.hooks)
  };

  const changed = await writeFileIfChanged(settingsPath, indentJson(next));
  if (changed) {
    writes.push(path.relative(repoPath, settingsPath));
  }
}

async function removeStaleRepoHarnessCopies(repoPath, writes) {
  const staleRelPaths = [
    [".claude", "crew", "constitution.md"],
    [".claude", "crew", "workflow.md"],
    [".claude", "crew", "protocol.md"]
  ];
  for (const parts of staleRelPaths) {
    const fullPath = path.join(repoPath, ...parts);
    if (await pathExists(fullPath)) {
      await fs.rm(fullPath, { force: true });
      writes.push(`removed ${path.relative(repoPath, fullPath)}`);
    }
  }
}

async function writeHarnessFiles(repoPath, writes) {
  const files = [
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
  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8").catch(() => "");
  return {
    repoPath,
    exists: await pathExists(repoPath),
    hasClaudeMd: claudeMd.length > 0,
    hasDotClaude: await pathExists(path.join(repoPath, ".claude")),
    hasSettings: await pathExists(path.join(repoPath, ".claude", "settings.json")),
    hasHarnessLayer: claudeMd.includes("<!-- crew:start -->"),
    hasStateLayer: await pathExists(path.join(repoPath, ".claude", "state", "crew", "claims.json"))
  };
}

export async function bootstrapRepo(repoPath) {
  if (!(await pathExists(repoPath))) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }

  const writes = [];
  await removeStaleRepoHarnessCopies(repoPath, writes);
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

const CANONICAL_GLOBAL_FILES = [
  { name: "constitution.md", template: CONSTITUTION_TEMPLATE },
  { name: "workflow.md", template: WORKFLOW_TEMPLATE },
  { name: "protocol.md", template: PROTOCOL_TEMPLATE }
];

async function updateHomeClaudeMd(homePath, writes) {
  const claudePath = path.join(homePath, ".claude", "CLAUDE.md");
  const existing = await fs.readFile(claudePath, "utf8").catch(() => null);

  if (existing === null) {
    await ensureDir(path.dirname(claudePath));
    const contents = [
      "# Personal Claude Code Rules",
      "",
      "Cross-project preferences. Keep this file short and universal.",
      "",
      CLAUDE_IMPORT_BLOCK,
      ""
    ].join("\n");
    await fs.writeFile(claudePath, contents);
    writes.push(claudePath);
    return;
  }

  if (existing.includes("<!-- crew:start -->")) {
    return;
  }

  const next = `${existing.trimEnd()}\n\n${CLAUDE_IMPORT_BLOCK}\n`;
  await fs.writeFile(claudePath, next);
  writes.push(claudePath);
}

/**
 * Detect drift between in-memory canonical templates and the installed files
 * under ~/.claude/crew/. If drift is detected, rewrite the three canonical files
 * (constitution.md, workflow.md, protocol.md) so specialists always read the
 * current plugin version. Role-slot overlay files (builder.md, lead.md, etc.)
 * are never touched.
 *
 * First-run behaviour: if ~/.claude/crew/ does not yet exist, or none of the
 * three canonical files exist, the check is skipped — explicit installation
 * via install-user-assets is still required for that case.
 *
 * @param {{homePath?: string}} options
 * @returns {Promise<{
 *   refreshed: boolean,
 *   files: string[],
 *   crewPath: string,
 *   skipped?: "first_run"
 * }>}
 */
export async function syncUserTemplates(options = {}) {
  const homePath = path.resolve(options.homePath || os.homedir());
  const crewPath = path.join(homePath, ".claude", "crew");

  if (!(await pathExists(crewPath))) {
    return { refreshed: false, files: [], crewPath, skipped: "first_run" };
  }

  // If none of the canonical files are installed yet, treat as first-run too.
  const existences = await Promise.all(
    CANONICAL_GLOBAL_FILES.map(({ name }) => pathExists(path.join(crewPath, name)))
  );
  if (!existences.some(Boolean)) {
    return { refreshed: false, files: [], crewPath, skipped: "first_run" };
  }

  const refreshed = [];
  for (const { name, template } of CANONICAL_GLOBAL_FILES) {
    const filePath = path.join(crewPath, name);
    const desired = `${template}\n`;
    const existing = await fs.readFile(filePath, "utf8").catch(() => null);
    if (existing === desired) {
      continue;
    }
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, desired);
    refreshed.push(name);
  }

  return {
    refreshed: refreshed.length > 0,
    files: refreshed,
    crewPath
  };
}

export async function installUserAssets(options = {}) {
  const homePath = path.resolve(options.homePath || os.homedir());
  const crewPath = path.join(homePath, ".claude", "crew");
  const writes = [];

  await ensureDir(crewPath);

  const readmePath = path.join(crewPath, "README.md");
  if (await writeFileIfChanged(readmePath, `${USER_ASSET_README_TEMPLATE}\n`)) {
    writes.push(readmePath);
  }

  for (const { name, template } of CANONICAL_GLOBAL_FILES) {
    const filePath = path.join(crewPath, name);
    if (await writeFileIfChanged(filePath, `${template}\n`)) {
      writes.push(filePath);
    }
  }

  for (const [fileName, contents] of Object.entries(USER_OVERLAY_TEMPLATES)) {
    const filePath = path.join(crewPath, fileName);
    if (await writeFileIfMissing(filePath, `${contents}\n`)) {
      writes.push(filePath);
    }
  }

  await updateHomeClaudeMd(homePath, writes);

  return {
    mode: "install-user-assets",
    homePath,
    crewPath,
    writes
  };
}
