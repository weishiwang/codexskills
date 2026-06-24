# Designer publish notes

This reference captures the key findings from a real YiDA timer-flow repair.

## Symptoms that were reproduced

- list metadata showed `eventName = <未设置>`
- status stayed unpublished
- the timer flow still had a real designer canvas schema
- a direct `saveProcess` attempt did not reliably repair the list metadata

## What worked

Publishing the same timer flow from the real YiDA designer repaired the metadata immediately.

Observed post-publish signals:

- `eventName` changed to the real timer rule text such as `每天`
- `formUuid` was restored
- `status` became `y`
- the flow version list showed a new published version

## Why this matters

The designer save path uses:

```text
/query/simpleProcess/saveProcess.json
```

but the `json` payload is not just a copy of the visible `viewJson.schema`.

Observed behavior from the downloaded designer bundle:

- `viewJson` is saved as `{ schema, globalSetting }`
- process JSON is produced by an internal transform function from the canvas schema
- the transform emits a process object shaped like `{ props, nodes }`

That means a hand-built or previously copied `processJson` may be structurally accepted by the endpoint while still failing to restore timer-flow metadata correctly.

## Practical rule

If a timer flow already exists and its detail schema is valid, but list metadata is broken after API save/publish, treat the designer publish as the source of truth and use it to repair the flow before attempting further automation.

## Detail lookup rule

Do not assume `processCode` is enough for timer-flow detail lookup.

In the observed environment:

- version listing returned valid rows from `pageProcessVersion.json`
- the chosen published row exposed a concrete `id`
- detail lookup failed until that `processId` was supplied

When building tooling around timer-flow diagnosis, resolve versions first and prefer the latest published `processId`.

## Payload hygiene rule

Before reusing any saved timer-flow payload:

- search it for foreign `FORM-...` IDs
- search it for foreign `APP_...` IDs
- verify the timer `StartNode` still points to the current app and current form

Copied payloads from another app can silently preserve wrong bindings even when the visible flow shape looks correct.
