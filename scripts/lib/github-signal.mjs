import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 5000;

const PR_FIELDS = "number,title,headRefName,baseRefName,isDraft,mergeable,mergeStateStatus,url,author";
const MAX_PRS_WITH_COMMENT_DETAIL = 10;
const COMMENT_BODY_TRUNCATE = 200;

const GRAPHQL_PR_ACTIVITY = `query($owner:String!,$repo:String!,$number:Int!){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      reviewDecision
      reviewThreads(first:50){nodes{isResolved comments(first:1){nodes{author{login} body url createdAt}}}}
      comments(last:5){nodes{author{login} body url createdAt}}
    }
  }
}`;

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

function truncate(text, limit = COMMENT_BODY_TRUNCATE) {
  if (!text) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > limit ? trimmed.slice(0, limit) + "…" : trimmed;
}

function summarizeComment(node) {
  return {
    author: node?.author?.login || null,
    body: truncate(node?.body || ""),
    url: node?.url || null,
    createdAt: node?.createdAt || null
  };
}

async function fetchRepoSlug(repoPath) {
  const res = await run("gh repo view --json nameWithOwner", repoPath, 3000);
  if (!res.ok) return null;
  const parsed = parseJsonSafe(res.stdout);
  const slug = parsed?.nameWithOwner;
  if (!slug || !slug.includes("/")) return null;
  const [owner, repo] = slug.split("/");
  return { owner, repo };
}

async function fetchPrActivity(repoPath, { owner, repo, number }) {
  let stdout;
  try {
    const res = await execFileAsync(
      "gh",
      [
        "api",
        "graphql",
        "-F",
        `owner=${owner}`,
        "-F",
        `repo=${repo}`,
        "-F",
        `number=${number}`,
        "-f",
        `query=${GRAPHQL_PR_ACTIVITY}`
      ],
      { cwd: repoPath, timeout: 5000, maxBuffer: 2 * 1024 * 1024 }
    );
    stdout = res.stdout.toString();
  } catch {
    return null;
  }
  const parsed = parseJsonSafe(stdout);
  const pr = parsed?.data?.repository?.pullRequest;
  if (!pr) return null;
  const threads = pr.reviewThreads?.nodes || [];
  const unresolvedThreads = threads.filter((t) => !t.isResolved);
  return {
    reviewDecision: pr.reviewDecision || null,
    unresolvedThreadCount: unresolvedThreads.length,
    unresolvedThreadPreviews: unresolvedThreads
      .slice(0, 3)
      .map((t) => summarizeComment(t.comments?.nodes?.[0]))
      .filter((c) => c.body),
    recentComments: (pr.comments?.nodes || []).map(summarizeComment)
  };
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

  const slug = await fetchRepoSlug(repoPath);
  if (slug) {
    const seen = new Set();
    const targets = [];
    for (const pr of [...myOpenPRs, ...reviewRequests, ...prsOnCurrentBranch]) {
      if (seen.has(pr.number)) continue;
      seen.add(pr.number);
      targets.push(pr);
      if (targets.length >= MAX_PRS_WITH_COMMENT_DETAIL) break;
    }

    const activities = await Promise.all(
      targets.map((pr) => fetchPrActivity(repoPath, { ...slug, number: pr.number }))
    );

    const activityByNumber = new Map();
    targets.forEach((pr, i) => {
      if (activities[i]) activityByNumber.set(pr.number, activities[i]);
    });

    const enrich = (list) =>
      list.map((pr) => ({ ...pr, ...(activityByNumber.get(pr.number) || {}) }));

    return {
      available: true,
      myOpenPRs: enrich(myOpenPRs),
      reviewRequests: enrich(reviewRequests),
      prsOnCurrentBranch: enrich(prsOnCurrentBranch)
    };
  }

  return {
    available: true,
    myOpenPRs,
    reviewRequests,
    prsOnCurrentBranch
  };
}
