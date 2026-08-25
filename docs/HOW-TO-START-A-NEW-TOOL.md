# How to start a new internal tool

This guide takes you from nothing to a Pilot ready internal AI tool in under an
hour, with the production path already paved. It assumes you have Node 20 or
later and a GitHub repository under the organization.

## 1. Copy the template

Copy the `template/` directory from this repository into your new repository
(or use the repository template mechanism if your org has published one):

```bash
# from a checkout of this toolkit
cp -R template/ ../my-new-tool
cd ../my-new-tool
git init -b main
```

Then make it yours:

1. Search for `{{` and replace every placeholder: tool name, owner, team
   channel. The owner is not optional. A tool nobody owns is already
   deprecated.
2. In `.github/workflows/*.yml`, the `uses:` lines reference this toolkit.
   They are already pointed at the right repository; leave the `@main` ref or
   pin a tag.
3. `infra/` consumes the shared modules by relative path while inside this
   repository. In your copied repository, switch the module sources to the git
   URL forms shown in `infra/README.md`.

## 2. Run it locally

```bash
npm install
cp .env.example .env
# set AUTH_LOCAL_DEV=true and AUTH_SECRET to any string for local work
npm run dev
```

The template ships with a local development sign in path so you do not need an
Entra ID tenant to start. The README in the template documents how to switch to
real Entra ID before anyone else uses the tool.

## 3. See where you stand

```bash
cd path/to/this-toolkit/scorecard && npm install && cd -
node path/to/this-toolkit/scorecard/dist/cli.js --path . --advisory
```

Straight out of the template you should score at or above 85 (the production
ready threshold). Every feature you add can only lower the score, so keep the
readiness workflow on: it runs the same scan in CI on every pull request and
fails below 85.

## 4. Follow the lifecycle

The stages and gates are defined in [LIFECYCLE.md](LIFECYCLE.md):

1. **Experimental**: you are here. Name an owner in `SUPPORT.md`, write the
   README honestly, never touch production data.
2. **Pilot**: get your engineering lead to approve a named pilot group. Auth,
   tests, error handling, and a rollback path must exist. Score 70 or above.
3. **Production ready**: complete the checklist
   (`PRODUCTION_READINESS.md`), the runbook, the UAT sign off, the support
   handoff, and the threat model. Score 85 or above, enforced in CI.
4. **Business critical**: score 92 or above plus the four attested manual
   gates (on call, postmortems, tested recovery, access review).

The document templates for every gate are in
[`templates/`](../templates/): copy them into your repository as each stage
requires them. The template skeleton already includes filled starter versions.

## 5. For AI features specifically

- Keep the eval dataset in `evals/` growing: every incident and every
  regression becomes a dataset item. The eval gate workflow fails CI when the
  eval command fails.
- Complete the AI sections of the threat model (prompt injection, data
  exfiltration, retrieval poisoning) before the Pilot gate, not after.
- Log AI interactions with enough context to answer "who asked what, and what
  did the tool access on their behalf" without logging sensitive payloads.

## Getting help

- Rubric details and rule remediation hints: [RUBRIC.md](RUBRIC.md)
- Reusable workflow and action reference: [`workflows/README.md`](../workflows/README.md)
- Infrastructure module reference: [`infra-modules/README.md`](../infra-modules/README.md)
