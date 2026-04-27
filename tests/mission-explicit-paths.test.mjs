import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);
const cliPath = fileURLToPath(new URL("../scripts/crew.mjs", import.meta.url));

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initRepo(prefix) {
  const root = await makeTempDir(prefix);
  const repoPath = path.join(root, "app");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);
  return repoPath;
}

test("write-mission-status without --status-file errors with a clear message", async () => {
  const repoPath = await initRepo("mep-no-status-file-");

  await assert.rejects(
    execFile("node", [
      cliPath,
      "write-mission-status",
      "--repo",
      repoPath,
      "--mission-id",
      "M-1",
      "--status",
      "done",
      "--summary",
      "no status file"
    ]),
    /--status-file is required/
  );
});

test("write-mission-status without --mission-id errors with a clear message", async () => {
  const repoPath = await initRepo("mep-no-mission-id-");
  const statusFile = path.join(repoPath, "out", "status.json");

  await assert.rejects(
    execFile("node", [
      cliPath,
      "write-mission-status",
      "--repo",
      repoPath,
      "--status-file",
      statusFile,
      "--status",
      "done",
      "--summary",
      "no mission id"
    ]),
    /--mission-id is required/
  );
});

test("append-mission-event without --event-log errors with a clear message", async () => {
  const repoPath = await initRepo("mep-no-event-log-");

  await assert.rejects(
    execFile("node", [
      cliPath,
      "append-mission-event",
      "--repo",
      repoPath,
      "--mission-id",
      "M-1",
      "--event",
      "started",
      "--summary",
      "go"
    ]),
    /--event-log is required/
  );
});

test("append-mission-event without --mission-id errors with a clear message", async () => {
  const repoPath = await initRepo("mep-no-mid-event-");
  const eventLog = path.join(repoPath, "out", "events.jsonl");

  await assert.rejects(
    execFile("node", [
      cliPath,
      "append-mission-event",
      "--repo",
      repoPath,
      "--event-log",
      eventLog,
      "--event",
      "started",
      "--summary",
      "go"
    ]),
    /--mission-id is required/
  );
});

test("record-mission no longer writes .claude/state/crew/current-mission.json", async () => {
  const repoPath = await initRepo("mep-record-noop-");
  const envelope = {
    mission_id: "M-NOOP",
    task_id: "T-NOOP",
    repo: "engineering-os",
    objective: "deprecation check",
    reporting: {
      status_file: path.join(repoPath, "out", "status.json"),
      event_log: path.join(repoPath, "out", "events.jsonl"),
      handoff_file: path.join(repoPath, "out", "handoff.md")
    }
  };
  const { stdout, stderr } = await execFile("node", [
    cliPath,
    "record-mission",
    "--repo",
    repoPath,
    "--envelope-json",
    JSON.stringify(envelope)
  ]);

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.deprecated, true);
  assert.equal(parsed.mission_id, "M-NOOP");
  assert.equal(parsed.status_file, envelope.reporting.status_file);
  assert.equal(parsed.event_log, envelope.reporting.event_log);
  assert.equal(parsed.handoff_file, envelope.reporting.handoff_file);
  assert.match(stderr, /deprecated/);

  const pointer = path.join(repoPath, ".claude", "state", "crew", "current-mission.json");
  const exists = await fs.access(pointer).then(() => true).catch(() => false);
  assert.equal(exists, false, "current-mission.json must not be written by record-mission");
});

test("record-mission existence does not change writer behavior — writers still need explicit flags", async () => {
  const repoPath = await initRepo("mep-record-no-effect-");
  const envelope = {
    mission_id: "M-NEFFECT",
    task_id: "T-NEFFECT",
    repo: "engineering-os",
    objective: "writers must not pick up paths from the deprecated record-mission call",
    reporting: {
      status_file: path.join(repoPath, "out", "status.json"),
      event_log: path.join(repoPath, "out", "events.jsonl"),
      handoff_file: path.join(repoPath, "out", "handoff.md")
    }
  };
  await execFile("node", [
    cliPath,
    "record-mission",
    "--repo",
    repoPath,
    "--envelope-json",
    JSON.stringify(envelope)
  ]);

  // Even though we just "recorded" the mission, write-mission-status without
  // --status-file must still fail. There is no fallback.
  await assert.rejects(
    execFile("node", [
      cliPath,
      "write-mission-status",
      "--repo",
      repoPath,
      "--mission-id",
      envelope.mission_id,
      "--status",
      "done",
      "--summary",
      "should fail"
    ]),
    /--status-file is required/
  );
});

test("two parallel mission runs with explicit flags do not interfere", async () => {
  const repoPath = await initRepo("mep-parallel-");
  const missionA = {
    missionId: "M-A",
    statusFile: path.join(repoPath, "miss-a", "status.json"),
    eventLog: path.join(repoPath, "miss-a", "events.jsonl")
  };
  const missionB = {
    missionId: "M-B",
    statusFile: path.join(repoPath, "miss-b", "status.json"),
    eventLog: path.join(repoPath, "miss-b", "events.jsonl")
  };

  // Drive both missions concurrently — interleave status writes and event
  // appends to maximize the chance of a shared-state regression surfacing.
  await Promise.all([
    (async () => {
      await execFile("node", [
        cliPath,
        "append-mission-event",
        "--repo",
        repoPath,
        "--mission-id",
        missionA.missionId,
        "--event-log",
        missionA.eventLog,
        "--event",
        "started",
        "--phase",
        "implementation",
        "--summary",
        "A start"
      ]);
      await execFile("node", [
        cliPath,
        "write-mission-status",
        "--repo",
        repoPath,
        "--mission-id",
        missionA.missionId,
        "--status-file",
        missionA.statusFile,
        "--status",
        "in_progress",
        "--phase",
        "implementation",
        "--summary",
        "A mid"
      ]);
      await execFile("node", [
        cliPath,
        "append-mission-event",
        "--repo",
        repoPath,
        "--mission-id",
        missionA.missionId,
        "--event-log",
        missionA.eventLog,
        "--event",
        "done",
        "--summary",
        "A end"
      ]);
    })(),
    (async () => {
      await execFile("node", [
        cliPath,
        "append-mission-event",
        "--repo",
        repoPath,
        "--mission-id",
        missionB.missionId,
        "--event-log",
        missionB.eventLog,
        "--event",
        "started",
        "--phase",
        "implementation",
        "--summary",
        "B start"
      ]);
      await execFile("node", [
        cliPath,
        "write-mission-status",
        "--repo",
        repoPath,
        "--mission-id",
        missionB.missionId,
        "--status-file",
        missionB.statusFile,
        "--status",
        "in_progress",
        "--phase",
        "implementation",
        "--summary",
        "B mid"
      ]);
      await execFile("node", [
        cliPath,
        "append-mission-event",
        "--repo",
        repoPath,
        "--mission-id",
        missionB.missionId,
        "--event-log",
        missionB.eventLog,
        "--event",
        "done",
        "--summary",
        "B end"
      ]);
    })()
  ]);

  // Each mission's status.json holds its own mission_id only.
  const statusA = JSON.parse(await fs.readFile(missionA.statusFile, "utf8"));
  const statusB = JSON.parse(await fs.readFile(missionB.statusFile, "utf8"));
  assert.equal(statusA.mission_id, missionA.missionId);
  assert.equal(statusA.summary, "A mid");
  assert.equal(statusB.mission_id, missionB.missionId);
  assert.equal(statusB.summary, "B mid");

  // Each event log holds only its own mission's events.
  const eventsA = (await fs.readFile(missionA.eventLog, "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const eventsB = (await fs.readFile(missionB.eventLog, "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  for (const e of eventsA) assert.equal(e.mission_id, missionA.missionId);
  for (const e of eventsB) assert.equal(e.mission_id, missionB.missionId);
  assert.equal(eventsA.length, 2);
  assert.equal(eventsB.length, 2);

  // No pointer file was created at any point.
  const pointer = path.join(repoPath, ".claude", "state", "crew", "current-mission.json");
  const exists = await fs.access(pointer).then(() => true).catch(() => false);
  assert.equal(exists, false);
});
