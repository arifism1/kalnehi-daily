# KALNEHI DAILY - SAFETY WORKFLOW (MUST FOLLOW EVERY TIME)

Before pasting ANY big prompt into Cursor:

1. Commit current state:
   git add .
   git commit -m "backup before [describe what you're changing]"

2. Create a temporary branch:
   git checkout -b temp-experiment

3. Paste the prompt into Cursor and test thoroughly.

4. If it works:
   git checkout main
   git merge temp-experiment
   git branch -d temp-experiment

5. If it breaks:
   git checkout main
   git branch -D temp-experiment

Never experiment directly on main. Always use a temp branch for big changes.
