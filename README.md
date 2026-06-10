# yida-integration-subtable

宜搭集成自动化子表同步专项 Codex Skill。

用于创建这类自动化：

```text
第二张明细表新增/更新数据
  -> 匹配第一张主表的一条记录
  -> 写入这条主表记录里的子表单明细
  -> 子表行存在则更新，不存在则新增
```

## 安装

将技能目录复制到你的 Codex skills 目录：

```powershell
Copy-Item -Recurse -Force .\skills\yida-integration-subtable "$env:USERPROFILE\.codex\skills\openyida\skills\yida-integration-subtable"
```

重启 Codex 或重新加载 skills 后，可用：

```text
$yida-integration-subtable
```

## 依赖

- 已安装并登录 `openyida`
- 已有宜搭应用、主表、明细表
- 已通过 `openyida get-schema` 确认真实 `formUuid`、`fieldId`、`tableFieldId`

## 核心命令模式

```bash
openyida integration create APP_XXX FORM-DETAIL "明细新增写入主表子表" \
  --events insert \
  --trigger-recursively \
  --update-data-form-uuid FORM-MAIN \
  --update-data-condition "textField_mainNo:主记录编号:textField_detailMainNo:TextField:Equal" \
  --update-data-sub-table-field-id tableField_detailRows \
  --update-data-sub-condition "textField_subDetailNo:明细编号:textField_detailNo:TextField:Equal" \
  --update-data-assignment "textField_subDetailNo:processVar:textField_detailNo" \
  --update-data-none-operation add \
  --publish
```

关键点：子表同步使用 `UpdateDataNode / dataUpdate`，`subSourceId` 指向目标主表里的 `TableField`，`noneOperation=add` 对应“未获取到数据时 -> 新增一条数据”。
