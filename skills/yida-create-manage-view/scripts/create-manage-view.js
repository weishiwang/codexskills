#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const childProcess = require('child_process');

function requireOpenYidaUtils() {
  const candidates = ['openyida/lib/core/utils'];
  try {
    const npmRoot = childProcess.execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    if (npmRoot) candidates.push(path.join(npmRoot, 'openyida', 'lib', 'core', 'utils.js'));
  } catch (_) {
    // Continue with common install paths.
  }
  candidates.push(
    'C:/Program Files/nodejs/node_modules/openyida/lib/core/utils.js',
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'openyida', 'lib', 'core', 'utils.js')
  );
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (_) {
      // Try the next candidate.
    }
  }
  throw new Error('Cannot load openyida/lib/core/utils. Install openyida globally or run inside an OpenYida-enabled project.');
}

const { loadCookieData, resolveBaseUrl, httpGet, httpPost, requestWithAutoLogin } = requireOpenYidaUtils();

function usage() {
  console.error(`Usage:
  Create/update a management table view:
    node scripts/create-manage-view.js --app APP_XXX --form FORM-XXX --name "在售" --filter "产品状态:eq:在售" --columns "产品编号,中文产品名称"

  Delete a view:
    node scripts/create-manage-view.js --app APP_XXX --form FORM-XXX --delete VIEW-XXX

Options:
  --base-view VIEW-XXX        Copy defaults from an existing view before applying changes.
  --update-if-exists          Update the existing view with the same name instead of creating.
  --filter "字段:op:值"       Add one dataRange rule. Repeat for AND rules.
  --filter-json <json|file>   Set staticConfig.dataRange directly.
  --condition AND|OR          dataRange condition for --filter rules. Default AND.
  --columns "字段1,字段2"     Set table display columns and default visible fields.
  --visible-fields "字段1,字段2" Set only staticConfig.columnFilter.
  --sort "字段:asc|desc"     Add one sort rule. Repeat for multiple rules.
  --inactive-pc               Create/update hidden on PC.
  --inactive-mobile           Create/update hidden on mobile.
  --backup-dir <dir>          Default .cache/openyida/manage-view-create
  --dry-run                   Print planned payload without saving.
`);
}

function parseArgs(argv) {
  const args = { filters: [], sort: [], condition: 'AND' };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (key === '--update-if-exists') {
      args.updateIfExists = true;
      continue;
    }
    if (key === '--inactive-pc') {
      args.inactivePc = true;
      continue;
    }
    if (key === '--inactive-mobile') {
      args.inactiveMobile = true;
      continue;
    }
    if (!key.startsWith('--')) {
      throw new Error(`Unexpected argument: ${key}`);
    }
    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    i++;
    switch (key) {
      case '--app':
      case '--app-type':
        args.appType = next;
        break;
      case '--form':
      case '--form-uuid':
        args.formUuid = next;
        break;
      case '--name':
        args.name = next;
        break;
      case '--base-view':
        args.baseViewUuid = next;
        break;
      case '--filter':
        args.filters.push(next);
        break;
      case '--filter-json':
        args.filterJson = next;
        break;
      case '--condition':
        args.condition = next.toUpperCase();
        break;
      case '--columns':
        args.columns = splitList(next);
        break;
      case '--visible-fields':
        args.visibleFields = splitList(next);
        break;
      case '--sort':
        args.sort.push(next);
        break;
      case '--backup-dir':
        args.backupDir = next;
        break;
      case '--delete':
      case '--delete-view':
        args.deleteViewUuid = next;
        break;
      default:
        throw new Error(`Unknown option: ${key}`);
    }
  }
  return args;
}

function splitList(value) {
  return String(value || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLabel(label) {
  return String(label || '')
    .replace(/\s+/g, ' ')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .trim();
}

function unwrap(result) {
  return result && (result.content !== undefined ? result.content : result.data !== undefined ? result.data : result);
}

function assertOk(result, action) {
  if (!result || result.success === false || result.__needLogin || result.__csrfExpired) {
    const message = result && (result.errorMsg || result.error || result.message || result.errorCode);
    throw new Error(`${action} failed: ${message || JSON.stringify(result).slice(0, 600)}`);
  }
}

function i18nName(name) {
  return { zh_CN: name, en_US: name, type: 'i18n' };
}

function parseMaybeJson(value) {
  if (value && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_) {
      return value;
    }
  }
  return value;
}

function readJsonArg(value) {
  if (!value) return undefined;
  const maybePath = path.resolve(value);
  const raw = fs.existsSync(maybePath) ? fs.readFileSync(maybePath, 'utf8') : value;
  return JSON.parse(raw);
}

function fieldLabel(field) {
  const label = field && (field.label || (field.props && field.props.label) || field.varName || field.name);
  if (!label) return '';
  if (typeof label === 'string') return label;
  return label.zh_CN || label.en_US || label.value || '';
}

function fieldId(field) {
  return field && (field.componentId || field.fieldId || field.id || (field.props && field.props.fieldId));
}

function flattenFields(fields) {
  const out = [];
  for (const field of fields || []) {
    const id = fieldId(field);
    if (id) out.push(field);
    for (const child of field.children || []) {
      out.push({
        ...child,
        parentId: id,
        parentTitle: fieldLabel(field),
      });
    }
  }
  return out;
}

function buildFieldIndex(fields) {
  const byLabel = new Map();
  const byId = new Map();
  flattenFields(fields).forEach((field) => {
    const id = fieldId(field);
    if (!id) return;
    byId.set(id, field);
    const label = normalizeLabel(fieldLabel(field));
    if (label && !byLabel.has(label)) byLabel.set(label, field);
    const parentTitle = normalizeLabel(field.parentTitle || '');
    if (parentTitle && label && !byLabel.has(`${parentTitle}.${label}`)) {
      byLabel.set(`${parentTitle}.${label}`, field);
    }
  });
  return { byLabel, byId };
}

function resolveField(index, labelOrId, role) {
  if (index.byId.has(labelOrId)) return index.byId.get(labelOrId);
  const field = index.byLabel.get(normalizeLabel(labelOrId));
  if (!field) throw new Error(`Cannot find ${role || 'field'}: ${labelOrId}`);
  return field;
}

function resolveFieldIds(index, labels, role) {
  return labels.map((label) => fieldId(resolveField(index, label, role)));
}

function parseSortRules(index, rules) {
  return (rules || []).map((rule) => {
    const [label, direction = 'asc'] = String(rule).split(':');
    const field = resolveField(index, label, 'sort field');
    const normalizedDirection = direction.trim().toLowerCase();
    if (!['asc', 'desc', 'y', 'n'].includes(normalizedDirection)) {
      throw new Error(`Unsupported sort direction for ${label}: ${direction}`);
    }
    return { id: fieldId(field), isAsc: ['asc', 'y'].includes(normalizedDirection) ? 'y' : 'n' };
  });
}

function valueTypeForField(field) {
  const dataType = field && (field.dataType || field.type);
  if (dataType) return dataType;
  const componentName = field && field.componentName;
  if (['NumberField', 'RateField'].includes(componentName)) return 'NUMBER';
  if (['DateField', 'CascadeDateField'].includes(componentName)) return 'DATE';
  return 'TEXT';
}

function parseScalar(value) {
  const raw = String(value);
  if (/^\s*\[.*\]\s*$/.test(raw) || /^\s*\{.*\}\s*$/.test(raw)) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return value;
    }
  }
  if (raw.includes('|')) return raw.split('|').map((item) => item.trim()).filter(Boolean);
  return value;
}

function parseFilterRule(index, spec) {
  const parts = String(spec).split(':');
  if (parts.length < 3) {
    throw new Error(`Invalid filter rule "${spec}". Expected 字段:op:值`);
  }
  const label = parts.shift();
  const op = parts.shift();
  const value = parseScalar(parts.join(':'));
  const field = resolveField(index, label, 'filter field');
  return {
    id: fieldId(field),
    name: fieldLabel(field),
    componentType: field.componentName || field.componentType,
    op,
    ruleValue: value,
    type: valueTypeForField(field),
  };
}

function parseName(value) {
  const parsed = parseMaybeJson(value);
  if (parsed && typeof parsed === 'object') return parsed;
  return i18nName(value);
}

function sameViewName(view, name) {
  const parsed = parseMaybeJson(view.name);
  if (typeof parsed === 'string') return parsed === name;
  if (!parsed) return false;
  return [parsed.zh_CN, parsed.en_US, parsed.pureEn_US].filter(Boolean).includes(name);
}

function parseStatus(view) {
  const parsed = parseMaybeJson(view && view.status);
  return parsed && typeof parsed === 'object' ? parsed : { PC: 'ACTIVATED', MOBILE: 'ACTIVATED' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.appType || !args.formUuid || (!args.deleteViewUuid && !args.name)) {
    usage();
    process.exit(2);
  }
  if (args.condition && !['AND', 'OR'].includes(args.condition)) {
    throw new Error('--condition must be AND or OR');
  }

  const cookieData = loadCookieData();
  if (!cookieData || !cookieData.cookies || !cookieData.csrf_token) {
    throw new Error('No valid YiDA login cache found. Run openyida login first.');
  }

  const authRef = {
    csrfToken: cookieData.csrf_token,
    cookies: cookieData.cookies,
    baseUrl: resolveBaseUrl(cookieData),
    cookieData,
  };

  const get = (url, data) => requestWithAutoLogin((auth) => httpGet(
    auth.baseUrl,
    url,
    data,
    auth.cookies,
    { silentStatus: true }
  ), authRef);

  const post = (url, data) => requestWithAutoLogin((auth) => httpPost(
    auth.baseUrl,
    url,
    querystring.stringify({ _csrf_token: auth.csrfToken, ...data }),
    auth.cookies,
    { silentStatus: true }
  ), authRef);

  const endpoint = (name) => `/${args.appType}/query/dataview/${name}.json`;

  if (args.deleteViewUuid) {
    if (args.dryRun) {
      console.log(JSON.stringify({ ok: true, dryRun: true, action: 'delete', formUuid: args.formUuid, viewUuid: args.deleteViewUuid }, null, 2));
      return;
    }
    const deleteResult = await post(endpoint('deleteView'), { formUuid: args.formUuid, viewUuid: args.deleteViewUuid });
    assertOk(deleteResult, 'deleteView');
    console.log(JSON.stringify({ ok: true, action: 'delete', viewUuid: args.deleteViewUuid, result: deleteResult }, null, 2));
    return;
  }

  const backupDir = path.resolve(args.backupDir || path.join('.cache', 'openyida', 'manage-view-create'));
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const schemaInfoResult = await get(`/${args.appType}/query/formdesign/getFormSchemaInfo.json`, { formUuid: args.formUuid });
  assertOk(schemaInfoResult, 'getFormSchemaInfo');
  const schemaInfo = unwrap(schemaInfoResult) || {};
  const views = schemaInfo.multiViewInfos || schemaInfo.viewInfos || [];
  const existingView = views.find((view) => sameViewName(view, args.name));

  let viewUuid = null;
  let action = 'create';
  if (existingView && args.updateIfExists) {
    viewUuid = existingView.viewUuid;
    action = 'update';
  } else if (existingView && !args.updateIfExists) {
    throw new Error(`A view named "${args.name}" already exists: ${existingView.viewUuid}. Use --update-if-exists to update it.`);
  }

  const fieldSourceViewUuid = args.baseViewUuid
    || viewUuid
    || ((views.find((view) => view.viewType === 'table' && view.viewUuid) || views.find((view) => view.viewUuid) || {}).viewUuid);
  if (!fieldSourceViewUuid) {
    throw new Error('Cannot find an existing viewUuid for field metadata. Open the management page once or create the default table view first.');
  }

  const panelResult = await get(`/${args.appType}/query/dataview/getDataViewPanel.json`, {
    appType: args.appType,
    formUuid: args.formUuid,
    viewUuid: fieldSourceViewUuid,
    ccMode: 'tile',
    pageType: 'manage',
  });
  assertOk(panelResult, 'getDataViewPanel');
  const panel = unwrap(panelResult) || {};
  const fieldIndex = buildFieldIndex(panel.componentValueVoList || []);

  let baseConfig = {};
  const baseViewUuid = viewUuid || args.baseViewUuid;
  if (baseViewUuid) {
    const baseResult = await post(endpoint('getViewConfig'), { formUuid: args.formUuid, viewUuid: baseViewUuid });
    assertOk(baseResult, 'getViewConfig base');
    baseConfig = unwrap(baseResult) || {};
  }

  const currentDefaultConfig = baseConfig.defaultConfig || panel.viewConfig || {};
  const currentStaticConfig = baseConfig.staticConfig || { columnFilter: ['all'], dataRange: {}, buttonList: [] };

  const showFields = args.columns ? resolveFieldIds(fieldIndex, args.columns, 'column') : currentDefaultConfig.showFields || 'all';
  const columnFilter = args.visibleFields
    ? resolveFieldIds(fieldIndex, args.visibleFields, 'visible field')
    : args.columns
      ? showFields
      : currentStaticConfig.columnFilter || ['all'];
  const sort = args.sort.length ? parseSortRules(fieldIndex, args.sort) : currentDefaultConfig.sort || [];
  const dataRange = args.filterJson
    ? readJsonArg(args.filterJson)
    : args.filters.length
      ? { condition: args.condition || 'AND', rules: args.filters.map((rule) => parseFilterRule(fieldIndex, rule)) }
      : currentStaticConfig.dataRange || {};

  const defaultConfig = {
    ...currentDefaultConfig,
    filter: currentDefaultConfig.filter || {},
    sort,
    showFields,
    lockFieldIds: currentDefaultConfig.lockFieldIds || [],
  };
  if (currentDefaultConfig.widths !== undefined) defaultConfig.widths = currentDefaultConfig.widths;
  if (currentDefaultConfig.lineHeight !== undefined) defaultConfig.lineHeight = currentDefaultConfig.lineHeight;

  const staticConfig = {
    ...currentStaticConfig,
    columnFilter,
    dataRange,
    buttonList: currentStaticConfig.buttonList || [],
  };

  const nameObject = parseName(args.name);
  const status = parseStatus(existingView);
  status.PC = args.inactivePc ? 'INACTIVATED' : status.PC || 'ACTIVATED';
  status.MOBILE = args.inactiveMobile ? 'INACTIVATED' : status.MOBILE || 'ACTIVATED';

  const plan = {
    ok: true,
    dryRun: !!args.dryRun,
    action,
    appType: args.appType,
    formUuid: args.formUuid,
    viewUuid,
    name: nameObject,
    status,
    defaultConfig,
    staticConfig,
  };

  const beforePath = path.join(backupDir, `create-manage-view-before-${args.formUuid}-${stamp}.json`);
  fs.writeFileSync(beforePath, JSON.stringify({ appType: args.appType, formUuid: args.formUuid, views, baseConfig, plan }, null, 2), 'utf8');

  if (args.dryRun) {
    console.log(JSON.stringify({ ...plan, beforePath }, null, 2));
    return;
  }

  if (!viewUuid) {
    const createResult = await post(endpoint('createView'), {
      formUuid: args.formUuid,
      dataFormUuid: args.formUuid,
      viewType: 'table',
      name: JSON.stringify(nameObject),
      status: JSON.stringify(status),
    });
    assertOk(createResult, 'createView');
    const created = unwrap(createResult);
    viewUuid = (created && created.viewUuid) || created;
    if (!viewUuid || typeof viewUuid !== 'string') {
      throw new Error(`createView did not return a viewUuid: ${JSON.stringify(createResult).slice(0, 600)}`);
    }
  } else {
    const updateBaseResult = await post(endpoint('updateBaseInfo'), {
      formUuid: args.formUuid,
      viewUuid,
      name: JSON.stringify(nameObject),
      status: JSON.stringify(status),
    });
    assertOk(updateBaseResult, 'updateBaseInfo');
  }

  const updateConfigResult = await post(endpoint('updateConfig'), {
    formUuid: args.formUuid,
    viewUuid,
    defaultConfig: JSON.stringify(defaultConfig),
    staticConfig: JSON.stringify(staticConfig),
  });
  assertOk(updateConfigResult, 'updateConfig');

  const afterResult = await post(endpoint('getViewConfig'), { formUuid: args.formUuid, viewUuid });
  assertOk(afterResult, 'getViewConfig after save');
  const afterConfig = unwrap(afterResult);
  const afterPath = path.join(backupDir, `create-manage-view-after-${args.formUuid}-${viewUuid}-${stamp}.json`);
  const output = {
    ok: true,
    action,
    appType: args.appType,
    formUuid: args.formUuid,
    viewUuid,
    name: nameObject,
    status,
    beforePath,
    afterPath,
    savedDefaultConfig: defaultConfig,
    savedStaticConfig: staticConfig,
    afterConfig,
  };
  fs.writeFileSync(afterPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
