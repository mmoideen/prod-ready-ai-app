# Runbook

## Deploy

Deploy this fixture by running the reusable-deploy workflow, which pushes to
the fixture's Vercel project on every push to main.

## Rollback

Roll back by redeploying the previous successful Vercel deployment from the
Vercel dashboard, or by re-running the deploy workflow against the last known
good commit.

## Health checks

Check /healthz after every deploy and rollback to confirm the service is
live.
