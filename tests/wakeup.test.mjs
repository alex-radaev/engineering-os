import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { bootstrapRepo, installUserAssets, syncUserTemplates } from "../scripts/lib/installer.mjs";
import { buildWakeUpBrief } from "../scripts/lib/wakeup.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function setupRepo(prefix) {
  const repoPath = await makeTempDir(prefix);
  await fs.writeFile(path.join(repoPath, "CLAUDE.md"), "# Repo\n");
  await bootstrapRepo(repoPath);
  return repoPath;
}

test("syncUserTemplates skips first-run when ~/.claude/crew is missing", async () => {
  const homePath = await makeTempDir("crew-sync-first-run-");
  const result = await syncUserTemplates({ homePath });
  assert.equal(result.refreshed, false);
  assert.equal(result.skipped, "first_run");
  assert.deepEqual(result.files, []);
});

test("syncUserTemplates skips first-run when canonical files are absent", async () => {
  const homePath = await makeTempDir("crew-sync-empty-crew-");
  // Create the crew dir, but no canonical files — only an overlay.
  await fs.mkdir(path.join(homePath, ".claude", "crew"), { recursive: true });
  await fs.writeFile(path.join(homePath, ".claude", "crew", "lead.md"), "# overlay\n");
  const result = await syncUserTemplates({ homePath });
  assert.equal(result.skipped, "first_run");
  assert.equal(result.refreshed, false);
});

test("syncUserTemplates returns refreshed:false when files already match", async () => {
  const homePath = await makeTempDir("crew-sync-nodrift-");
  await installUserAssets({ homePath });
  const result = await syncUserTemplates({ homePath });
  assert.equal(result.refreshed, false);
  assert.deepEqual(result.files, []);
});

test("syncUserTemplates rewrites drifted canonical files and leaves overlays alone", async () => {
  const homePath = await makeTempDir("crew-sync-drift-");
  await installUserAssets({ homePath });

  const protocolPath = path.join(homePath, ".claude", "crew", "protocol.md");
  const leadPath = path.join(homePath, ".claude", "crew", "lead.md");

  // Hand-edit protocol to simulate drift; hand-edit lead overlay which should be preserved.
  await fs.writeFile(protocolPath, "# Stale Protocol\n");
  await fs.writeFile(leadPath, "# my custom lead\n");

  const result = await syncUserTemplates({ homePath });
  assert.equal(result.refreshed, true);
  assert.deepEqual(result.files, ["protocol.md"]);

  const refreshedProtocol = await fs.readFile(protocolPath, "utf8");
  assert.match(refreshedProtocol, /Crew Protocol/);
  assert.doesNotMatch(refreshedProtocol, /Stale Protocol/);

  const lead = await fs.readFile(leadPath, "utf8");
  assert.equal(lead, "# my custom lead\n", "role overlay must not be rewritten");
});

test("buildWakeUpBrief includes templateSync with refreshed:false when no drift", async () => {
  const repoPath = await setupRepo("crew-wakeup-nodrift-");
  const homePath = await makeTempDir("crew-wakeup-home-nodrift-");
  await installUserAssets({ homePath });

  const brief = await buildWakeUpBrief(repoPath, { homePath });
  assert.ok(brief.templateSync, "templateSync field should be present");
  assert.equal(brief.templateSync.refreshed, false);
  assert.deepEqual(brief.templateSync.files, []);
});

test("buildWakeUpBrief detects drift and reports refreshed files", async () => {
  const repoPath = await setupRepo("crew-wakeup-drift-");
  const homePath = await makeTempDir("crew-wakeup-home-drift-");
  await installUserAssets({ homePath });

  const constitutionPath = path.join(homePath, ".claude", "crew", "constitution.md");
  await fs.writeFile(constitutionPath, "# stale constitution\n");

  const brief = await buildWakeUpBrief(repoPath, { homePath });
  assert.equal(brief.templateSync.refreshed, true);
  assert.ok(brief.templateSync.files.includes("constitution.md"));

  const rewritten = await fs.readFile(constitutionPath, "utf8");
  assert.match(rewritten, /Crew Constitution/);
});

test("buildWakeUpBrief gracefully skips when ~/.claude/crew is absent", async () => {
  const repoPath = await setupRepo("crew-wakeup-first-run-");
  const homePath = await makeTempDir("crew-wakeup-home-first-run-");
  // Note: no installUserAssets — ~/.claude/crew does not exist.

  const brief = await buildWakeUpBrief(repoPath, { homePath });
  assert.equal(brief.templateSync.refreshed, false);
  assert.equal(brief.templateSync.skipped, "first_run");
});

test("buildWakeUpBrief returns null lessons fields when no lessons file exists", async () => {
  const repoPath = await setupRepo("crew-wakeup-nolesson-");
  const homePath = await makeTempDir("crew-wakeup-home-nolesson-");
  await installUserAssets({ homePath });

  const brief = await buildWakeUpBrief(repoPath, { homePath });
  assert.equal(brief.lessons, null);
  assert.equal(brief.lessonsArchive, null);
  assert.deepEqual(brief.staleLessons, []);
});

test("buildWakeUpBrief surfaces lessons content + archive + stale entries", async () => {
  const repoPath = await setupRepo("crew-wakeup-lessons-");
  const homePath = await makeTempDir("crew-wakeup-home-lessons-");
  await installUserAssets({ homePath });

  const lessonsDir = path.join(repoPath, ".claude", "artifacts", "crew");
  await fs.mkdir(lessonsDir, { recursive: true });

  // Today is dynamic; create one fresh entry and one entry from 100 days ago.
  const now = new Date();
  const stale = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
  const fresh = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const isoDate = (d) => d.toISOString().slice(0, 10);

  await fs.writeFile(
    path.join(lessonsDir, "lessons.md"),
    [
      "# Repo Lessons",
      "",
      "## Fresh entry",
      `last_verified: ${isoDate(fresh)}`,
      "",
      "Body",
      "",
      "## Stale entry",
      `last_verified: ${isoDate(stale)}`,
      "",
      "Body"
    ].join("\n")
  );

  await fs.writeFile(
    path.join(lessonsDir, "lessons-archive.md"),
    ["## Old A", "demoted: 2026-03-10", "", "Body"].join("\n")
  );

  const brief = await buildWakeUpBrief(repoPath, { homePath });
  assert.ok(brief.lessons, "lessons should be present");
  assert.match(brief.lessons.content, /Fresh entry/);
  assert.equal(brief.lessonsArchive.entries, 1);
  assert.equal(brief.lessonsArchive.lastDemoted, "2026-03-10");
  assert.ok(brief.staleLessons.length >= 1);
  assert.ok(brief.staleLessons.some((entry) => entry.title === "Stale entry"));
});
