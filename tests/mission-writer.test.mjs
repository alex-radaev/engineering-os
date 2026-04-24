import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  appendMissionEvent,
  readCurrentMission,
  recordCurrentMission,
  resolveMissionPath,
  writeMissionStatus
} from "../scripts/lib/mission-writer.mjs";

async function makeTempDir() {
  return mkdtemp(join(tmpdir(), "mission-writer-test-"));
}

test("writeMissionStatus atomically replaces prior contents", async () => {
  const dir = await makeTempDir();
  try {
    const statusFile = join(dir, "nested", "status.json");
    await writeMissionStatus({
      missionId: "m-1",
      statusFilePath: statusFile,
      taskId: "T-1",
      status: "in_progress",
      phase: "implementation",
      summary: "first write"
    });
    const v2 = await writeMissionStatus({
      missionId: "m-1",
      statusFilePath: statusFile,
      taskId: "T-1",
      status: "done",
      phase: "implementation",
      summary: "second write"
    });
    const onDisk = JSON.parse(await readFile(statusFile, "utf8"));
    assert.equal(onDisk.status, "done");
    assert.equal(onDisk.summary, "second write");
    assert.equal(onDisk.mission_id, "m-1");
    assert.equal(v2.status, "done");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("appendMissionEvent preserves prior lines", async () => {
  const dir = await makeTempDir();
  try {
    const eventLog = join(dir, "events.jsonl");
    await appendMissionEvent({ missionId: "m-2", eventLogPath: eventLog, event: "started", summary: "go" });
    await appendMissionEvent({ missionId: "m-2", eventLogPath: eventLog, event: "progress", phase: "impl", summary: "mid" });
    await appendMissionEvent({ missionId: "m-2", eventLogPath: eventLog, event: "done", summary: "fin" });
    const contents = await readFile(eventLog, "utf8");
    const lines = contents.split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length, 3);
    const parsed = lines.map((l) => JSON.parse(l));
    assert.equal(parsed[0].event, "started");
    assert.equal(parsed[1].event, "progress");
    assert.equal(parsed[1].phase, "impl");
    assert.equal(parsed[2].event, "done");
    for (const p of parsed) {
      assert.equal(p.mission_id, "m-2");
      assert.ok(typeof p.ts === "string" && p.ts.length > 0);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("writeMissionStatus throws when missionId is missing or empty", async () => {
  const dir = await makeTempDir();
  try {
    const statusFile = join(dir, "status.json");
    await assert.rejects(
      () => writeMissionStatus({ statusFilePath: statusFile, status: "done", summary: "x" }),
      TypeError
    );
    await assert.rejects(
      () => writeMissionStatus({ missionId: "", statusFilePath: statusFile, status: "done", summary: "x" }),
      TypeError
    );
    await assert.rejects(
      () => writeMissionStatus({ missionId: "m-x", status: "done", summary: "x" }),
      TypeError
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("appendMissionEvent throws when missionId or event missing", async () => {
  const dir = await makeTempDir();
  try {
    const eventLog = join(dir, "events.jsonl");
    await assert.rejects(
      () => appendMissionEvent({ eventLogPath: eventLog, event: "x", summary: "s" }),
      TypeError
    );
    await assert.rejects(
      () => appendMissionEvent({ missionId: "", eventLogPath: eventLog, event: "x", summary: "s" }),
      TypeError
    );
    await assert.rejects(
      () => appendMissionEvent({ missionId: "m-1", eventLogPath: eventLog, summary: "s" }),
      TypeError
    );
    await assert.rejects(
      () => appendMissionEvent({ missionId: "m-1", eventLogPath: eventLog, event: "", summary: "s" }),
      TypeError
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("writeMissionStatus round-trips all fields including artifact defaults", async () => {
  const dir = await makeTempDir();
  try {
    const statusFile = join(dir, "status.json");
    const written = await writeMissionStatus({
      missionId: "m-rt",
      statusFilePath: statusFile,
      status: "needs_user",
      summary: "awaiting decision",
      artifacts: { handoff: "/tmp/h.md" }
    });
    const onDisk = JSON.parse(await readFile(statusFile, "utf8"));
    assert.deepEqual(onDisk, written);
    assert.equal(onDisk.mission_id, "m-rt");
    assert.equal(onDisk.task_id, "");
    assert.equal(onDisk.repo, "");
    assert.equal(onDisk.phase, null);
    assert.equal(onDisk.proposed_task_status, null);
    assert.equal(onDisk.needs_user, false);
    assert.equal(onDisk.user_decision_needed, null);
    assert.equal(onDisk.next_action, null);
    assert.deepEqual(onDisk.artifacts, {
      handoff: "/tmp/h.md",
      review: null,
      validation: null,
      pr: null
    });
    assert.ok(typeof onDisk.updated_at === "string" && onDisk.updated_at.length > 0);

    const keys = Object.keys(onDisk);
    assert.deepEqual(keys, [
      "mission_id",
      "task_id",
      "repo",
      "status",
      "phase",
      "summary",
      "proposed_task_status",
      "needs_user",
      "user_decision_needed",
      "next_action",
      "artifacts",
      "updated_at"
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("recordCurrentMission writes current-mission.json and readCurrentMission returns null when missing", async () => {
  const dir = await makeTempDir();
  try {
    assert.equal(await readCurrentMission(dir), null);
    const envelope = {
      mission_id: "m-rec",
      task_id: "T-REC",
      repo: "engineering-os",
      reporting: {
        status_file: "/tmp/s.json",
        event_log: "/tmp/e.jsonl",
        handoff_file: "/tmp/h.md"
      }
    };
    const recorded = await recordCurrentMission({ repoPath: dir, envelope });
    assert.equal(recorded.mission_id, "m-rec");
    assert.equal(recorded.status_file, "/tmp/s.json");
    assert.equal(recorded.event_log, "/tmp/e.jsonl");
    assert.equal(recorded.handoff_file, "/tmp/h.md");
    const roundTrip = await readCurrentMission(dir);
    assert.deepEqual(roundTrip, recorded);

    const status = await resolveMissionPath({ repoPath: dir, kind: "status_file" });
    assert.equal(status, "/tmp/s.json");
    const eventLog = await resolveMissionPath({ repoPath: dir, kind: "event_log", explicitPath: "/tmp/override.jsonl" });
    assert.equal(eventLog, "/tmp/override.jsonl");

    await assert.rejects(() => recordCurrentMission({ repoPath: dir, envelope: null }), TypeError);
    await assert.rejects(() => recordCurrentMission({ envelope }), TypeError);
    await assert.rejects(
      () => recordCurrentMission({ repoPath: dir, envelope: { task_id: "no-mid" } }),
      TypeError
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
