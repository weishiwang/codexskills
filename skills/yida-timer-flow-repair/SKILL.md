---
name: yida-timer-flow-repair
description: Diagnose and repair YiDA timed automations whose metadata is broken after save or publish, especially when the automation list shows "未设置", the bound formUuid disappears, status stays unpublished, or switchflow reports missing binding. Use when working with eventType=3 timer flows, learning the real designer publish path, or deciding whether an API save is trustworthy versus reopening the designer and publishing there.
---

# YiDA Timer Flow Repair

Use this skill when a YiDA timer automation exists but its list metadata is inconsistent with the actual designer content.

Typical symptoms:

```text
eventType = 3
eventName = <未设置>
formUuid is blank or unexpected
status = n after a supposed publish
switchflow says no binding relation
```

## Core judgment

Treat timer-flow repair as a metadata and publish-path problem first, not a business-logic problem first.

If the list metadata is broken but `simpleProcess/getProcessById.json` still returns a valid canvas schema with a `StartNode` timer config, the flow definition may still exist and the failure is often in how it was saved or published.

## Must do

- Confirm login first with `openyida login --check-only --json`.
- Confirm the target flow is a timer flow by checking `eventType=3`.
- Fetch both list metadata and process detail before changing anything.
- Query process versions and keep the latest `processId`, because some timer flows reject detail requests that only pass `processCode`.
- Save raw evidence under the current project's `.cache/openyida/` folder.
- Prefer a real designer publish when API-generated `processJson` parity is uncertain.
- Re-check the flow after repair and confirm `eventName`, `formUuid`, `status`, and published version state.

## Must not do

- Do not assume a hand-built `processJson` is equivalent to the designer's internal transform.
- Do not reuse old timer-flow payloads across apps without checking for stale foreign `formUuid` values.
- Do not trust `saveProcess(isOnline=true)` alone just because the endpoint returned success.
- Do not diagnose timer flows with process endpoints that already proved to be 404 in this environment, such as `simpleProcess/getProcessInfo.json`.

## Proven endpoints

List metadata:

```text
GET /alibaba/web/{appType}/query/appLogicflowBinding/listflow.json
GET /alibaba/web/{appType}/query/formLogicflowBinding/listflow.json
```

Designer detail:

```text
GET or POST /alibaba/web/{appType}/query/simpleProcess/getProcessById.json
GET or POST /alibaba/web/{appType}/query/simpleProcess/getProcess.json
```

Process versions:

```text
GET /alibaba/web/{appType}/query/process/pageProcessVersion.json
```

Save / publish path used by current OpenYida automation code:

```text
POST /alibaba/web/{appType}/query/simpleProcess/saveProcess.json
POST /alibaba/web/{appType}/query/formLogicflowBinding/switchflow.json
```

## Standard workflow

1. Diagnose the flow with the bundled script:

```powershell
node .\skills\yida-timer-flow-repair\scripts\diagnose-timer-flow.js `
  --app APP_XXX `
  --process LPROC_XXX `
  --name "自动化名称" `
  --form FORM-XXX `
  --output ".cache\openyida\timer-flow"
```

2. Read the result JSON and classify:

- `metadataBroken = true`, `hasTimerStart = true`:
  The timer flow definition exists, but list metadata or publish state is broken.
- `metadataBroken = false`, `hasTimerStart = true`:
  The timer flow is structurally healthy; investigate business conditions or runtime logs instead.
- `hasTimerStart = false`:
  The target process is not a timer flow, or the process detail request is wrong.

3. If the detail schema is valid but metadata is broken, prefer the designer-backed repair path:

```text
Open the flow in designer
Publish from the real designer UI
Re-check metadata with the script
```

4. Only attempt a pure API repair when all of the following are true:

- you can derive a clean `viewJson`
- you can derive a designer-equivalent `processJson`
- you have verified there are no stale form IDs or copied nodes from another app

5. Re-run diagnosis and confirm the repaired state:

```text
eventName becomes the real timer label, such as 每天
formUuid matches the bound form
status becomes y when published
detail endpoint still shows the expected StartNode timer config
```

## Known pitfall: timer flow processJson parity

## Known pitfall: detail lookup may require processId

Observed in the target environment:

- `pageProcessVersion.json` returned valid version rows and `id`
- detail requests with only `processCode` could fail with `processId为空或格式不正确`
- the same flow detail loaded once `processId` from the version list was supplied

Therefore the bundled script first queries versions, then prefers the latest published version `id` for detail lookup, and only falls back to `processCode`-only requests as a last resort.

For timer flows, the designer does not simply save the visible canvas schema as `json`.

Observed designer behavior:

- `viewJson` stores `{ schema, globalSetting }`
- `json` is produced by an internal transform from canvas schema to process nodes
- saving through the real designer repaired metadata immediately
- saving with a synthetic payload through `saveProcess` did not reliably repair metadata

Use [references/designer-publish-notes.md](references/designer-publish-notes.md) when you need the evidence and implications behind this rule.

## Validation checklist

- listflow result shows the right flow by `processCode`
- `eventType` is `3`
- `eventName` is not `<未设置>`
- `formUuid` is present and matches the target form
- `status` matches the expected online state
- detail content parses as JSON
- detail schema contains a `StartNode`
- `StartNode.props.start.triggerType` is `TimerEvent`

## Bundled resources

- `scripts/diagnose-timer-flow.js`:
  fetches timer-flow list metadata and detail schema, then writes a diagnosis report
- `references/designer-publish-notes.md`:
  explains why real designer publish was the reliable repair path in this case
