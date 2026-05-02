import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  LESSONS_MAX_BYTES,
  LESSONS_MAX_LINES,
  buildLessonsBrief,
  parseStaleLessons,
  readLessons,
  readLessonsArchiveSummary
} from "../scripts/lib/lessons.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeLessons(repoPath, content) {
  const dir = path.join(repoPath, ".claude", "artifacts", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "lessons.md"), content);
}

async function writeArchive(repoPath, content) {
  const dir = path.join(repoPath, ".claude", "artifacts", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "lessons-archive.md"), content);
}

test("readLessons returns null when file is absent", async () => {
  const repo = await makeTempDir("crew-lessons-absent-");
  const result = await readLessons(repo);
  assert.equal(result, null);
});

test("readLessons returns content for an existing file", async () => {
  const repo = await makeTempDir("crew-lessons-present-");
  const body = "# Repo Lessons\n\n## Hello\nlast_verified: 2026-04-01\n\nA lesson.\n";
  await writeLessons(repo, body);

  const result = await readLessons(repo);
  assert.ok(result, "result should not be null");
  assert.equal(result.content, body);
  assert.equal(result.truncated, false);
  assert.equal(result.rawLineCount, body.split("\n").length);
});

test("readLessons truncates content over LESSONS_MAX_LINES", async () => {
  const repo = await makeTempDir("crew-lessons-toolong-");
  const lines = [];
  for (let i = 0; i < LESSONS_MAX_LINES + 50; i += 1) {
    lines.push(`## Lesson ${i}`);
    lines.push(`last_verified: 2026-04-01`);
    lines.push("");
  }
  await writeLessons(repo, lines.join("\n"));

  const result = await readLessons(repo);
  assert.equal(result.truncated, true);
  assert.ok(result.content.split("\n").length <= LESSONS_MAX_LINES);
});

test("readLessons truncates content over LESSONS_MAX_BYTES", async () => {
  const repo = await makeTempDir("crew-lessons-toobig-");
  const big = "x".repeat(LESSONS_MAX_BYTES + 1024);
  await writeLessons(repo, big);

  const result = await readLessons(repo);
  assert.equal(result.truncated, true);
  assert.ok(Buffer.byteLength(result.content, "utf8") <= LESSONS_MAX_BYTES);
});

test("readLessons handles multi-byte truncation gracefully", async () => {
  const repo = await makeTempDir("crew-lessons-multibyte-");
  // Build a body that overflows the byte cap with a 3-byte codepoint straddling
  // the boundary: pad to one byte under the cap, then place the multi-byte char.
  const pad = "a".repeat(LESSONS_MAX_BYTES - 1);
  const trailing = "—é日本語".repeat(40);
  await writeLessons(repo, pad + trailing);

  const result = await readLessons(repo);
  assert.equal(result.truncated, true);
  // Cap holds (some replacement bytes for the boundary codepoint are allowed,
  // but the result must remain valid UTF-8 and within the byte budget).
  assert.ok(Buffer.byteLength(result.content, "utf8") <= LESSONS_MAX_BYTES);
  // Round-tripping through Buffer must not throw on the truncated string.
  assert.equal(typeof result.content, "string");
});

test("parseStaleLessons returns nothing when content is null", () => {
  const result = parseStaleLessons(null);
  assert.deepEqual(result, []);
});

test("parseStaleLessons flags entries older than the threshold", () => {
  const today = new Date("2026-05-02T12:00:00Z");
  const content = [
    "## Recent",
    "last_verified: 2026-04-20",
    "",
    "Body",
    "",
    "## Old",
    "last_verified: 2026-03-01",
    "",
    "Stale body",
    ""
  ].join("\n");

  const stale = parseStaleLessons(content, { today, staleDays: 30 });
  assert.equal(stale.length, 1);
  assert.equal(stale[0].title, "Old");
  assert.equal(stale[0].lastVerified, "2026-03-01");
  assert.ok(stale[0].ageDays >= 60);
});

test("parseStaleLessons treats exactly-30-days as stale (boundary)", () => {
  const today = new Date("2026-05-02T12:00:00Z");
  const thirtyDaysAgo = "2026-04-02"; // 30 calendar days before today
  const content = [
    "## Edge",
    `last_verified: ${thirtyDaysAgo}`,
    "",
    "Body"
  ].join("\n");

  const stale = parseStaleLessons(content, { today, staleDays: 30 });
  assert.equal(stale.length, 1, "30-day-old entry should count as stale");
  assert.equal(stale[0].ageDays, 30);
});

test("parseStaleLessons does not flag a 29-day-old entry", () => {
  const today = new Date("2026-05-02T12:00:00Z");
  const content = [
    "## Recent",
    "last_verified: 2026-04-03", // 29 days before today
    "",
    "Body"
  ].join("\n");

  const stale = parseStaleLessons(content, { today, staleDays: 30 });
  assert.equal(stale.length, 0);
});

test("parseStaleLessons skips entries without last_verified", () => {
  const today = new Date("2026-05-02T12:00:00Z");
  const content = [
    "## No date",
    "",
    "Body",
    "",
    "## Has date",
    "last_verified: 2026-01-01",
    "",
    "Body"
  ].join("\n");

  const stale = parseStaleLessons(content, { today });
  assert.equal(stale.length, 1);
  assert.equal(stale[0].title, "Has date");
});

test("readLessonsArchiveSummary returns null when archive is absent", async () => {
  const repo = await makeTempDir("crew-archive-absent-");
  const result = await readLessonsArchiveSummary(repo);
  assert.equal(result, null);
});

test("readLessonsArchiveSummary counts demoted entries and finds latest demotion", async () => {
  const repo = await makeTempDir("crew-archive-counts-");
  const body = [
    "## Old lesson 1",
    "demoted: 2026-02-15",
    "",
    "Body",
    "",
    "## Old lesson 2",
    "demoted: 2026-04-01",
    "",
    "Body",
    "",
    "## Old lesson 3",
    "demoted: 2026-03-10",
    "",
    "Body"
  ].join("\n");
  await writeArchive(repo, body);

  const result = await readLessonsArchiveSummary(repo);
  assert.equal(result.entries, 3);
  assert.equal(result.lastDemoted, "2026-04-01");
});

test("readLessonsArchiveSummary ignores sections without demoted date", async () => {
  const repo = await makeTempDir("crew-archive-mixed-");
  const body = [
    "## Header note",
    "",
    "Some prose without a demoted date.",
    "",
    "## Real demotion",
    "demoted: 2026-04-10",
    "",
    "Body"
  ].join("\n");
  await writeArchive(repo, body);

  const result = await readLessonsArchiveSummary(repo);
  assert.equal(result.entries, 1);
  assert.equal(result.lastDemoted, "2026-04-10");
});

test("buildLessonsBrief composes lessons + archive + stale fields", async () => {
  const repo = await makeTempDir("crew-lessons-brief-");
  const today = new Date("2026-05-02T12:00:00Z");

  await writeLessons(
    repo,
    [
      "# Repo Lessons",
      "",
      "## Fresh",
      "last_verified: 2026-04-25",
      "",
      "Body",
      "",
      "## Stale",
      "last_verified: 2026-02-01",
      "",
      "Body"
    ].join("\n")
  );
  await writeArchive(
    repo,
    ["## Demoted A", "demoted: 2026-03-10", "", "Body"].join("\n")
  );

  const brief = await buildLessonsBrief(repo, { today, staleDays: 30 });
  assert.ok(brief.lessons);
  assert.equal(brief.lessons.truncated, false);
  assert.equal(brief.lessonsArchive.entries, 1);
  assert.equal(brief.lessonsArchive.lastDemoted, "2026-03-10");
  assert.equal(brief.staleLessons.length, 1);
  assert.equal(brief.staleLessons[0].title, "Stale");
});

test("buildLessonsBrief returns nulls and empty stale when no files", async () => {
  const repo = await makeTempDir("crew-lessons-brief-empty-");
  const brief = await buildLessonsBrief(repo);
  assert.equal(brief.lessons, null);
  assert.equal(brief.lessonsArchive, null);
  assert.deepEqual(brief.staleLessons, []);
});
