import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CREW_SOURCE_DIR = path.join(REPO_ROOT, "crew");

async function loadCrewFile(name) {
  const raw = await fs.readFile(path.join(CREW_SOURCE_DIR, name), "utf8");
  return raw.replace(/\n+$/, "\n");
}

async function getCanonicalGlobalFiles() {
  const names = [
    "constitution.md",
    "workflow.md",
    "protocol.md",
    "coder-rules.md",
    "validation-principles.md"
  ];
  return Promise.all(
    names.map(async (name) => ({ name, template: await loadCrewFile(name) }))
  );
}

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
  ".claude/artifacts/crew/lessons.md",
  ".claude/artifacts/crew/lessons-archive.md",
  ".claude/state/crew/claims.json",
  ".claude/state/crew/*.jsonl",
  ".claude/settings.local.json",
  "# crew:end"
].join("\n");

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

  const canonical = await getCanonicalGlobalFiles();

  // If none of the canonical files are installed yet, treat as first-run too.
  const existences = await Promise.all(
    canonical.map(({ name }) => pathExists(path.join(crewPath, name)))
  );
  if (!existences.some(Boolean)) {
    return { refreshed: false, files: [], crewPath, skipped: "first_run" };
  }

  const refreshed = [];
  for (const { name, template } of canonical) {
    const filePath = path.join(crewPath, name);
    const existing = await fs.readFile(filePath, "utf8").catch(() => null);
    if (existing === template) {
      continue;
    }
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, template);
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

  const canonical = await getCanonicalGlobalFiles();
  for (const { name, template } of canonical) {
    const filePath = path.join(crewPath, name);
    if (await writeFileIfChanged(filePath, template)) {
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
