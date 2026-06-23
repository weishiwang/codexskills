---
name: yida-select-linkage
description: 宜搭下拉字段数据联动配置技能。用于把 SelectField/下拉单选改成由普通映射表驱动的一级选项和二级联动选项，例如“产品分类选择后，产品系列只显示该分类下的系列”。适用于学习/复刻设计器的“选项类型=关联其它表单数据”和“选项类型=数据联动”配置、生成 openyida create-form patch 补丁、排查下拉联动字段 ID 和 FETCHDISTINCTDATA/QUERYEQ 公式。不适用于业务数据导入（用 yida-data-management）或普通静态下拉选项维护（用 yida-create-form-page）。
---

# yida-select-linkage

用普通映射表实现宜搭下拉单选的二级联动：

```text
映射表: 上级文本字段 + 下级文本字段 + 排序字段
主表一级下拉: 关联映射表上级文本字段，去重得到一级选项
主表二级下拉: 数据联动，按一级下拉值过滤映射表，取下级文本字段
```

## 必须遵守

- 不要编造 `formUuid` 或 `fieldId`；必须先用 `openyida get-schema` 获取主表和映射表 Schema。
- 映射表中参与条件匹配的上级字段优先使用 `TextField`。如果是 `SelectField`，设计器字段选择可能不可选，且公式匹配更容易出问题。
- 目标字段必须是 `SelectField` / 下拉单选；不要把已有业务值字段改成 `AssociationFormField`，否则下游表单、报表和规则可能不兼容。
- 表单含 `SerialNumberField` 时，打补丁后必须执行运行态刷新，避免流水号规则失效。
- 配置前后都要抓取 Schema 到 `.cache/openyida/<project>/`，并用数据提交页或预览页手工验证一次。

## 标准流程

1. 确认目标应用和表单：

```bash
openyida env --json
openyida login --check-only --json
openyida get-schema APP_XXX FORM-MAIN > .cache/openyida/project/main-before.json
openyida get-schema APP_XXX FORM-MAP > .cache/openyida/project/map.json
```

2. 确认字段 ID：

| 语义 | 例子 |
| --- | --- |
| 主表一级下拉 | `selectField_category` |
| 主表二级下拉 | `selectField_series` |
| 映射表上级文本 | `textField_map_category` |
| 映射表下级文本 | `textField_map_series` |
| 映射表排序字段 | `numberField_order`，可选 |

3. 生成补丁：

```bash
node skills/yida-select-linkage/scripts/build-select-linkage-patch.js .cache/openyida/project/linkage-config.json .cache/openyida/project/linkage-patch.json
```

4. 应用补丁：

```bash
openyida create-form patch APP_XXX FORM-MAIN .cache/openyida/project/linkage-patch.json --force
```

5. 如果目标表单有流水号，刷新运行态：

```bash
node C:/Users/Administrator/.codex/skills/yida-form-runtime-refresh/scripts/refresh-form-runtime.js APP_XXX FORM-MAIN
```

6. 重新抓取 Schema 并验证：

```bash
openyida get-schema APP_XXX FORM-MAIN > .cache/openyida/project/main-after.json
```

## 配置文件

`build-select-linkage-patch.js` 接收如下 JSON：

```json
{
  "appType": "APP_XXX",
  "mappingFormUuid": "FORM-MAP",
  "mainParentFieldId": "selectField_category",
  "mainParentFieldLabel": "产品分类",
  "mainChildFieldId": "selectField_series",
  "mappingParentFieldId": "textField_map_category",
  "mappingChildFieldId": "textField_map_series",
  "mappingOrderFieldId": "numberField_order",
  "mappingOrder": "asc",
  "childComponentName": "SelectField",
  "deduplication": true
}
```

`mappingOrderFieldId` 可省略；省略时不启用排序。

## 设计器 Schema 规律

一级下拉“关联其它表单数据”的关键属性：

```json
{
  "dataSourceType": "relate",
  "dataSource": [],
  "relate": "@{{FORM-MAP/textField_map_category}}",
  "relateAppType": "APP_XXX",
  "relateOrderEnable": true,
  "relateOrderConfig": [{ "fieldId": "numberField_order", "order": "asc" }],
  "defaultDataSource": {
    "complexType": "relate",
    "formula": "@{{FORM-MAP/textField_map_category}}",
    "options": []
  }
}
```

二级下拉“数据联动”的关键属性：

```json
{
  "dataSourceType": "linkage",
  "dataSource": [],
  "searchConfig": "",
  "dataSourceLinkage": {
    "data": {
      "formId": "FORM-MAP",
      "innerLinkageFieldId": "selectField_series",
      "appType": "APP_XXX",
      "otherLinkageFieldId": "textField_map_series",
      "deduplication": true,
      "componentName": "SelectField",
      "conditions": {
        "condition": "AND",
        "rules": [
          {
            "op": "eq",
            "otherFieldId": "textField_map_category",
            "innerFieldId": "selectField_category",
            "innerFieldType": "SelectField",
            "innerFieldName": "产品分类"
          }
        ]
      },
      "linkageProp": "dataSourceLinkage"
    },
    "event": {
      "onChange": [
        {
          "__from__": "linkage",
          "id": "assign",
          "params": {
            "appType": "APP_XXX",
            "prop": "dataSourceLinkage",
            "type": "formula",
            "value": "FETCHDISTINCTDATA(\"FORM-MAP\",\"textField_map_series\",true,QUERYAND(QUERYEQ(\"textField_map_category\",#{selectField_category})))",
            "target": "selectField_series"
          },
          "fieldId": "selectField_category"
        }
      ]
    }
  },
  "defaultDataSource": {
    "complexType": "linkage",
    "formula": { "data": "...same as dataSourceLinkage.data...", "event": "...same as dataSourceLinkage.event..." },
    "options": []
  }
}
```

## 验证要点

- Schema 摘要中一级和二级字段仍是 `SelectField`。
- 一级字段 `dataSourceType` 为 `relate`，`relate` 指向映射表上级文本字段。
- 二级字段 `dataSourceType` 为 `linkage`，`dataSourceLinkage.event.onChange[0].fieldId` 指向一级字段。
- 二级公式形如：

```text
FETCHDISTINCTDATA("FORM-MAP","下级字段ID",true,QUERYAND(QUERYEQ("上级映射字段ID",#{主表一级字段ID})))
```

- 预览或新增数据时，选择一级后，二级只出现匹配项。

## 常见错误

| 错误 | 修正 |
| --- | --- |
| 映射表上级字段是下拉，设计器不可选 | 新增单行文本字段，迁移值，再用文本字段做关联条件 |
| 二级下拉仍显示全部静态选项 | 确认 `dataSourceType=linkage`、`dataSource=[]`、`searchConfig=""` |
| 选择一级后二级无数据 | 检查映射表数据是否写入文本字段；检查公式里的 fieldId 是否真实存在 |
| 二级有重复项 | 设置 `deduplication: true` |
| 排序不生效 | 一级关联排序用 `relateOrderConfig`；二级数据联动排序通常由映射表数据或平台返回顺序决定 |

## 与其他技能配合

- 创建/修改映射表：`yida-create-form-page`
- 导入映射数据：`yida-data-management`
- 获取字段 ID：`yida-get-schema`
- 表单含流水号时刷新运行态：`yida-form-runtime-refresh`
