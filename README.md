# Codex YiDA Skills

This repository contains reusable Codex skills for YiDA/OpenYida development work. Each skill lives under `skills/<skill-name>` and can be copied into a local Codex skills directory.

## Installation

Install all skills:

```powershell
Copy-Item -Recurse -Force .\skills\* "$env:USERPROFILE\.codex\skills\"
```

Install one skill:

```powershell
Copy-Item -Recurse -Force .\skills\yida-form-runtime-refresh "$env:USERPROFILE\.codex\skills\yida-form-runtime-refresh"
```

Restart Codex or reload skills after installation.

## Skills

### `yida-batch-data`

Batch YiDA data processing with a bundled `yidaapi.js` framework.

Use this skill when working with large YiDA datasets or repetitive form-data operations:

- batch query form data
- read beyond normal page limits
- batch create records
- batch update records
- batch delete records
- process sub-table data
- process normal forms and process forms
- reuse retry/throttle/concurrency helpers instead of writing ad hoc loops

Main bundled resource:

```text
skills/yida-batch-data/assets/framework/yidaapi.js
```

Typical helpers include:

- `yidaForm(context).loadAll()`
- `yidaForm(context).loadAllBeyondLimit()`
- `yidaForm(context).saveallformdata(items)`
- `yidaForm(context).updataallformdata(items)`
- `yidaForm(context).deleteallformdata(items)`
- `yidaFlowForm(context)` for process forms

### `yida-form-runtime-refresh`

Safe YiDA form runtime refresh after schema edits, with serial-number protection.

Use this skill after modifying a YiDA form schema with `openyida create-form update`, `patch`, `rule`, or a custom schema script, especially when the form contains a `SerialNumberField`.

It prevents a common failure mode where a serial-number field looks correct in schema, but API-created records generate plain values such as `0003` instead of the configured prefix/date rule.

The core rule is:

1. Read the current live `getFormSchemaInfo`.
2. Build an `updateFormSchemaInfo` payload from the live config.
3. Preserve important settings such as `formulaType`, `supportSerialNumberField`, title, display title, and navigation state.
4. Do not use broad hard-coded form config defaults.

Main bundled script:

```powershell
node C:\Users\Administrator\.codex\skills\yida-form-runtime-refresh\scripts\refresh-form-runtime.js APP_XXX FORM-XXX
```

Use it immediately after schema changes:

```bash
openyida get-schema APP_XXX FORM-XXX > .cache/openyida/project/schema-before.json
openyida create-form update APP_XXX FORM-XXX .cache/openyida/project/changes.json --force
node C:/Users/Administrator/.codex/skills/yida-form-runtime-refresh/scripts/refresh-form-runtime.js APP_XXX FORM-XXX
```

Never manually assign a value to `SerialNumberField` when creating records. Let YiDA generate it.

### `yida-integration-subtable`

YiDA integration automation pattern for syncing detail records into a sub-table on a matched main-form record.

Use this skill when the requirement is:

```text
Second/detail form record is inserted or updated
  -> find one matching main-form record
  -> find one matching row inside a TableField on that main record
  -> update the row if found, otherwise append a new sub-table row
```

This is different from normal cross-form create automation. The key is using an update-data node against the main form and setting the target sub-table field.

Typical OpenYida command shape:

```bash
openyida integration create APP_XXX FORM-DETAIL "Sync detail to main subtable" \
  --events insert \
  --trigger-recursively \
  --update-data-form-uuid FORM-MAIN \
  --update-data-condition "textField_mainNo:MainNo:textField_detailMainNo:TextField:Equal" \
  --update-data-sub-table-field-id tableField_detailRows \
  --update-data-sub-condition "textField_subDetailNo:DetailNo:textField_detailNo:TextField:Equal" \
  --update-data-assignment "textField_subDetailNo:processVar:textField_detailNo" \
  --update-data-assignment "numberField_subAmount:processVar:numberField_detailAmount" \
  --update-data-none-operation add \
  --publish
```

Important guardrails:

- confirm real `formUuid`, `fieldId`, and `tableFieldId` with `openyida get-schema`
- use `UpdateDataNode` / `dataUpdate`, not a normal add-data node
- include `--update-data-sub-condition` for idempotent row updates
- use `--update-data-none-operation add` when missing rows should be appended
- show the automation summary before publishing in production

### `yida-select-linkage`

YiDA dropdown linkage pattern for using a normal mapping form as the source of first-level and second-level `SelectField` options.

Use this skill when the requirement is:

```text
First select field chooses a category
  -> second select field only shows mapped options under that category
  -> source data lives in a normal YiDA mapping form
```

It captures the YiDA designer pattern:

```text
First dropdown: option type = relate other form data
Second dropdown: option type = data linkage
```

Core formula shape:

```text
FETCHDISTINCTDATA("FORM-MAP","childFieldId",true,QUERYAND(QUERYEQ("parentMapFieldId",#{mainParentFieldId})))
```

Bundled helper:

```powershell
node .\skills\yida-select-linkage\scripts\build-select-linkage-patch.js .\linkage-config.json .\linkage-patch.json
openyida create-form patch APP_XXX FORM-MAIN .\linkage-patch.json --force
```

Important guardrails:

- confirm all field IDs with `openyida get-schema`
- keep mapping condition fields as `TextField` when possible
- keep business value fields as `SelectField`, not `AssociationFormField`
- run `yida-form-runtime-refresh` after patching forms that contain serial numbers

### `yida-manage-view-config`

Configure YiDA data management page saved views without reopening the browser designer each time.

Use this skill when fixing management-page table display columns, column order, default sort, frozen columns, row height, or saved view defaults for "显示列" and "排序".

Main bundled script:

```powershell
node .\skills\yida-manage-view-config\scripts\save-manage-view-config.js `
  --app APP_XXX `
  --form FORM-XXX `
  --view VIEW-XXX `
  --columns "产品编号,中文产品名称,产品系列" `
  --sort "产品编号:asc"
```

Important guardrails:

- read the real `viewUuid` from the management page URL
- resolve labels through `getDataViewPanel` instead of guessing field IDs
- keep backups under `.cache/openyida/manage-view`
- re-fetch the view config after saving to verify `content.viewConfig`

### `yida-create-manage-view`

Create YiDA data management page saved table views and quick filter tabs without reopening the "新建视图" drawer.

Use this skill when creating filtered management views such as `在售`, `停产`, or `库存预警`, or when setting a new view's data filter, field visibility, display columns, and default sort.

Main bundled script:

```powershell
node .\skills\yida-create-manage-view\scripts\create-manage-view.js `
  --app APP_XXX `
  --form FORM-XXX `
  --name "在售" `
  --filter "产品状态:eq:在售" `
  --columns "产品编号,中文产品名称,产品系列,产品型号,现有库存,产品状态" `
  --sort "产品编号:asc"
```

Important guardrails:

- `staticConfig.dataRange` controls "数据过滤条件"
- `staticConfig.columnFilter` controls "字段显隐"
- `defaultConfig.showFields` controls table display columns and order
- use `--dry-run` first for production forms and keep backups under `.cache/openyida`

## Repository Layout

```text
skills/
  yida-batch-data/
  yida-create-manage-view/
  yida-form-runtime-refresh/
  yida-integration-subtable/
  yida-manage-view-config/
  yida-select-linkage/
```

Each skill contains a required `SKILL.md`. Some skills also include scripts, references, assets, or UI metadata under `agents/`.

## General YiDA Safety Notes

- Always fetch schema before using field IDs.
- Do not guess `formUuid`, `fieldId`, `tableFieldId`, or process IDs.
- For production forms with existing data, keep changes narrowly scoped and verify after saving.
- For forms with serial numbers or formulas, run `yida-form-runtime-refresh` after schema edits.
- Do not create or delete business data for testing without explicit user approval.
