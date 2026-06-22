---
name: yida-form-runtime-refresh
description: YiDA form schema runtime refresh and serial number protection. Use when modifying YiDA form schemas, especially forms with SerialNumberField, formulaType, or auto-generated serial numbers; when API-created records show wrong serial numbers after create-form update/patch; or when needing to replace manual designer Save with a safe updateFormSchemaInfo refresh.
---

# YiDA Form Runtime Refresh

Use this skill after changing a YiDA form schema through `openyida create-form update`, `patch`, `rule`, or a custom schema script, especially when the form contains a `SerialNumberField`.

## Core Rule

Do not use hard-coded form config payloads for forms with serial numbers. Always read the current `getFormSchemaInfo` first, then call `updateFormSchemaInfo` with values derived from that live config.

This avoids breaking:

- `formulaType: "y"`
- `supportSerialNumberField: "y"`
- `displayTitle`
- navigation visibility
- form title/i18n title
- serial-number runtime compilation

## Standard Workflow

1. Before editing, fetch schema:

```bash
openyida get-schema <appType> <formUuid> > .cache/openyida/<project>/schema-before.json
```

2. Apply schema changes with existing YiDA tools.

3. Immediately refresh runtime:

```bash
node C:/Users/Administrator/.codex/skills/yida-form-runtime-refresh/scripts/refresh-form-runtime.js <appType> <formUuid>
```

4. Verify the output still shows the expected values, especially:

```json
{
  "formulaType": "y",
  "supportSerialNumberField": "y",
  "formStatus": "ONLINE"
}
```

5. If the issue was serial-number generation, verify by querying existing/latest records or asking before creating a test record. Do not create business test records without user approval.

## Known Pitfall

`openyida create-form update/patch` currently performs `saveFormSchema + updateFormConfig`. In some cases this is not equivalent to pressing Save in the YiDA form designer. A `SerialNumberField` may appear correct in schema but API-created records may generate plain numbers such as `0003` instead of the configured prefix/date format.

The missing step is a runtime/config refresh through `updateFormSchemaInfo` while preserving the live form settings.

## Never Do

- Do not assign values to `SerialNumberField` when creating data. Let YiDA generate it.
- Do not remove existing `prefix`, `digit`, or `startValue` props just because custom `serialNumberRule` exists.
- Do not overwrite `formulaType: "y"` with `"n"` on a form that uses formulas or serial-number formulas.
- Do not use `update-form-config` blindly on an existing production form; it contains broad defaults that may not match the form.
- Do not repair bad historical serial numbers with ordinary `updateFormData`; YiDA may return success while leaving `serialNo` unchanged.

## Script

The bundled script:

- loads OpenYida cookies
- reads `/query/formdesign/getFormSchemaInfo.json`
- builds a safe `/query/formdesign/updateFormSchemaInfo.json` payload from the live config
- preserves `formulaType`, title, navigation, and other important settings
- prints before/after values for quick verification

Run:

```bash
node C:/Users/Administrator/.codex/skills/yida-form-runtime-refresh/scripts/refresh-form-runtime.js APP_XXX FORM-XXX
```
