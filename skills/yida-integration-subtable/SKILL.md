---
name: yida-integration-subtable
description: 宜搭集成自动化子表同步专项技能。用于创建“第二张表新增/更新一条数据后，写入第一张主表某条记录的子表单明细”的自动化，支持按主表条件匹配记录、按子表条件更新已有行、未匹配时新增子表行。不适用于普通跨表新增主表记录（用 yida-integration）或直接手动写表单数据（用 yida-data-management）。
---

# yida-integration-subtable — 明细表写入主表子表自动化

本技能是 `yida-integration` 的子表同步专项复制版。目标场景：

```text
触发表单/明细表新增一条数据
  -> 匹配目标主表中的一条记录
  -> 匹配该主表记录的子表单某一行
  -> 命中则更新子表行，未命中则新增子表行
```

## 必须遵守

- 不要编造 `formUuid`、`fieldId`、子表 `tableFieldId`；必须从已知创建结果或 `openyida get-schema` 获取。
- 创建或发布前，必须向用户展示摘要并获得确认：触发表单、目标主表、主表匹配条件、目标子表字段、子表行匹配条件、字段映射、是否发布。
- 子表同步使用 `UpdateDataNode` / `dataUpdate`，不是普通 `AddDataNode` 新增主表记录。
- 带 `--update-data-sub-table-field-id` 时，未匹配到子表行必须使用 `--update-data-none-operation add`，对应设计器“未获取到数据时 -> 新增一条数据”。

## 前置步骤

1. 确认应用 `appType`。
2. 确认触发表单 `formUuid`，通常是第二张明细表。
3. 确认目标主表 `formUuid`，通常是第一张主表。
4. 获取两张表 schema：

```bash
openyida get-schema APP_XXX FORM-DETAIL > .cache/openyida/detail-schema.json
openyida get-schema APP_XXX FORM-MAIN > .cache/openyida/main-schema.json
```

5. 从主表 schema 找到目标子表字段（`componentName: "TableField"`）及其子字段 ID。

## 标准命令

```bash
openyida integration create APP_XXX FORM-DETAIL "明细新增写入主表子表" \
  --events insert \
  --trigger-recursively \
  --update-data-form-uuid FORM-MAIN \
  --update-data-condition "textField_mainNo:主记录编号:textField_detailMainNo:TextField:Equal" \
  --update-data-sub-table-field-id tableField_detailRows \
  --update-data-sub-condition "textField_subDetailNo:明细编号:textField_detailNo:TextField:Equal" \
  --update-data-assignment "textField_subDetailNo:processVar:textField_detailNo" \
  --update-data-assignment "textField_subTitle:processVar:textField_detailTitle" \
  --update-data-assignment "numberField_subAmount:processVar:numberField_detailAmount" \
  --update-data-assignment "textareaField_subRemark:processVar:textareaField_detailRemark" \
  --update-data-none-operation add \
  --publish
```

保存草稿时去掉 `--publish`。

## 参数映射

| 需求 | CLI 参数 |
| --- | --- |
| 触发表单 | 位置参数 `<formUuid>`，通常是明细表 |
| 目标主表 | `--update-data-form-uuid FORM-MAIN` |
| 主表匹配条件 | `--update-data-condition "主表字段ID:字段名:触发表字段ID:组件类型:Equal"` |
| 目标子表 | `--update-data-sub-table-field-id tableField_xxx` |
| 子表行匹配条件 | `--update-data-sub-condition "子表字段ID:字段名:触发表字段ID:组件类型:Equal"` |
| 写入字段 | 多个 `--update-data-assignment "子表字段ID:processVar:触发表字段ID"` |
| 未匹配子表行时新增 | `--update-data-none-operation add` |

## 已验证样例

在应用 `APP_X1ZJETM9HFG3KPDHAG2L` 中，样例自动化“主表创建子表明细示例”证明了关键结构：

- 目标主表：`FORM-23C93060664941E89576422B8FC81F92UPWN`
- 触发明细表：`FORM-90D9B459C62A43B4A37B908488691F74P49U`
- 目标子表字段：`tableField_cst63eo6x`
- 子表节点字段：`subSourceId = tableField_cst63eo6x`
- 子表行匹配：`subCondition`
- 未匹配时新增：`noneOperation = "add"`

## 常见错误

| 错误 | 修正 |
| --- | --- |
| 用 `--add-data-form-uuid FORM-MAIN` | 这会新增主表记录；子表同步改用 `--update-data-form-uuid` + `--update-data-sub-table-field-id` |
| 忘记 `--update-data-sub-condition` | 会无法幂等更新子表行，重复触发时更容易重复写入 |
| `noneOperation` 是 `ignored` | 子表行不存在时不会新增；改为 `add` |
| 字段名对但 fieldId 不对 | 重新用 `openyida get-schema` 获取真实 ID |

## 与其他技能配合

- 创建应用：`yida-create-app`
- 创建表单：`yida-create-form-page`
- 查询 schema：`yida-get-schema`
- 普通集成自动化、通知、跨表新增：`yida-integration`
- 查询/新增测试数据：`yida-data-management`
