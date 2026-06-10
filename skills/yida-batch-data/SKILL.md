---
name: yida-batch-data
description: Batch YiDA data processing with a bundled yidaapi.js framework. Use when Codex needs to batch query, fetch beyond page limits, create, update, delete, retry, throttle, or process large YiDA form data sets, sub-table data, or process-form records.
---

# YiDA Batch Data

Use the bundled framework first for batch YiDA data tasks:

`assets/framework/yidaapi.js`

The framework file is shipped with this skill so other users can install the skill without relying on the original author's local disk path.

## Workflow

1. Inspect `assets/framework/yidaapi.js` before changing or using it. Copy it into the target YiDA custom page/form action code when the runtime does not already include these helpers.
2. Prefer `yidaForm(context)` for normal form data and `yidaFlowForm(context)` for process form data.
3. Set `.appType(window.pageConfig.appType)` or the explicit app type, then `.formUuid(...)` when the operation needs a form.
4. Use the built-in batch helpers instead of ad hoc loops:
   - `loadAll()` for paged reads within the page limit.
   - `loadAllBeyondLimit()` for large reads that must split by create time.
   - `loadAllAndPrettify()` or `loadAllBeyondLimitAndPrettify()` when field labels/aliases are useful.
   - `saveallformdata(items)` for batch create.
   - `updataallformdata(items)` for batch update.
   - `deleteallformdata(items)` for batch delete.
5. Keep concurrency conservative. The framework defaults to 5 workers and 500 ms pacing for mutating writes.
6. Preserve retry behavior. Batch helpers retry failed params according to `.retry(n)` and return successful responses.

## Data Shapes

Batch create:

```js
await yidaForm(context)
  .appType(window.pageConfig.appType)
  .formUuid('FORM-...')
  .retry(3)
  .saveallformdata([{ textField_xxx: 'value' }]);
```

Batch update:

```js
await yidaForm(context)
  .appType(window.pageConfig.appType)
  .retry(3)
  .updataallformdata([
    { formInstId: 'FINST-...', updateFormDataJson: { textField_xxx: 'new value' } }
  ]);
```

Batch delete:

```js
await yidaForm(context)
  .appType(window.pageConfig.appType)
  .retry(3)
  .deleteallformdata(['FINST-...']);
```

`deleteallformdata` also accepts objects with `formInstId`, `instId`, or the first object value as the instance id.

## References

Read `references/framework-notes.md` when you need details about the local framework methods, examples, and safe extension rules.
