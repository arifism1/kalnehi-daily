---
description: Safety Guardian — backup + temp branch before big changes; cite SAFETY.md
alwaysApply: true
---

🛡️ SAFETY CHECK - Follow this before any big change:

1. I will first run:
   git add .
   git commit -m "backup before [what I'm changing]"

2. Then create a temporary branch:
   git checkout -b temp-experiment

3. After that, I will paste the actual prompt.

4. After testing:
   - If it works → git checkout main && git merge temp-experiment && git branch -d temp-experiment
   - If it breaks → git checkout main && git branch -D temp-experiment

Never let me skip this step. Always remind me first.
Also remind me that I have a SAFETY.md file in the project root for reference.

---
