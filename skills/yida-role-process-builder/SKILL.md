---
name: yida-role-process-builder
description: YiDA role and process-form builder for browser-learned role APIs and OpenYida workflow publishing. Use when users need to create/edit YiDA platform roles, create or update a YiDA role group, bind roles into that group, map approval nodes to YiDA roles, convert existing normal forms into process forms, or batch publish approval workflows from Excel/JSON requirements. Especially useful after discovering role APIs such as pageRoleGroup, createOrUpdateRoleGroup, pageUserManageRoles, createNewRole, updateRole, and when configuring approval/cc nodes for OpenYida create-process.
---

# YiDA Role Process Builder

Use this skill when a YiDA app needs platform roles plus process-form workflow publishing.

## Core Workflow

1. Confirm the current YiDA login and organization:

   ```powershell
   openyida env --json
   ```

   Verify `corpId`, `baseUrl`, `userId`, and cookie file. Do not create roles in the wrong organization.

2. Parse the business workflow source.
   - In approval-flow Excel sheets, treat the form/process name and workflow columns as source data.
   - Treat `抄送...` columns as `carbon` nodes, not approval roles.
   - Treat non-empty non-cc workflow columns as approval roles unless the business source says otherwise.
   - Skip blank nodes after trimming.

3. Create or update YiDA roles before publishing workflows.
   - Use one role per non-cc approval node.
   - Put all generated roles under a clear role group such as `北京中拓审批流程角色`.
   - If role members are not provided, ask the user for members. If the user confirms a placeholder, use the current login user and record that it must be replaced.

4. Generate process definition JSON files under `.cache/openyida/<project>/process-definitions/`.

   Approval node:

   ```json
   {
     "type": "approval",
     "name": "财务资产部经理签字",
     "approver": {
       "type": "role",
       "roles": [
         { "id": "ROLE-XXX", "name": "财务资产部经理签字", "roleType": "YIDA" }
       ],
       "multiApproverType": "or"
     }
   }
   ```

   Carbon node:

   ```json
   {
     "type": "carbon",
     "name": "抄送财务资产部",
     "approver": {
       "type": "user",
       "users": [
         { "id": "USER_ID_XXX", "name": "待配置抄送人" }
       ],
       "multiApproverType": "or"
     }
   }
   ```

5. Before publishing, show the user a concise summary:
   - target app
   - number of forms to convert
   - number of roles
   - number of approval nodes and carbon nodes
   - any placeholders for role members or cc users

6. Convert and publish only after explicit confirmation.

   ```powershell
   openyida create-process APP_XXX --formUuid FORM-XXX .cache\openyida\project\process-definitions\flow.json
   ```

7. Verify:

   ```powershell
   openyida list-forms APP_XXX
   openyida nav-group list APP_XXX --flat
   ```

   Confirm every expected form has `formType: "process"`.

## Bundled Script

Use the script for repeatable role creation and batch process publishing:

```powershell
node .\skills\yida-role-process-builder\scripts\role-process-builder.js roles `
  --group "北京中拓审批流程角色" `
  --roles-file .cache\openyida\project\clean-roles.txt `
  --member-user-id USER_ID_XXX `
  --out .cache\openyida\project\created-yida-roles.json
```

```powershell
node .\skills\yida-role-process-builder\scripts\role-process-builder.js publish `
  --app APP_XXX `
  --process-list .cache\openyida\project\process-list.json `
  --out .cache\openyida\project\process-publish-results.json
```

`process-list.json` can be an array:

```json
[
  {
    "seq": "1",
    "title": "购买招标文件付款",
    "formUuid": "FORM-XXX",
    "definitionFile": ".cache/openyida/project/process-definitions/1.json"
  }
]
```

It can also be the schema shape produced by a project build script:

```json
{
  "appType": "APP_XXX",
  "processDrafts": {
    "购买招标文件付款": {
      "seq": "1",
      "formUuid": "FORM-XXX",
      "definitionFile": "E:/project/.cache/openyida/project/process-definitions/1.json"
    }
  }
}
```

## Role API Notes

The role page APIs are platform-level APIs under the logged-in YiDA base URL:

- `GET /query/role/pageRoleGroup.json`
- `POST /query/role/createOrUpdateRoleGroup.json`
- `GET /query/role/pageUserManageRoles.json`
- `POST /query/role/createNewRole.json`
- `POST /query/role/updateRole.json`

Important details:

- Use `queryType=myManaged` or `queryType=custom` to verify roles after binding to a group. `queryType=all` may only show root-layer entries.
- Role group binding can be performed by saving the group with `children` set to the role UUID list.
- Role creation requires non-empty owners/members in many organizations. Use the real business users when available; otherwise record the placeholder explicitly.
- Use UTF-8 script files for Chinese role names. Avoid PowerShell inline snippets that can turn Chinese literals into `????`.

## Guardrails

- Do not publish workflow changes without explicit user confirmation.
- Do not guess `appType`, `formUuid`, `processCode`, role UUIDs, or field IDs.
- Do not treat `抄送` nodes as approval roles.
- Do not delete old apps or old roles unless the user explicitly asks and confirms the destructive operation.
- Store generated plans, role maps, process definitions, and publish results under `.cache/openyida/<project>/`.
- After publishing, update the project schema file with `processCode`, `processId`, and `formType: "process"`.

