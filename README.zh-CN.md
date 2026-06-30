# Codex 宜搭技能

[English](README.md) | [简体中文](README.zh-CN.md)

本仓库包含一组可复用的 Codex 技能，用于宜搭/OpenYida 开发工作。每个技能都位于 `skills/<skill-name>` 目录下，可复制到本地 Codex 技能目录中使用。

## 安装

安装全部技能：

```powershell
Copy-Item -Recurse -Force .\skills\* "$env:USERPROFILE\.codex\skills\"
```

安装单个技能：

```powershell
Copy-Item -Recurse -Force .\skills\yida-form-runtime-refresh "$env:USERPROFILE\.codex\skills\yida-form-runtime-refresh"
```

安装后请重启 Codex，或重新加载技能。

## 技能列表

### `yida-batch-data`

使用内置 `yidaapi.js` 框架批量处理宜搭数据。

当需要处理大量宜搭数据或重复执行表单数据操作时，使用此技能：

- 批量查询表单数据
- 读取超过常规分页限制的数据
- 批量创建记录
- 批量更新记录
- 批量删除记录
- 处理子表数据
- 处理普通表单和流程表单
- 复用重试、限流、并发辅助能力，避免手写临时循环

主要内置资源：

```text
skills/yida-batch-data/assets/framework/yidaapi.js
```

常用辅助方法包括：

- `yidaForm(context).loadAll()`
- `yidaForm(context).loadAllBeyondLimit()`
- `yidaForm(context).saveallformdata(items)`
- `yidaForm(context).updataallformdata(items)`
- `yidaForm(context).deleteallformdata(items)`
- `yidaFlowForm(context)`，用于流程表单

### `yida-form-runtime-refresh`

在表单 Schema 修改后安全刷新宜搭表单运行时，并保护流水号配置。

当使用 `openyida create-form update`、`patch`、`rule` 或自定义 Schema 脚本修改宜搭表单 Schema 后，尤其是表单包含 `SerialNumberField` 时，使用此技能。

它可以避免一种常见故障：流水号字段在 Schema 中看起来配置正确，但通过 API 创建记录时生成了 `0003` 这样的普通值，而不是按配置生成带前缀或日期规则的流水号。

它也可以生成默认流水号规则补丁：

```text
<表单名称首字母前缀><yyyyMMdd><4 位序列号>
```

示例：`Purchase Order` -> `PO202606300001`。中文表单名建议显式传入 `--prefix`，避免错误猜测拼音首字母。

核心规则：

1. 读取当前线上 `getFormSchemaInfo`。
2. 基于线上配置构造 `updateFormSchemaInfo` 请求体。
3. 保留 `formulaType`、`supportSerialNumberField`、标题、显示标题和导航状态等重要配置。
4. 不使用大范围硬编码的表单配置默认值。

主要内置脚本：

```powershell
node C:\Users\Administrator\.codex\skills\yida-form-runtime-refresh\scripts\refresh-form-runtime.js APP_XXX FORM-XXX
```

默认流水号规则补丁生成脚本：

```powershell
node C:\Users\Administrator\.codex\skills\yida-form-runtime-refresh\scripts\build-default-serial-rule-patch.js --app APP_XXX --form FORM-XXX --corp dingXXX --field serialNumberField_xxx --form-name "采购订单" --prefix CGDD --out .cache/openyida/project/default-serial-rule-patch.json
```

在 Schema 修改后立即使用：

```bash
openyida get-schema APP_XXX FORM-XXX > .cache/openyida/project/schema-before.json
openyida create-form update APP_XXX FORM-XXX .cache/openyida/project/changes.json --force
node C:/Users/Administrator/.codex/skills/yida-form-runtime-refresh/scripts/refresh-form-runtime.js APP_XXX FORM-XXX
```

创建记录时不要手动给 `SerialNumberField` 赋值，应让宜搭自动生成。

### `yida-association-form-fill`

通过宜搭表单页面 JS，把选中的关联记录中的其它关联表单字段自动填充到当前表单。

当表单需要以下模式时使用此技能：

```text
选择采购申请
  -> 自动填充关联合同
  -> 自动填充关联项目
  -> 自动填充关联供应商
```

它沉淀了宜搭关联表单字段可用的设值格式：

```js
[
  {
    appType: 'APP_XXX',
    formUuid: 'FORM-TARGET',
    formType: 'receipt',
    instanceId: 'FINST-XXX',
    title: '显示标题',
    subTitle: 'serial00001'
  }
]
```

重要注意事项：

- 关联表单字段必须设置为对象数组
- 保存值里使用 `instanceId`，不是 `formInstId`
- 优先读取已选择源记录的详情，不要先用文本编号去跨表匹配
- 宜搭可能把关联值放在 `_id` 字段里并做双层 JSON 编码，解析时要兼容
- 将填充动作直接绑定到源关联字段的 `onChange`
- 多个 schema patch 要顺序执行，避免后一次保存覆盖前一次保存
- 完成后必须用真实浏览器验证，并移除调试日志

### `yida-integration-subtable`

宜搭集成自动化模式：把明细记录同步到匹配主表记录的子表中。

当需求是以下模式时使用此技能：

```text
第二张/明细表新增或更新一条记录
  -> 查找一条匹配的主表记录
  -> 在该主表记录的 TableField 子表中查找一条匹配行
  -> 找到则更新该行，否则追加一条新的子表行
```

这不同于普通跨表新增自动化。关键点是对主表使用更新数据节点，并设置目标子表字段。

典型 OpenYida 命令形态：

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

重要注意事项：

- 使用 `openyida get-schema` 确认真实的 `formUuid`、`fieldId` 和 `tableFieldId`
- 使用 `UpdateDataNode` / `dataUpdate`，不要使用普通新增数据节点
- 配置 `--update-data-sub-condition`，确保子表行更新具备幂等性
- 缺失行需要追加时，使用 `--update-data-none-operation add`
- 生产环境发布前先展示自动化摘要

### `yida-select-linkage`

宜搭下拉联动模式：使用普通映射表作为一级和二级 `SelectField` 选项来源。

当需求是以下模式时使用此技能：

```text
第一个下拉字段选择分类
  -> 第二个下拉字段只显示该分类下映射的选项
  -> 源数据存放在一张普通宜搭映射表中
```

它固化了宜搭设计器中的配置模式：

```text
第一个下拉框：选项类型 = 关联其他表单数据
第二个下拉框：选项类型 = 数据联动
```

核心公式形态：

```text
FETCHDISTINCTDATA("FORM-MAP","childFieldId",true,QUERYAND(QUERYEQ("parentMapFieldId",#{mainParentFieldId})))
```

内置辅助脚本：

```powershell
node .\skills\yida-select-linkage\scripts\build-select-linkage-patch.js .\linkage-config.json .\linkage-patch.json
openyida create-form patch APP_XXX FORM-MAIN .\linkage-patch.json --force
```

重要注意事项：

- 使用 `openyida get-schema` 确认所有字段 ID
- 映射条件字段尽量保持为 `TextField`
- 业务取值字段使用 `SelectField`，不要使用 `AssociationFormField`
- 对包含流水号的表单打补丁后，运行 `yida-form-runtime-refresh`

### `yida-manage-view-config`

配置宜搭数据管理页的已保存视图，无需每次重新打开浏览器设计器。

当需要修复管理页表格显示列、列顺序、默认排序、冻结列、行高，或“显示列”“排序”等已保存视图默认配置时，使用此技能。

主要内置脚本：

```powershell
node .\skills\yida-manage-view-config\scripts\save-manage-view-config.js `
  --app APP_XXX `
  --form FORM-XXX `
  --view VIEW-XXX `
  --columns "产品编号,中文产品名称,产品系列" `
  --sort "产品编号:asc"
```

重要注意事项：

- 从管理页 URL 中读取真实 `viewUuid`
- 通过 `getDataViewPanel` 解析字段标签，不要猜字段 ID
- 备份文件放在 `.cache/openyida/manage-view`
- 保存后重新拉取视图配置，验证 `content.viewConfig`

### `yida-create-manage-view`

创建宜搭数据管理页的表格保存视图和快捷筛选标签，无需重新打开“新建视图”抽屉。

当需要创建筛选后的管理视图，例如 `在售`、`停产`、`库存预警`，或需要设置新视图的数据筛选、字段可见性、显示列和默认排序时，使用此技能。

主要内置脚本：

```powershell
node .\skills\yida-create-manage-view\scripts\create-manage-view.js `
  --app APP_XXX `
  --form FORM-XXX `
  --name "在售" `
  --filter "产品状态:eq:在售" `
  --columns "产品编号,中文产品名称,产品系列,产品型号,现有库存,产品状态" `
  --sort "产品编号:asc"
```

重要注意事项：

- `staticConfig.dataRange` 控制“数据过滤条件”
- `staticConfig.columnFilter` 控制“字段显隐”
- `defaultConfig.showFields` 控制表格显示列及顺序
- 生产表单先使用 `--dry-run`，并把备份保存在 `.cache/openyida`

### `yida-role-process-builder`

创建和编辑宜搭平台角色，把角色绑定到角色组，并将审批需求批量发布为流程表单。

当项目需要把 Excel/JSON 审批需求转换成宜搭流程表单时，使用此技能：

- 通过角色管理 API 创建或更新宜搭角色
- 创建/更新角色组，并把角色 UUID 绑定进角色组
- 将审批节点映射到宜搭角色
- 将 `抄送...` 节点识别为抄送节点，而不是审批角色
- 使用 `openyida create-process --formUuid` 将普通表单转换为流程表单
- 批量发布流程定义，并记录 `processCode` / `processId`

主要内置脚本：

```powershell
node .\skills\yida-role-process-builder\scripts\role-process-builder.js roles `
  --group "北京中拓审批流程角色" `
  --roles-file .cache\openyida\project\clean-roles.txt `
  --member-user-id USER_ID_XXX

node .\skills\yida-role-process-builder\scripts\role-process-builder.js publish `
  --app APP_XXX `
  --process-list .cache\openyida\project\process-list.json
```

重要注意事项：

- 创建角色或发布流程前，先用 `openyida env --json` 核对登录组织
- 未经用户明确确认，不发布流程变更
- 角色映射和发布结果写入 `.cache/openyida/<project>/`
- 发布后验证所有目标表单的 `formType` 都是 `process`

## 仓库结构

```text
skills/
  yida-association-form-fill/
  yida-batch-data/
  yida-create-manage-view/
  yida-form-runtime-refresh/
  yida-integration-subtable/
  yida-manage-view-config/
  yida-role-process-builder/
  yida-select-linkage/
```

每个技能都包含必需的 `SKILL.md`。部分技能还会在 `agents/` 下包含脚本、参考资料、资源文件或 UI 元数据。

## 宜搭通用安全注意事项

- 使用字段 ID 前，必须先获取 Schema。
- 不要猜测 `formUuid`、`fieldId`、`tableFieldId` 或流程 ID。
- 对已有数据的生产表单，保持改动范围尽量小，并在保存后验证。
- 对包含流水号或公式的表单，Schema 修改后运行 `yida-form-runtime-refresh`。
- 未经用户明确批准，不要为了测试创建或删除业务数据。
