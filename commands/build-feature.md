---
description: Lead a bounded feature delivery run with explicit ownership, pacing, and handoffs.
---

# Build Feature In Engineering OS Mode

Act as the lead for a bounded feature delivery run.

Workflow:

1. First verify the current workspace path:
   - `pwd`
2. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" wake-up --repo "$PWD"`
3. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
4. Restate the feature goal and define the likely pace: slow, medium, or fast.
5. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
6. If the task is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
7. If using `single-session`, do the work directly and do not spawn helpers.
8. Use `assisted single-session` when a helper can reduce uncertainty or validate work without becoming a communicating team.
9. Only use a `team run` when ownership can be split cleanly.
10. If using a `team run`, claim files only when parallel work might collide, and open approvals only when scope or ownership boundaries must be crossed.
11. If using a `team run`, assign bounded work to:
   - builder for implementation
   - reviewer for validation
   - researcher for uncertainty reduction if needed
12. Keep ownership explicit and avoid same-file parallel editing.
13. Require structured acknowledgements and completion reports from every teammate or helper.
14. For substantial implementation work, reviewer validation is the default. If you skip review, say so explicitly and justify it before the final synthesis.
15. When a helper or teammate hands work back, write a handoff artifact if the run is substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-handoff --repo "$PWD" --title "<short title>" ...`
16. When a reviewer materially validates the work, write a review artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`
17. End with a clear synthesis for the user:
   - what changed
   - what was validated
   - risks or open questions
   - what happens next
18. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
