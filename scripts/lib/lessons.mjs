import fs from "node:fs/promises";
import path from "node:path";

export const LESSONS_PATH_PARTS = [".claude", "artifacts", "crew", "lessons.md"];
export const LESSONS_ARCHIVE_PATH_PARTS = [".claude", "artifacts", "crew", "lessons-archive.md"];

export const LESSONS_MAX_BYTES = 25 * 1024;
export const LESSONS_MAX_LINES = 200;
export const LESSONS_STALE_DAYS_DEFAULT = 30;

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function truncateAtCodepointBoundary(buffer, maxBytes) {
  if (buffer.length <= maxBytes) {
    return buffer;
  }
  // UTF-8 continuation bytes match 10xxxxxx (0x80-0xBF). Walk back from the
  // cut to the first byte that is NOT a continuation byte, so we never split
  // a multi-byte codepoint. toString('utf8') would otherwise replace partial
  // codepoints with U+FFFD (3 bytes each), causing the result to grow past
  // the byte cap.
  let end = maxBytes;
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) {
    end -= 1;
  }
  return buffer.subarray(0, end);
}

function truncateContent(raw) {
  let truncated = false;
  let content = raw;

  const buffer = Buffer.from(content, "utf8");
  if (buffer.length > LESSONS_MAX_BYTES) {
    content = truncateAtCodepointBoundary(buffer, LESSONS_MAX_BYTES).toString("utf8");
    truncated = true;
  }

  const lines = content.split("\n");
  if (lines.length > LESSONS_MAX_LINES) {
    content = lines.slice(0, LESSONS_MAX_LINES).join("\n");
    truncated = true;
  }

  return { content, truncated };
}

export async function readLessons(repoPath) {
  const filePath = path.join(repoPath, ...LESSONS_PATH_PARTS);
  if (!(await pathExists(filePath))) {
    return null;
  }

  const raw = await fs.readFile(filePath, "utf8");
  const { content, truncated } = truncateContent(raw);
  return {
    path: filePath,
    content,
    rawByteSize: Buffer.byteLength(raw, "utf8"),
    rawLineCount: raw.split("\n").length,
    truncated
  };
}

function parseSections(content) {
  if (!content) {
    return [];
  }

  const lines = content.split("\n");
  const sections = [];
  let currentTitle = null;
  let currentBody = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+?)\s*$/);
    if (headingMatch) {
      if (currentTitle != null) {
        sections.push({ title: currentTitle, body: currentBody.join("\n") });
      }
      currentTitle = headingMatch[1];
      currentBody = [];
      continue;
    }
    if (currentTitle != null) {
      currentBody.push(line);
    }
  }

  if (currentTitle != null) {
    sections.push({ title: currentTitle, body: currentBody.join("\n") });
  }

  return sections;
}

function extractDate(body, key) {
  const re = new RegExp(`^${key}:\\s*(\\d{4}-\\d{2}-\\d{2})\\s*$`, "m");
  const match = body.match(re);
  return match ? match[1] : null;
}

function daysBetween(fromIso, toDate) {
  const from = new Date(`${fromIso}T00:00:00Z`);
  if (Number.isNaN(from.getTime())) {
    return null;
  }
  const ms = toDate.getTime() - from.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function parseStaleLessons(content, options = {}) {
  const today = options.today instanceof Date ? options.today : new Date();
  const staleDays = options.staleDays ?? LESSONS_STALE_DAYS_DEFAULT;
  const sections = parseSections(content);

  const stale = [];
  for (const section of sections) {
    const lastVerified = extractDate(section.body, "last_verified");
    if (!lastVerified) {
      continue;
    }
    const ageDays = daysBetween(lastVerified, today);
    if (ageDays == null) {
      continue;
    }
    if (ageDays >= staleDays) {
      stale.push({ title: section.title, lastVerified, ageDays });
    }
  }
  return stale;
}

export async function readLessonsArchiveSummary(repoPath) {
  const filePath = path.join(repoPath, ...LESSONS_ARCHIVE_PATH_PARTS);
  if (!(await pathExists(filePath))) {
    return null;
  }

  const raw = await fs.readFile(filePath, "utf8");
  const sections = parseSections(raw);

  let entries = 0;
  let lastDemoted = null;
  for (const section of sections) {
    const demoted = extractDate(section.body, "demoted");
    if (!demoted) {
      continue;
    }
    entries += 1;
    if (lastDemoted == null || demoted > lastDemoted) {
      lastDemoted = demoted;
    }
  }

  return {
    path: filePath,
    entries,
    lastDemoted
  };
}

export async function buildLessonsBrief(repoPath, options = {}) {
  const lessons = await readLessons(repoPath);
  const archive = await readLessonsArchiveSummary(repoPath);
  const staleLessons = parseStaleLessons(lessons?.content ?? null, options);

  return {
    lessons,
    lessonsArchive: archive,
    staleLessons
  };
}
