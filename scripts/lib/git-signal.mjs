import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const DEFAULT_TIMEOUT_MS = 3000;
const RECENT_LOCAL_LIMIT = 5;
const RECENT_MAIN_LIMIT = 10;

async function run(cmd, cwd, timeout = DEFAULT_TIMEOUT_MS) {
  try {
    const { stdout } = await execAsync(cmd, { cwd, timeout, maxBuffer: 1024 * 1024 });
    return { ok: true, stdout: stdout.toString() };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

function parseCommits(raw) {
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, author, date, ...subjectParts] = line.split("\x1f");
      return { sha, author, date, subject: subjectParts.join("\x1f") };
    });
}

async function detectMainBranch(cwd) {
  const symbolic = await run("git symbolic-ref --quiet --short refs/remotes/origin/HEAD", cwd);
  if (symbolic.ok) {
    const name = symbolic.stdout.trim().replace(/^origin\//, "");
    if (name) return name;
  }
  for (const candidate of ["main", "master"]) {
    const check = await run(`git rev-parse --verify --quiet refs/remotes/origin/${candidate}`, cwd);
    if (check.ok) return candidate;
  }
  return "main";
}

export async function collectGitSignal(repoPath) {
  const isRepo = await run("git rev-parse --is-inside-work-tree", repoPath);
  if (!isRepo.ok || isRepo.stdout.trim() !== "true") {
    return { available: false, reason: "not-a-git-repo" };
  }

  const mainBranch = await detectMainBranch(repoPath);

  const [branchRes, upstreamRes, statusRes, aheadBehindRes, recentLocalRes, recentMainRes, branchesRes] =
    await Promise.all([
      run("git rev-parse --abbrev-ref HEAD", repoPath),
      run("git rev-parse --abbrev-ref --symbolic-full-name @{u}", repoPath),
      run("git status --porcelain", repoPath),
      run(`git rev-list --left-right --count HEAD...origin/${mainBranch}`, repoPath),
      run(
        `git log -n ${RECENT_LOCAL_LIMIT} --pretty=format:%h%x1f%an%x1f%ad%x1f%s --date=iso-strict HEAD`,
        repoPath
      ),
      run(
        `git log -n ${RECENT_MAIN_LIMIT} --pretty=format:%h%x1f%an%x1f%ad%x1f%s --date=iso-strict origin/${mainBranch}`,
        repoPath
      ),
      run("git for-each-ref --format=%(refname:short)%x1f%(upstream:track) refs/heads/", repoPath)
    ]);

  const branch = branchRes.ok ? branchRes.stdout.trim() : null;
  const upstream = upstreamRes.ok ? upstreamRes.stdout.trim() : null;

  const statusLines = statusRes.ok
    ? statusRes.stdout.split("\n").filter((line) => line.length > 0)
    : [];
  const modified = statusLines.filter((line) => !line.startsWith("??")).length;
  const untracked = statusLines.filter((line) => line.startsWith("??")).length;

  let ahead = null;
  let behind = null;
  if (aheadBehindRes.ok) {
    const parts = aheadBehindRes.stdout.trim().split(/\s+/);
    if (parts.length === 2) {
      ahead = Number.parseInt(parts[0], 10);
      behind = Number.parseInt(parts[1], 10);
    }
  }

  const otherBranches = [];
  if (branchesRes.ok) {
    for (const line of branchesRes.stdout.split("\n")) {
      if (!line) continue;
      const [name, track] = line.split("\x1f");
      if (!name || name === branch) continue;
      if (track && /\[.*ahead/.test(track)) {
        otherBranches.push({ branch: name, track: track.trim() });
      }
    }
  }

  return {
    available: true,
    mainBranch,
    branch,
    upstream: upstream && upstream !== "HEAD" ? upstream : null,
    ahead,
    behind,
    dirty: statusLines.length > 0,
    dirtyCounts: { modified, untracked },
    recentLocal: parseCommits(recentLocalRes.ok ? recentLocalRes.stdout : ""),
    recentMain: parseCommits(recentMainRes.ok ? recentMainRes.stdout : ""),
    otherBranches
  };
}
