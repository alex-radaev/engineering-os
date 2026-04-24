// Writers that persist mission run-state to the paths named in the
// ORCHESTRATOR_MISSION envelope's `reporting.*` block. Pure module: no
// process exits, no console output, no top-level side effects. Throw on
// misuse; return values on success. See crew/workflow.md § Mission
// Reporting for the caller contract.

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

async function atomicWriteJson(filePath, obj) {
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(tmp, JSON.stringify(obj, null, 2));
  await rename(tmp, filePath);
}

export async function writeMissionStatus({
  missionId,
  statusFilePath,
  taskId,
  repo,
  status,
  phase,
  summary,
  proposedTaskStatus,
  needsUser,
  userDecisionNeeded,
  nextAction,
  artifacts,
  updatedAt
} = {}) {
  requireNonEmptyString(missionId, "missionId");
  if (!statusFilePath) {
    throw new TypeError("statusFilePath is required");
  }

  const defaultArtifacts = { handoff: null, review: null, validation: null, pr: null };
  const mergedArtifacts = { ...defaultArtifacts, ...(artifacts || {}) };

  const statusObject = {
    mission_id: missionId,
    task_id: taskId ?? "",
    repo: repo ?? "",
    status: status ?? null,
    phase: phase ?? null,
    summary: summary ?? "",
    proposed_task_status: proposedTaskStatus ?? null,
    needs_user: needsUser ?? false,
    user_decision_needed: userDecisionNeeded ?? null,
    next_action: nextAction ?? null,
    artifacts: mergedArtifacts,
    updated_at: updatedAt ?? new Date().toISOString()
  };

  await atomicWriteJson(statusFilePath, statusObject);
  return statusObject;
}

export async function appendMissionEvent({
  missionId,
  eventLogPath,
  event,
  phase,
  summary,
  ts
} = {}) {
  requireNonEmptyString(missionId, "missionId");
  if (!eventLogPath) {
    throw new TypeError("eventLogPath is required");
  }
  requireNonEmptyString(event, "event");

  const line = {
    ts: ts ?? new Date().toISOString(),
    mission_id: missionId,
    event,
    phase: phase ?? null,
    summary: summary ?? ""
  };

  await mkdir(dirname(eventLogPath), { recursive: true });
  await appendFile(eventLogPath, JSON.stringify(line) + "\n", { flag: "a" });
  return line;
}

export async function recordCurrentMission({ repoPath, envelope } = {}) {
  if (!repoPath) {
    throw new TypeError("repoPath is required");
  }
  if (!envelope || typeof envelope !== "object" || !envelope.mission_id) {
    throw new TypeError("envelope must be an object with a mission_id");
  }
  const reporting = envelope.reporting;
  if (reporting != null && typeof reporting !== "object") {
    throw new TypeError("envelope.reporting must be an object when present");
  }
  const reportingObj = reporting || {};

  const currentMission = {
    mission_id: envelope.mission_id,
    task_id: envelope.task_id ?? "",
    repo: envelope.repo ?? "",
    status_file: reportingObj.status_file ?? null,
    event_log: reportingObj.event_log ?? null,
    handoff_file: reportingObj.handoff_file ?? null,
    recorded_at: new Date().toISOString()
  };

  const filePath = join(repoPath, ".claude", "state", "crew", "current-mission.json");
  await atomicWriteJson(filePath, currentMission);
  return currentMission;
}

export async function readCurrentMission(repoPath) {
  if (!repoPath) {
    throw new TypeError("repoPath is required");
  }
  const filePath = join(repoPath, ".claude", "state", "crew", "current-mission.json");
  try {
    const contents = await readFile(filePath, "utf8");
    return JSON.parse(contents);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function resolveMissionPath({ repoPath, kind, explicitPath } = {}) {
  if (kind !== "status_file" && kind !== "event_log") {
    throw new TypeError("kind must be 'status_file' or 'event_log'");
  }
  if (typeof explicitPath === "string" && explicitPath.length > 0) {
    return explicitPath;
  }
  if (repoPath) {
    const current = await readCurrentMission(repoPath);
    if (current && current[kind]) {
      return current[kind];
    }
  }
  return null;
}
