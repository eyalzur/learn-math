---
name: kb-ask
description: Answers a question about this project from the knowledge base (kb/) cheaply — decisions, traps, student notes, how a feature works, what's agreed. Use when the user types /kb-ask <question>, or when you need project context (a past decision, a known trap, a rule) before acting and don't already have it in context.
---

# /kb-ask

1. Spawn the **`kb-query`** agent with the question (verbatim, in Hebrew) as the prompt. Do not read `kb/` yourself first — the agent is the cheap path, capped at 3 files.
2. Relay its answer to the user in Hebrew, short, with the `מקורות:` line.
3. If it says "לא מצאתי ב-KB": look in the code/docs yourself if the task needs it, and if you find the answer offer `/kb-add` for it — don't add it silently unless the user said to.
