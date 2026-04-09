---
description: Preferred short entry point for running the review phase on completed work.
---

# Review In Engineering OS Mode

This is the preferred short entry point for the review phase.

Use it when implementation work is complete and needs independent review.

Expected shape:

1. verify the repo and read bounded wake-up context
2. identify the completed work or artifact set under review
3. run the relevant review gates for the task and repo
4. record the review result and update workflow state
5. return findings, risks, and the next recommended step

Review should be treated as a phase, not a courtesy:

- if code changed, review is expected unless explicitly skipped with a reason
- the reviewer should be independent from the implementing agent
- the review may include correctness, regressions, scope discipline, test gaps, repo standards, language-specific checks, or security review

When review materially completes, write the review artifact:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`

If review is intentionally skipped, record that explicitly in workflow state:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge review_skipped --note "<reason>"`
