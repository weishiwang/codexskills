# Local YiDA Batch Framework Notes

Framework root:

`E:\浏览器下载\1776499843243_宜搭AI助手V1.5.9\宜搭AI助手V1.5.9\代码`

Important files:

- `yidaapi.js`: API wrapper, batch runner, form helpers, process form helpers, prettify helpers.
- `分批次获取子表数据.js`: example of chunked sub-table reads using `Promise.all` with a fixed batch size.

Core helpers:

- `yidaApi(appType)`: low-level endpoint wrapper.
- `parallel()` and `parallelbyonArr()`: worker pools with `.workerCount(n)`, `.limitMilliSec(ms)`, `.dataCheck(fn)`, `.onDone(fn)`, `.onError(fn)`, and `.exec()`.
- `yidaForm(context)`: higher-level normal form helper.
- `yidaFlowForm(context)`: higher-level process form helper.
- `yidaFormData()`: maps raw YiDA field ids to labels/aliases for readable output.

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
7. Never hard-code app type, form UUID, field ids, or tokens inside reusable helpers.
