import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const DEFAULT_TIMEOUT_MS = 5000;

const PR_FIELDS = "number,title,headRefName,baseRefName,isDraft,mergeable,mergeStateStatus,url,author";

async function run(cmd, cwd, timeout = DEFAULT_TIMEOUT_MS) {
  try {
    const { stdout } = await execAsync(cmd, { cwd, timeout, maxBuffer: 2 * 1024 * 1024 });
    return { ok: true, stdout: stdout.toString() };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function summarizePr(pr) {
  return {
    number: pr.number,
    title: pr.title,
    headRefName: pr.headRefName,
    baseRefName: pr.baseRefName,
    isDraft: pr.isDraft,
    mergeable: pr.mergeable,
    mergeStateStatus: pr.mergeStateStatus,
    url: pr.url,
    author: pr.author?.login || null
  };
}

export async function collectGithubSignal(repoPath, { branch } = {}) {
  const which = await run("command -v gh", repoPath, 1000);
  if (!which.ok || !which.stdout.trim()) {
    return { available: false, reason: "gh-not-installed" };
  }

  const authCheck = await run("gh auth status", repoPath, 2000);
  if (!authCheck.ok) {
    return { available: false, reason: "gh-not-authenticated" };
  }

  const myPrsRes = await run(
    `gh pr list --author @me --state open --json ${PR_FIELDS} --limit 20`,
    repoPath
  );
  const reviewReqRes = await run(
    `gh pr list --search "is:open is:pr review-requested:@me" --json ${PR_FIELDS} --limit 20`,
    repoPath
  );
  const branchPrsRes = branch
    ? await run(`gh pr list --head ${branch} --state open --json ${PR_FIELDS} --limit 10`, repoPath)
    : { ok: true, stdout: "[]" };

  if (!myPrsRes.ok && !reviewReqRes.ok && !branchPrsRes.ok) {
    return { available: false, reason: "gh-api-failed" };
  }

  const myOpenPRs = (parseJsonSafe(myPrsRes.stdout) || []).map(summarizePr);
  const reviewRequests = (parseJsonSafe(reviewReqRes.stdout) || []).map(summarizePr);
  const prsOnCurrentBranch = (parseJsonSafe(branchPrsRes.stdout) || []).map(summarizePr);

  return {
    available: true,
    myOpenPRs,
    reviewRequests,
    prsOnCurrentBranch
  };
}
