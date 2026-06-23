---
name: yida-manage-view-config
description: Configure YiDA data management page saved views, including default display columns, column order, sort rules, frozen columns, row height, and filter config. Use when users ask to fix or batch configure YiDA management page/list columns, display order, sorting, "显示列", "排序", "新建视图", or saved view defaults without repeatedly opening the browser designer.
---

# YiDA Manage View Config

Use this skill to configure YiDA management-page table views through the same backend endpoint used by the browser page. Prefer this after one browser inspection has confirmed the target view and the user wants repeatable API/script configuration.

## Core Pattern

1. Confirm login and environment:

   ```powershell
   openyida env --json
   openyida login --check-only --json
   ```

2. Confirm the target `appType`, `formUuid`, and `viewUuid`.
   - Management page URLs look like:
     `https://<domain>/<appType>/admin/<formUuid>?viewUuid=<viewUuid>`
   - Do not guess `viewUuid`; read it from the URL or navigation data.

3. Fetch the current view panel:

   ```text
   GET /<appType>/query/dataview/getDataViewPanel.json
   query: appType, formUuid, viewUuid, ccMode=tile, pageType=manage
   ```

4. Build `defaultConfig` from real field IDs:

   ```json
   {
     "filter": {},
     "sort": [{ "id": "fieldId_here", "isAsc": "y" }],
     "showFields": ["fieldId_1", "fieldId_2"],
     "widths": null,
     "lockFieldIds": [],
     "lineHeight": 32
   }
   ```

   `showFields` order is the table display order. Sort rules use `isAsc: "y"` for ascending and `"n"` for descending.

5. Save the view config:

   ```text
   POST /web/dingtalk/<appType>/query/dataview/updateConfig.json
   form-urlencoded:
     _csrf_token
     appType
     formUuid
     viewUuid
     defaultConfig=<JSON string>
   ```

6. Re-fetch `getDataViewPanel.json` and verify `content.viewConfig`.

## Script

Use `scripts/save-manage-view-config.js` for repeatable saves:

```powershell
node .\skills\yida-manage-view-config\scripts\save-manage-view-config.js `
  --app APP_XXX `
  --form FORM-XXX `
  --view VIEW-XXX `
  --columns "产品编号,中文产品名称,产品系列" `
  --sort "产品编号:asc" `
  --backup-dir ".cache\openyida\manage-view"
```

The script:

- reuses OpenYida's local login cache
- reads current fields from `getDataViewPanel`
- resolves display labels to real field IDs
- saves a timestamped before/after backup
- posts `updateConfig.json`
- verifies the saved `viewConfig`

## Guardrails

- Always resolve labels from `componentValueVoList`; do not handwrite field IDs unless they were freshly confirmed.
- Preserve existing `filter`, `widths`, `lockFieldIds`, and `lineHeight` unless the user asked to change them.
- For requirement screenshots, normalize Chinese/English parentheses and whitespace when matching labels.
- Operation columns such as details/edit/delete/run logs are usually not part of `showFields`; they are controlled by action buttons and page permissions.
- If browser and API disagree, trust the API after re-fetching, then refresh the browser. User-local workbench settings may temporarily override admin defaults.
- Save backups under the current project's `.cache/` directory, not in the skill folder.
