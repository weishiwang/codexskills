# Bundled YiDA Batch Framework Notes

Bundled framework:

`assets/framework/yidaapi.js`

Original source path used when creating this skill:

`E:\browser-downloads\1776499843243_YiDA-AI-Assistant-V1.5.9\YiDA-AI-Assistant-V1.5.9\code\yidaapi.js`

Core helpers:

- `yidaApi(appType)`: low-level endpoint wrapper.
- `parallel()` and `parallelbyonArr()`: worker pools with `.workerCount(n)`, `.limitMilliSec(ms)`, `.dataCheck(fn)`, `.onDone(fn)`, `.onError(fn)`, and `.exec()`.
- `yidaForm(context)`: higher-level normal form helper.
- `yidaFlowForm(context)`: higher-level process form helper.
- `yidaFormData()`: maps raw YiDA field ids to labels/aliases for readable output.

Read helpers:

- `loadAll()`: paged reads.
- `loadAllBeyondLimit()`: recursively split by create time when page limits block a single query.
- `loadAllAndPrettify()` and `loadAllBeyondLimitAndPrettify()`: return field-label-friendly data.

Mutation helpers on `yidaForm(context)`:

- `saveallformdata(items)`: creates form records with `saveFormData`.
- `updataallformdata(items)`: updates records with `updateFormData`, expecting `formInstId` plus `updateFormDataJson`.
- `deleteallformdata(items)`: deletes records with `deleteFormData`, accepting instance id strings or objects containing `formInstId`/`instId`.

When adding new batch methods:

1. Place them inside `yidaForm(context)` next to the other batch helpers.
2. Use `parallelbyonArr()` for item lists.
3. Keep `workerCount(5)` and `limitMilliSec(500)` unless the user explicitly asks for a different throughput.
4. Use `.dataCheck(data => data.success)` for YiDA mutation responses.
5. Collect failed params and retry them up to `1 + params.retry` attempts.
6. Call `params.onDone && params.onDone(options)` for successful items.
7. Never hard-code app type, form UUID, field ids, access tokens, app secrets, or connector credentials inside reusable helpers.
