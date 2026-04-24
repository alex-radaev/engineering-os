import test from "node:test";
import assert from "node:assert/strict";

import { parseMissionEnvelope } from "../scripts/lib/mission-envelope.mjs";

test("returns null envelope when first non-empty line is not the header", () => {
  const prompt = "Hello lead.\nPlease build a thing.\n";
  const result = parseMissionEnvelope(prompt);
  assert.equal(result.envelope, null);
  assert.equal(result.body, prompt);
});

test("returns null envelope for empty or non-string input", () => {
  assert.deepEqual(parseMissionEnvelope(""), { envelope: null, body: "" });
  assert.deepEqual(parseMissionEnvelope(null), { envelope: null, body: "" });
  assert.deepEqual(parseMissionEnvelope(undefined), { envelope: null, body: "" });
});

test("parses a full envelope with End of mission envelope. terminator", () => {
  const prompt = [
    "ORCHESTRATOR_MISSION",
    "mission_id: m-42",
    "task_id: T-CREW-01",
    "repo: engineering-os",
    "objective: Teach the lead to parse the mission envelope.",
    "scope:",
    "  Touch only the files enumerated in the ticket.",
    "  Do not modify agents or protocol.",
    "acceptance_criteria:",
    "  Parser unit tests pass.",
    "  Command docs reference the envelope.",
    "reporting:",
    "  status_file: /tmp/status.json",
    "  event_log: /tmp/events.jsonl",
    "  handoff_file: /tmp/handoff.md",
    "End of mission envelope.",
    "",
    "Please proceed with the bounded work.",
    ""
  ].join("\n");

  const { envelope, body } = parseMissionEnvelope(prompt);
  assert.ok(envelope, "envelope should be present");
  assert.equal(envelope.mission_id, "m-42");
  assert.equal(envelope.task_id, "T-CREW-01");
  assert.equal(envelope.repo, "engineering-os");
  assert.equal(envelope.objective, "Teach the lead to parse the mission envelope.");
  assert.match(envelope.scope, /Touch only the files enumerated/);
  assert.match(envelope.scope, /Do not modify agents or protocol/);
  assert.match(envelope.acceptance_criteria, /Parser unit tests pass/);
  assert.equal(typeof envelope.reporting, "object");
  assert.equal(envelope.reporting.status_file, "/tmp/status.json");
  assert.equal(envelope.reporting.event_log, "/tmp/events.jsonl");
  assert.equal(envelope.reporting.handoff_file, "/tmp/handoff.md");
  assert.match(body, /Please proceed with the bounded work\./);
});

test("slash-command terminator keeps the slash-command line in the body", () => {
  const prompt = [
    "ORCHESTRATOR_MISSION",
    "mission_id: m-7",
    "objective: Fix the flaky login test.",
    "scope:",
    "  Only the login test file.",
    "/crew:investigate-bug fix flaky login"
  ].join("\n");

  const { envelope, body } = parseMissionEnvelope(prompt);
  assert.ok(envelope);
  assert.equal(envelope.mission_id, "m-7");
  assert.equal(envelope.objective, "Fix the flaky login test.");
  assert.match(envelope.scope, /Only the login test file\./);
  assert.match(body, /^\/crew:investigate-bug fix flaky login$/m);
});

test("multi-line scope and acceptance_criteria strip leading 2-space indent and preserve line breaks", () => {
  const prompt = [
    "ORCHESTRATOR_MISSION",
    "mission_id: m-1",
    "objective: Do the thing.",
    "scope:",
    "  First paragraph of scope.",
    "  Second line of scope.",
    "acceptance_criteria:",
    "  - criterion one",
    "  - criterion two",
    "End of mission envelope."
  ].join("\n");

  const { envelope } = parseMissionEnvelope(prompt);
  assert.equal(envelope.scope, "First paragraph of scope.\nSecond line of scope.");
  assert.equal(envelope.acceptance_criteria, "- criterion one\n- criterion two");
});

test("preserves unknown top-level keys", () => {
  const prompt = [
    "ORCHESTRATOR_MISSION",
    "mission_id: m-9",
    "objective: do stuff",
    "custom_key: custom value",
    "End of mission envelope.",
    "body line"
  ].join("\n");

  const { envelope, body } = parseMissionEnvelope(prompt);
  assert.equal(envelope.custom_key, "custom value");
  assert.equal(body.trim(), "body line");
});

test("missing required fields does not throw — returns whatever parsed", () => {
  const prompt = [
    "ORCHESTRATOR_MISSION",
    "task_id: T-CREW-99",
    "scope:",
    "  some scope",
    "End of mission envelope.",
    "tail"
  ].join("\n");

  const { envelope } = parseMissionEnvelope(prompt);
  assert.ok(envelope, "envelope object returned even without mission_id/objective");
  assert.equal(envelope.mission_id, undefined);
  assert.equal(envelope.objective, undefined);
  assert.equal(envelope.task_id, "T-CREW-99");
});

test("header must be on the first non-empty line — leading prose disables envelope", () => {
  const prompt = [
    "Some orchestrator preamble here.",
    "ORCHESTRATOR_MISSION",
    "mission_id: m-1",
    "objective: do things",
    "End of mission envelope."
  ].join("\n");

  const { envelope, body } = parseMissionEnvelope(prompt);
  assert.equal(envelope, null);
  assert.equal(body, prompt);
});

test("leading blank lines before header are tolerated", () => {
  const prompt = [
    "",
    "",
    "ORCHESTRATOR_MISSION",
    "mission_id: m-2",
    "objective: ok",
    "End of mission envelope.",
    "body"
  ].join("\n");

  const { envelope, body } = parseMissionEnvelope(prompt);
  assert.ok(envelope);
  assert.equal(envelope.mission_id, "m-2");
  assert.equal(body.trim(), "body");
});
