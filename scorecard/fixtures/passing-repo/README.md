# Passing Repo Fixture

This fixture repository represents a production ready internal AI tool. It
exists only to exercise every passing signal in the production readiness
rubric, so the scorecard CLI has a known good baseline to test against.
Every file here is a short signal, not a real application.

## Usage

Run the scorecard against this directory to see a near perfect score. From
the scorecard package root: npx . --path fixtures/passing-repo

## Architecture

A tiny Node.js service with an auth module, an RBAC policy module, an
OpenTelemetry bootstrap file, and a health route, backed by an OpenAI
dependency and an evals/ directory with a golden dataset and a runner.

## Owner

Owner: Fixture Maintainers (fixtures@example.com)
