import fs from "node:fs/promises";
import path from "node:path";
import {
  appendMissionEvent,
  writeMissionStatus
} from "./mission-writer.mjs";

const ARTIFACT_ROOT = [".claude", "artifacts", "crew"];

const TERMINAL_STATUS_VALUES = new Set([
  "done",
  "partial",
  "needs_user",
  "blocked",
  "abandoned"
]);

const PROPOSED_TASK_STATUS_VALUES = new Set([
  "candidate",
  "ready",
  "active",
  "blocked",
  "needs_review",
  "done",
  "parked",
  "cancelled"
]);

export const MISSION_TERMINAL_STATUS_VALUES = TERMINAL_STATUS_VALUES;
export const MISSION_PROPOSED_TASK_STATUS_VALUES = PROPOSED_TASK_STATUS_VALUES;

// Terminal statuses that signal the lead is NOT claiming the work is shippable.
// These bypass the rule #9 review gate because no separate reviewer is implied.
export const REVIEW_GATE_BYPASS_TERMINAL_STATUSES = new Set([
  "abandoned",
  "needs_user",
  "blocked"
]);

async function defaultReadEventLog(eventLogPath) {
  try {
    return await fs.readFile(eventLogPath, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return "";
    }
    throw err;
  }
}

function parseEventLines(raw) {
  if (!raw) return [];
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // Skip malformed lines; the gate must not fail open on garbage.
    }
  }
  return out;
}

// assertReviewGate enforces Crew constitution rule #9 ("the coder is not the
// reviewer") at the synthesis boundary. Throws an Error with .exitCode = 2 and
// .code = "RULE_9_VIOLATION" when terminalStatus claims the work is good but
// the event log lacks a `gate phase:review` event newer than the most recent
// implementation event. Bypasses for terminal statuses where the lead is not
// asserting completeness.
//
// noCodeChanges: explicit opt-out for research-only missions (investigations,
// audits, design docs that close without a diff). When true, the review-gate
// check is skipped — but if the event log contains any `phase=implementation`
// event, the call REJECTS with .code = "NO_CODE_CHANGES_BUT_IMPL_EVENT" to
// catch the misuse pattern of a lead who wrote code and tried to opt out.
// Bypass terminal statuses (abandoned, needs_user, blocked) take precedence
// over noCodeChanges and ignore the flag.
export async function assertReviewGate({ eventLog, terminalStatus, noCodeChanges = false, deps = {} } = {}) {
  if (REVIEW_GATE_BYPASS_TERMINAL_STATUSES.has(terminalStatus)) {
    return;
  }
  const read = deps.readEventLog || defaultReadEventLog;
  const raw = await read(eventLog);
  const events = parseEventLines(raw);

  let lastReview = null;
  let lastImpl = null;
  for (const e of events) {
    if (!e || typeof e !== "object") continue;
    const ts = typeof e.ts === "string" ? e.ts : "";
    if (e.event === "gate" && e.phase === "review") {
      if (!lastReview || ts > lastReview.ts) lastReview = { ...e, ts };
    }
    if (e.phase === "implementation") {
      if (!lastImpl || ts > lastImpl.ts) lastImpl = { ...e, ts };
    }
  }

  if (noCodeChanges) {
    if (lastImpl) {
      const err = new Error(
        `crew: --no-code-changes set but ${eventLog} contains a phase=implementation event ` +
          `at ${lastImpl.ts}. Either drop --no-code-changes and run a reviewer subagent, ` +
          "or close the mission as abandoned/needs_user/blocked."
      );
      err.exitCode = 2;
      err.code = "NO_CODE_CHANGES_BUT_IMPL_EVENT";
      throw err;
    }
    return;
  }

  const violated = !lastReview || (lastImpl && lastImpl.ts > lastReview.ts);
  if (violated) {
    const err = new Error(
      `crew: rule #9 violated — no review gate event in ${eventLog} since last implementation event. ` +
        "Spawn a reviewer subagent (see /crew:<cmd> step 23) and re-run. " +
        "If this mission produced no code changes (research, audit, design doc), " +
        "re-run with --no-code-changes."
    );
    err.exitCode = 2;
    err.code = "RULE_9_VIOLATION";
    throw err;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function timestampSlug() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function slugify(value) {
  return (value || "artifact")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "artifact";
}

function toList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderField(label, value) {
  return `- ${label}: ${value || "-"}`;
}

function renderListField(label, value) {
  const items = toList(value);
  if (items.length === 0) {
    return `- ${label}: -`;
  }
  return [
    `- ${label}:`,
    ...items.map((item) => `  - ${item}`)
  ].join("\n");
}

function resolveArtifactConfig(kind) {
  if (kind === "run-brief") {
    return {
      directory: "runs",
      prefix: "run-brief",
      render(fields) {
        return [
          `# Run Brief: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Goal", fields.goal),
          renderField("Mode", fields.mode),
          renderField("Pace", fields.pace),
          renderField("Owner", fields.owner),
          renderField("Status", fields.status || "active"),
          renderField("Summary", fields.summary),
          renderListField("Scope", fields.scope),
          renderListField("Out Of Scope", fields.outOfScope),
          renderListField("Planned Files", fields.files),
          renderField("Next Step", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "handoff") {
    return {
      directory: "handoffs",
      prefix: "handoff",
      render(fields) {
        return [
          `# Task Handoff: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("From", fields.from),
          renderField("To", fields.to),
          renderField("Objective", fields.goal || fields.summary),
          renderListField("Allowed Scope", fields.scope),
          renderListField("Forbidden Scope", fields.outOfScope),
          renderField("Deliverable", fields.deliverable),
          renderListField("Changed Files", fields.files),
          renderField("Confidence", fields.confidence),
          renderField("Risks", fields.risks),
          renderField("Suggested Next Handoff", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "review-result") {
    return {
      directory: "reviews",
      prefix: "review-result",
      render(fields) {
        return [
          `# Review Result: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Reviewer", fields.reviewer || fields.owner),
          renderField("Decision", fields.decision || "approved_with_notes"),
          renderField("Summary", fields.summary),
          renderListField("Evidence Checked", fields.evidence),
          renderListField("Files Reviewed", fields.files),
          renderField("Test Adequacy", fields.testSummary),
          renderField("Risks", fields.risks),
          renderField("Required Follow-up", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "final-synthesis") {
    return {
      directory: "runs",
      prefix: "final-synthesis",
      render(fields) {
        return [
          `# Final Synthesis: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Owner", fields.owner),
          renderField("Outcome", fields.status || "completed"),
          renderField("Summary", fields.summary),
          renderListField("Changed Files / Evidence", fields.files || fields.evidence),
          renderListField("Run / Test Steps", fields.runSteps),
          renderField("External Deltas", fields.externalDeltas),
          renderField("Risks", fields.risks),
          renderField("Next Step", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "validation-result") {
    return {
      directory: "validations",
      prefix: "validation-result",
      render(fields) {
        return [
          `# Validation Result: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Validator", fields.validator || fields.owner),
          renderField("Environment", fields.environment),
          renderField("Scenario", fields.scenario),
          renderField("Decision", fields.decision || "passed"),
          renderField("Summary", fields.summary),
          renderListField("Executed Evidence", fields.executedEvidence),
          renderField("Inferred Confidence", fields.inferredConfidence),
          renderField("Risks Or Blockers", fields.risks),
          renderField("Recommended Next Step", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "deployment-result") {
    return {
      directory: "deployments",
      prefix: "deployment-result",
      render(fields) {
        return [
          `# Deployment Result: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Deployer", fields.deployer || fields.owner),
          renderField("Environment", fields.environment),
          renderField("Target", fields.target || fields.to),
          renderField("Outcome", fields.decision || "verified"),
          renderField("Summary", fields.summary),
          renderListField("Evidence Checked", fields.evidence),
          renderField("Risks Or Blockers", fields.risks),
          renderField("Recommended Next Step", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  throw new Error(`Unsupported artifact kind: ${kind}`);
}

function hasContent(value) {
  if (value == null) {
    return false;
  }
  const str = String(value).trim();
  if (!str) {
    return false;
  }
  if (str === "-") {
    return false;
  }
  return true;
}

function hasListContent(value) {
  return toList(value).length > 0;
}

export function validateArtifactFields(kind, fields = {}) {
  const errors = [];
  const warnings = [];

  if (fields.force) {
    return { errors, warnings };
  }

  if (kind === "handoff") {
    if (fields.size && String(fields.size).toLowerCase() === "light") {
      errors.push(
        "write-handoff refuses --size light: light-size handoffs do not persist artifacts. " +
          "Emit only the structured completion message instead. Pass --force to override."
      );
      return { errors, warnings };
    }
    if (!hasContent(fields.title)) {
      errors.push("write-handoff requires --title <text>.");
    }
    if (!hasContent(fields.summary) && !hasContent(fields.goal)) {
      errors.push(
        "write-handoff requires --summary <text> (what was done / what is being handed off). " +
          "A handoff without a summary is unusable for the next session."
      );
    }
    if (!hasListContent(fields.files)) {
      errors.push(
        "write-handoff requires --files <a,b,c> (changed or inspected files). " +
          "If genuinely no files changed, pass --files none or --force."
      );
    }
    if (!hasContent(fields.from)) {
      warnings.push("write-handoff: --from <role> is recommended (source of handoff).");
    }
    if (!hasContent(fields.to)) {
      warnings.push("write-handoff: --to <role> is recommended (receiver of handoff).");
    }
  }

  if (kind === "final-synthesis") {
    if (!hasContent(fields.externalDeltas)) {
      errors.push(
        "write-final-synthesis requires --external-deltas <text>. " +
          "Enumerate off-repo changes this PR depends on — Cloud Run env vars, terraform, helm values, sibling-repo PRs, feature flags, DB migrations, IAM. " +
          "Pass --external-deltas none explicitly if there are no sibling changes. " +
          "A silent default hides silent-drift bugs (the renamed env var that never flipped in the running service)."
      );
    }
  }

  if (kind === "review-result") {
    if (!hasContent(fields.title)) {
      errors.push("write-review-result requires --title <text>.");
    }
    if (!hasContent(fields.decision)) {
      errors.push(
        "write-review-result requires --decision <approved|approved_with_notes|rejected> " +
          "(or --verdict as alias). A review without a decision is meaningless."
      );
    }
    if (!hasListContent(fields.evidence)) {
      errors.push(
        "write-review-result requires --evidence <a,b,c> (what was actually examined: files, commands, tests). " +
          "Pass --force to override if truly unavailable."
      );
    }
    if (!hasContent(fields.testSummary)) {
      warnings.push(
        "write-review-result: --test-summary <text> is recommended for code-bearing reviews. " +
          "Omit only for doc-only reviews."
      );
    }
  }

  return { errors, warnings };
}

export async function writeArtifact(repoPath, kind, fields = {}) {
  const validation = validateArtifactFields(kind, fields);
  if (validation.errors.length > 0) {
    const err = new Error(
      `Artifact validation failed for ${kind}:\n  - ${validation.errors.join("\n  - ")}`
    );
    err.validationErrors = validation.errors;
    err.validationWarnings = validation.warnings;
    throw err;
  }
  const config = resolveArtifactConfig(kind);
  const artifactDir = path.join(repoPath, ...ARTIFACT_ROOT, config.directory);
  await fs.mkdir(artifactDir, { recursive: true });

  const title = fields.title || fields.summary || kind;
  const fileName = `${timestampSlug()}-${config.prefix}-${slugify(title)}.md`;
  const artifactPath = path.join(artifactDir, fileName);
  const contents = `${config.render(fields)}\n`;

  await fs.writeFile(artifactPath, contents);

  return {
    kind,
    path: artifactPath,
    title: fields.title || "Untitled"
  };
}

// writeFinalSynthesisWithMission — writes the synthesis md via writeArtifact,
// then (when the caller supplies mission-terminal fields) updates mission
// status.json, appends a terminal event, and copies the synthesis body to the
// passed handoff path.
//
// Contract:
// - Always writes the synthesis md (existing behavior).
// - When terminalStatus is set, the caller MUST pass missionId + statusFile +
//   eventLog explicitly (captured from the envelope's mission_id and
//   reporting.* paths at parse-time). No pointer-file fallback — see T-X-05.
// - When terminalStatus is set: write status.json, append a terminal event
//   (kind = terminalStatus), and copy the synthesis md to handoffOut if
//   passed. handoffOut is the only way to request a handoff copy now;
//   callers should default it to the envelope's reporting.handoff_file.
// - When no terminalStatus is passed: behave as the old writeArtifact — no
//   status rewrite, no event, no handoff copy. Mid-run syntheses should not
//   mark a mission terminal.
export async function writeFinalSynthesisWithMission(repoPath, fields = {}, missionOpts = {}) {
  const artifact = await writeArtifact(repoPath, "final-synthesis", fields);

  const {
    terminalStatus,
    proposedTaskStatus,
    nextAction,
    handoffOut,
    statusFile,
    eventLog,
    missionId,
    taskId,
    repo: missionRepo,
    phase: phaseOpt,
    noCodeChanges
  } = missionOpts;
  const hasTerminal = terminalStatus != null && terminalStatus !== "";

  if (!hasTerminal) {
    return { ...artifact, mission: null };
  }

  if (!TERMINAL_STATUS_VALUES.has(terminalStatus)) {
    throw new Error(
      `Invalid --mission-terminal-status "${terminalStatus}". Valid values: ${[...TERMINAL_STATUS_VALUES].join(", ")}.`
    );
  }
  if (proposedTaskStatus != null && !PROPOSED_TASK_STATUS_VALUES.has(proposedTaskStatus)) {
    throw new Error(
      `Invalid --proposed-task-status "${proposedTaskStatus}". Valid values: ${[...PROPOSED_TASK_STATUS_VALUES].join(", ")}.`
    );
  }

  if (!missionId) {
    throw new Error(
      "write-final-synthesis: --mission-terminal-status requires --mission-id. " +
        "Pass the envelope's mission_id explicitly (no pointer-file fallback)."
    );
  }
  if (!statusFile) {
    throw new Error(
      "write-final-synthesis: --mission-terminal-status requires --status-file. " +
        "Pass the envelope's reporting.status_file explicitly."
    );
  }
  if (!eventLog) {
    throw new Error(
      "write-final-synthesis: --mission-terminal-status requires --event-log. " +
        "Pass the envelope's reporting.event_log explicitly."
    );
  }

  await assertReviewGate({
    eventLog,
    terminalStatus,
    noCodeChanges: noCodeChanges === true,
    deps: missionOpts.gateDeps || {}
  });

  const handoffFilePath = handoffOut || null;
  const phase = phaseOpt || "implementation";
  const summary = fields.summary || "";

  const writtenStatus = await writeMissionStatus({
    missionId,
    statusFilePath: statusFile,
    taskId: taskId || undefined,
    repo: missionRepo || undefined,
    status: terminalStatus,
    phase,
    summary,
    proposedTaskStatus: proposedTaskStatus ?? undefined,
    nextAction: nextAction ?? undefined,
    artifacts: { handoff: handoffFilePath || null }
  });

  const writtenEvent = await appendMissionEvent({
    missionId,
    eventLogPath: eventLog,
    event: terminalStatus,
    phase,
    summary
  });

  let handoffCopyPath = null;
  if (handoffFilePath) {
    await fs.mkdir(path.dirname(handoffFilePath), { recursive: true });
    await fs.copyFile(artifact.path, handoffFilePath);
    handoffCopyPath = handoffFilePath;
  }

  return {
    ...artifact,
    mission: {
      mission_id: missionId,
      status_file: statusFile,
      event_log: eventLog,
      handoff_file: handoffCopyPath,
      status: writtenStatus,
      event: writtenEvent
    }
  };
}
