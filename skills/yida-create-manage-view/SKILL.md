---
name: yida-create-manage-view
description: Create YiDA data management page saved table views and quick filter tabs through browser-learned APIs. Use when users ask to create "新建视图", management-page quick views, filtered tabs such as 在售/停产/库存预警, or configure a new view's filter conditions, field visibility, display columns, sort, mobile visibility, button list, copy/delete/order without repeatedly operating the YiDA browser drawer.
---

# YiDA Create Manage View

Use this skill to create and configure YiDA management-page saved views through the same APIs used by the "新建视图" drawer.

## Core Workflow

1. Confirm login and target app:

   ```powershell
   openyida env --json
   openyida login --check-only --json
   ```

2. Confirm `appType` and `formUuid`.
   - Management URLs look like `https://<domain>/<appType>/admin/<formUuid>?viewUuid=<viewUuid>`.
   - `formUuid` is the data form/manage page id shown after `/admin/`.

3. Fetch existing view metadata:

   ```text
   GET /<appType>/query/formdesign/getFormSchemaInfo.json
   query: formUuid
   response: content.multiViewInfos[]
   ```

4. Create a table view:

   ```text
   POST /<appType>/query/dataview/createView.json
   form-urlencoded:
     _csrf_token
     formUuid
     dataFormUuid=<same as formUuid for normal forms>
     viewType=table
     name=<JSON i18n string>
     status={"PC":"ACTIVATED","MOBILE":"ACTIVATED"}
   ```

5. Fetch and update the new view config:

   ```text
   POST /<appType>/query/dataview/getViewConfig.json
   POST /<appType>/query/dataview/updateConfig.json
   ```

   `updateConfig` accepts `defaultConfig` and `staticConfig` as JSON strings.

## Config Model

Use `defaultConfig` for table runtime defaults:

```json
{
  "filter": {},
  "sort": [{ "id": "fieldId", "isAsc": "y" }],
  "showFields": ["fieldId_1", "fieldId_2"],
  "lockFieldIds": []
}
```

Use `staticConfig` for the drawer sections:

```json
{
  "columnFilter": ["fieldId_1", "fieldId_2"],
  "dataRange": {
    "condition": "AND",
    "rules": [
      {
        "id": "fieldId",
        "name": "产品状态",
        "componentType": "SelectField",
        "op": "eq",
        "ruleValue": "在售",
        "type": "TEXT"
      }
    ]
  },
  "buttonList": []
}
```

Important distinction:

- `defaultConfig.showFields` controls management table display columns and order.
- `staticConfig.columnFilter` controls field visibility in the view drawer.
- `staticConfig.dataRange` controls "数据过滤条件"; do not put new-view fixed filters only in `defaultConfig.filter`.

## Script

Use the bundled script for repeatable creation:

```powershell
node .\skills\yida-create-manage-view\scripts\create-manage-view.js `
  --app APP_XXX `
  --form FORM-XXX `
  --name "在售" `
  --filter "产品状态:eq:在售" `
  --columns "产品编号,中文产品名称,产品系列,产品型号,现有库存,产品状态" `
  --sort "产品编号:asc" `
  --backup-dir ".cache\openyida\manage-view"
```

Useful options:

- `--filter "字段:op:值"` can be repeated. Supported operators are passed through to YiDA; common values are `eq`, `ne`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`, `like`, `IS_NULL`, `IS_NOT_NULL`.
- `--filter-json <json-or-file>` replaces `staticConfig.dataRange` directly for complex nested conditions.
- `--columns "字段1,字段2"` sets both `defaultConfig.showFields` and, unless overridden, `staticConfig.columnFilter`.
- `--visible-fields "字段1,字段2"` sets only `staticConfig.columnFilter`.
- `--base-view VIEW-XXX` copies existing table defaults before applying changes.
- `--update-if-exists` updates an existing view with the same Chinese or plain name instead of creating a duplicate.
- `--dry-run` resolves labels and prints payload without saving.
- `--delete VIEW-XXX` deletes a view by id.

## Guardrails

- Resolve labels through `getDataViewPanel` or `getViewConfig`; do not guess field IDs.
- Keep backups under the current project's `.cache/` directory.
- For tests, create clearly named temporary views and delete them immediately.
- Do not delete user/business views unless the user explicitly asked for deletion.
- Keep at least one visible view; YiDA may reject deleting or hiding the last view.
- If browser and API disagree, re-fetch `getViewConfig` and `getDataViewPanel` before changing more settings.
