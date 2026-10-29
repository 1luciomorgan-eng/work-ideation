# Owner Research Desk

A local research agent and private hosted dashboard for commercial real-estate ownership research. Enter an entity and property address; the workflow searches county records, corporate filings, OpenCorporates, and official business websites. It saves findings, evidence, unresolved questions, and published business contacts in SQLite.

The workflow does not perform private personal cell-phone discovery or people-search enrichment. Tenant, registered-agent, manager, and owner-company contacts are distinct. A result stays **Needs review**; a general search hit never becomes verified ownership automatically.

## Run on this Windows machine

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run.ps1 start
```

Open `http://127.0.0.1:4317`. The app automatically processes new properties in batches with a $5 Exa ceiling per batch and polls in-flight runs every 20 seconds while open. The **Verify county** control starts an optional Browser Use v4 verification with a $2 session cap. Caps are ceilings, not expected charges. Browser/network usage can settle separately according to the provider's billing rules. No schedule runs when the app is closed.

## Install elsewhere

Requires Node 22.13+ with `node:sqlite`, and npm or pnpm.

```sh
npm install
cp .env.example .env
node --env-file=.env src/server.mjs
```

Use process environment variables or a secret manager. On the configured Windows machine, supplied keys are encrypted with Windows user protection in `.local/secrets.clixml`; `run.ps1` decrypts them into the child process environment. They are not stored in source, hosted assets, or Git. `scripts/save-secrets.ps1` accepts a JSON object through standard input and replaces that encrypted file. The encrypted store only works for the same Windows user on the same machine; it may be backed up by OneDrive, but the source repo ignores it.

## CLI

On this machine prefix commands with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run.ps1`. Elsewhere use `node --env-file=.env src/cli.mjs`.

```text
research [row IDs]       Submit a batch, persist its run ID, return immediately
poll [run ID]           Poll and save completed Exa results
browser <row ID>        Submit a live county verification (up to $2)
browser-poll <run ID>   Poll and save a completed browser result
poll-browsers           Poll outstanding browser verifications
treg <row ID>           Supplemental web leads, capped at $0.01 per call
list                    Inspect current property records
runs                    Inspect research statuses and costs
import queue.json       Import new rows without overwriting existing row IDs
export                  Write dist/results.json
publish                 Build and publish an owner-only here.now dashboard
```

`publish` is a `run.ps1` command or `node src/publish.mjs`, not a `cli.mjs` action. It creates the Site once using a data-free holding page, persists hosting identity, restricts access to the owner **before** uploading prospect data, uploads only four explicit dashboard files, and confirms finalization. Later publications enforce the saved base version. Interrupted uploads retain pending state. API keys never reach the browser. If access restriction fails, publication stops. No invitations or outreach are sent.

## Data and evidence

- `data/input.json`: optional initial rows; ignored by Git. New rows may also be added in the local app.
- `data/owners.sqlite`: properties, findings, runs, and an append-only research audit trail.
- `dist/results.json`: sanitized dashboard snapshot, without research prompts or keys.
- `.local/hosting.json`: hosting identity/version, ignored by Git.
- Browser notes are saved to local storage in that browser and included in CSV exports. They do not sync across devices.

The here.now dashboard is a private **results snapshot**. Search, filters, source details and exports work there. New-property submission, live research, and durable data storage run in the desktop app. The hosted Add property form downloads a queue JSON file for import. Publish again to refresh hosted research. A hosted page never silently starts paid research.

Input rows retain original IDs, priority, supplied owner, task note and supplied status. Research fields stay separate. Deeds and assessor snapshots have different dates; neither a tenant phone nor a registered agent proves the beneficial owner. Paywalls and unavailable county pages remain explicit next actions.

## Validation

```sh
npm test
node --check web/app.js
node --check src/server.mjs
node test/http-check.mjs # while the local app is running
```

Tests cover the meaningful evidence and contact boundaries. The local server listens only on loopback, checks Host and Origin for writes, accepts JSON only, and serves an explicit static-file allowlist. CSV export neutralizes spreadsheet formulas and preserves evidence URLs.

## Integration references

- [Exa canonical skill](https://github.com/exa-labs/agent-skills/tree/main/skills/build-with-exa): async Agent API with bounded output, persisted run IDs, terminal-state handling and grounding saved in run history.
- [Browser Use v4](https://docs.browser-use.com/cloud/agent/quickstart): official SDK, structured output, public portal navigation and session caps. Agent browsers expire after the 120-second keep-alive; no standalone browser sessions are created.
- [treg](https://treg.to/llms.txt): supplemental routed public-web search, with no private phone lookup.
- [here.now](https://here.now/docs): authenticated permanent hosting with owner-only access and version conflict protection.

Research providers generate candidate findings. Review cited documents before outreach or treating a record as current. The source repository contains no supplied prospect rows, generated research, API keys, or database.
