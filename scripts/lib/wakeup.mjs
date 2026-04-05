import fs from "node:fs/promises";
import path from "node:path";

import { listApprovals } from "./approvals.mjs";
import { listClaims } from "./claims.mjs";

const RUNS_DIR = [".claude", "artifacts", "engineering-os", "runs"];
const HANDOFFS_DIR = [".claude", "artifacts", "engineering-os", "handoffs"];
const REVIEWS_DIR = [".claude", "artifacts", "engineering-os", "reviews"];
const EVENTS_PATH = [".claude", "logs", "events.jsonl"];
const HISTORY_PATH = [".claude", "state", "engineering-os", "history.jsonl"];
const SPRINT_PATH = [".claude", "state", "engineering-os", "sprint.json"];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonl(filePath) {
  if (!(await pathExists(filePath))) {
    return [];
  }
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function readJson(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function listFilesNewestFirst(dirPath) {
  if (!(await pathExists(dirPath))) {
    return [];
  }

  const entries = await fs.readdir(dirPath);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isFile()) {
      files.push({ path: fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  return files.sort((left, right) => right.mtimeMs - left.mtimeMs);
}

async function latestArtifactByPrefix(repoPath, subdir, prefix) {
  const dirPath = path.join(repoPath, ...subdir);
  const files = await listFilesNewestFirst(dirPath);
  const match = files.find((file) => path.basename(file.path).includes(`-${prefix}-`));
  if (!match) {
    return null;
  }

  const body = await fs.readFile(match.path, "utf8");
  const [heading = ""] = body.split("\n");
  return {
    path: match.path,
    title: heading.replace(/^#\s+/, "").trim(),
    updatedAt: new Date(match.mtimeMs).toISOString()
  };
}

function tail(items, count = 5) {
  return items.slice(Math.max(0, items.length - count));
}

export async function buildWakeUpBrief(repoPath) {
  const openApprovals = await listApprovals(repoPath, { status: "open" });
  const claims = await listClaims(repoPath);
  const sprint = await readJson(path.join(repoPath, ...SPRINT_PATH));
  const recentEvents = tail(await readJsonl(path.join(repoPath, ...EVENTS_PATH)), 5).map((event) => ({
    timestamp: event.timestamp,
    event: event.event,
    payloadPath: event.payloadPath || ""
  }));
  const recentClaimHistory = tail(await readJsonl(path.join(repoPath, ...HISTORY_PATH)), 5);

  const latestRunBrief = await latestArtifactByPrefix(repoPath, RUNS_DIR, "run-brief");
  const latestFinalSynthesis = await latestArtifactByPrefix(repoPath, RUNS_DIR, "final-synthesis");
  const latestHandoff = await latestArtifactByPrefix(repoPath, HANDOFFS_DIR, "handoff");
  const latestReview = await latestArtifactByPrefix(repoPath, REVIEWS_DIR, "review-result");

  return {
    repoPath,
    hasClaudeMd: await pathExists(path.join(repoPath, "CLAUDE.md")),
    sprint,
    claims,
    openApprovals,
    recentClaimHistory,
    recentEvents,
    latestArtifacts: {
      runBrief: latestRunBrief,
      finalSynthesis: latestFinalSynthesis,
      handoff: latestHandoff,
      review: latestReview
    },
    summary: {
      activeClaims: claims.length,
      openApprovals: openApprovals.length,
      hasRecentRunMemory: Boolean(latestRunBrief || latestFinalSynthesis || latestHandoff || latestReview),
      latestArtifactTitle:
        latestFinalSynthesis?.title ||
        latestRunBrief?.title ||
        latestHandoff?.title ||
        latestReview?.title ||
        null
    }
  };
}
