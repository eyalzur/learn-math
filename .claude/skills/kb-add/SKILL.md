---
name: kb-add
description: Adds or updates knowledge in the project knowledge base (kb/) with no duplicates. Use when the user types /kb-add <text or path>, says "תזכור ש…" / "תוסיף ל-KB", or when a decision, trap, or student note has just been settled and should be remembered.
---

# /kb-add

1. Spawn the **`kb-ingest`** agent. The prompt is the user's text, or the file path(s) to ingest, plus any context needed to understand it (the agent starts cold).
2. Several unrelated items → one agent call per item (sequentially — they write the same indexes).
3. When it returns, relay its 2–3 line Hebrew report. Run `npm run kb -- lint` yourself if the agent didn't report "kb ok".
4. Remind the user the change is uncommitted only if they didn't ask for a commit. A KB change goes in the same branch/PR as the work that caused it.
