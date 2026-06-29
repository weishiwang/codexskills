---
name: yida-association-form-fill
description: YiDA AssociationFormField JavaScript fill pattern. Use when a YiDA form needs page JS/onChange to set association form fields, copy existing related-form values from a selected association record, auto-fill related project/contract/supplier/warehouse/material fields, debug association field value format, or replace fragile text-code matching with direct selected-record detail reads.
---

# YiDA Association Form Fill

Use this skill when a YiDA form has one selected association record and other association fields should be filled automatically from that selected record or from its detail data.

Typical case:

```text
Select purchase request
  -> fill related contract
  -> fill related project
  -> fill related supplier
  -> keep visible text fields for checking
```

## Core Rule

Set an `AssociationFormField` with an array of association objects:

```js
[
  {
    appType: 'APP_XXX',
    formUuid: 'FORM-TARGET',
    formType: 'receipt',
    instanceId: 'FINST-XXX',
    title: 'display title',
    subTitle: 'serial00001'
  }
]
```

Important:

- Use `instanceId`, not `formInstId`, in the value object.
- Use an array, even for single-select association fields.
- Keep `formUuid`, `appType`, `formType`, `instanceId`, `title`, and `subTitle`.
- Do not set a text field and expect the association field to resolve itself.
- Do not match by text codes if the selected source record already stores the target association field.

## Standard Workflow

1. Fetch schema before editing:

```bash
openyida get-schema APP_XXX FORM-MAIN > .cache/openyida/project/main-before.json
openyida get-schema APP_XXX FORM-SOURCE > .cache/openyida/project/source.json
```

2. Identify these field IDs:

| Meaning | Example |
| --- | --- |
| Source association field on current form | `associationFormField_source` |
| Source form UUID | `FORM-SOURCE` |
| Source form field containing target contract association | `associationFormField_source_contract` |
| Source form field containing target project association | `associationFormField_source_project` |
| Target contract association field on current form | `associationFormField_target_contract` |

3. Bind one page action to the source association field `onChange`.

Use `openyida create-form patch` with:

```json
[
  { "action": "actions-module", "source": "export function ..." },
  {
    "action": "bind-field-action",
    "fieldId": "associationFormField_source",
    "event": "onChange",
    "actionName": "fillRelatedAssociations"
  }
]
```

If the source field is already bound, preserve the existing event or intentionally replace it after reading the schema.

4. Apply patches sequentially, not in parallel.

Avoid sending an `actions-module` patch and a `field-props` patch at the same time. Both read-modify-write the full schema; the later save can overwrite the earlier save.

5. If the form has a `SerialNumberField`, run runtime refresh:

```bash
node C:/Users/Administrator/.codex/skills/yida-form-runtime-refresh/scripts/refresh-form-runtime.js APP_XXX FORM-MAIN
```

6. Verify in a real browser:

- Open the workbench/form page.
- Click add.
- Select the source association record.
- Confirm target association fields show titles, not only text fields.
- Confirm no debug `console` logs remain.

## Page JS Pattern

This pattern reads the selected source record detail, then copies association fields already stored on that source record into target association fields on the current form.

```js
export function didMount(event) {}

var APP_TYPE = 'APP_XXX';
var SOURCE_FIELD = 'associationFormField_source';
var SOURCE_FORM = 'FORM-SOURCE';
var DIRECT_ASSOC_RULES = [
  {
    sourceFieldId: 'associationFormField_source_contract',
    sourceDataKey: 'associationFormField_source_contract_id',
    targetFieldId: 'associationFormField_target_contract'
  },
  {
    sourceFieldId: 'associationFormField_source_project',
    sourceDataKey: 'associationFormField_source_project_id',
    targetFieldId: 'associationFormField_target_project'
  }
];

function getComponent(ctx, fieldId) {
  if (ctx && typeof ctx.$ === 'function') return ctx.$(fieldId);
  if (typeof $ === 'function') return $(fieldId);
  return null;
}

function getValue(ctx, fieldId) {
  var c = getComponent(ctx, fieldId);
  if (!c) return undefined;
  if (typeof c.getValue === 'function') return c.getValue();
  if (typeof c.get === 'function') return c.get('value');
  if (c.props && c.props.value !== undefined) return c.props.value;
  if (c.value !== undefined) return c.value;
  return undefined;
}

function setValue(ctx, fieldId, value) {
  var c = getComponent(ctx, fieldId);
  if (!c) return;
  if (typeof c.setValue === 'function') {
    c.setValue(value);
    return;
  }
  if (typeof c.set === 'function') c.set('value', value);
}

function firstAssociation(value) {
  if (Array.isArray(value)) return value[0] || null;
  if (typeof value === 'string') {
    try {
      var parsed = JSON.parse(value);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) return parsed[0] || null;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {}
  }
  return value && typeof value === 'object' ? value : null;
}

function normalizeAssociationList(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      var parsed = JSON.parse(value);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      value = parsed;
    } catch (e) {
      return null;
    }
  }
  if (!Array.isArray(value)) value = [value];
  var list = value.filter(function(item) {
    return item && item.instanceId;
  }).map(function(item) {
    return {
      appType: item.appType || APP_TYPE,
      formUuid: item.formUuid,
      formType: item.formType || 'receipt',
      instanceId: item.instanceId,
      title: item.title || '',
      subTitle: item.subTitle || ''
    };
  });
  return list.length ? list : null;
}

function parseInstValue(record, fieldId) {
  var instValue = record && record.instValue;
  if (typeof instValue !== 'string' || instValue.indexOf(fieldId) < 0) return null;
  try {
    var arr = JSON.parse(instValue);
    for (var i = 0; i < arr.length; i += 1) {
      if (arr[i] && arr[i].fieldId === fieldId) {
        return arr[i].fieldData && arr[i].fieldData.value;
      }
    }
  } catch (e) {}
  return null;
}

function readSourceAssociation(record, rule) {
  var fd = (record && record.formData) || {};
  var value = normalizeAssociationList(fd[rule.sourceDataKey]);
  if (value) return value;
  value = normalizeAssociationList(fd[rule.sourceFieldId]);
  if (value) return value;
  return normalizeAssociationList(parseInstValue(record, rule.sourceFieldId));
}

function extractRecord(resp) {
  return resp && (resp.content || resp.data || resp.result || resp);
}

function getSourceInstanceId(ctx) {
  var first = firstAssociation(getValue(ctx, SOURCE_FIELD));
  return first && (first.instanceId || first.formInstId || first.instId || first.id) || '';
}

function fetchSourceDetail(ctx) {
  var instanceId = getSourceInstanceId(ctx);
  if (!instanceId) return Promise.resolve(null);

  if (ctx && ctx.utils && ctx.utils.yida && typeof ctx.utils.yida.getFormDataById === 'function') {
    return ctx.utils.yida.getFormDataById({ formInstId: instanceId }).then(extractRecord);
  }

  var params = {
    appType: APP_TYPE,
    formUuid: SOURCE_FORM,
    formInstId: instanceId
  };
  var query = Object.keys(params).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');

  return fetch('/dingtalk/web/' + APP_TYPE + '/v1/form/getFormDataById.json?' + query, {
    credentials: 'include'
  }).then(function(r) {
    return r.json();
  }).then(extractRecord);
}

function runFill(ctx) {
  fetchSourceDetail(ctx).then(function(record) {
    if (!record) return;
    DIRECT_ASSOC_RULES.forEach(function(rule) {
      var value = readSourceAssociation(record, rule);
      if (value) setValue(ctx, rule.targetFieldId, value);
    });
  }).catch(function(e) {});
}

export function fillRelatedAssociations(event) {
  var ctx = this;
  [300, 800, 1500, 3000].forEach(function(delay) {
    setTimeout(function() { runFill(ctx); }, delay);
  });
}
```

## Where To Read Values From

Prefer the selected source record detail over separate lookups:

```text
record.formData.associationFormField_xxx_id
record.formData.associationFormField_xxx
record.instValue[].fieldData.value
```

YiDA often returns association values in `_id` fields as a JSON string, sometimes double-encoded:

```json
"\"[{\\\"formType\\\":\\\"receipt\\\",\\\"formUuid\\\":\\\"FORM-XXX\\\",\\\"instanceId\\\":\\\"FINST-XXX\\\",\\\"subTitle\\\":\\\"serial00001\\\",\\\"appType\\\":\\\"APP_XXX\\\",\\\"title\\\":\\\"1111\\\"}]\""
```

Parse strings defensively and normalize the final value back to the array format before calling `setValue`.

## When To Use Lookup Instead

Only query another form when the selected source record does not store the target association object.

If querying, match on a field that actually exists in the target form data. Do not assume a visible text field such as "contract number" equals the target form's `SerialNumberField`. Verify with live data first:

```bash
openyida data query form APP_XXX FORM-TARGET --size 5 --json
```

## Debugging

For one-off debugging, temporarily bind an `onChange` that logs:

```js
console.log('source value', getValue(this, SOURCE_FIELD));
```

Remove all debug output before finishing:

```text
console.log
console.warn
[assoc-refill]
```

If nothing logs, confirm the field's `onChange` binding in the latest schema and bind directly to the field event.

## Verification Checklist

- Latest schema shows the action function under `actions.module.source`.
- Latest schema shows source field `onChange` bound to the fill action.
- Target association fields have `behavior: "NORMAL"` while testing, unless the user asks to hide them.
- Source detail contains target association values.
- Browser test shows target association fields populated with title/subTitle.
- There are no page errors caused by malformed JS.
- No debug logs remain.
- If multiple patches are needed, apply them sequentially and re-fetch schema after the last patch.

