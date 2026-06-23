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
  node scripts/save-manage-view-config.js --app APP_XXX --form FORM-XXX --view VIEW-XXX --columns "字段1,字段2" [options]

Options:
  --sort "字段:asc|desc"       Set one sort rule. Repeat for multiple rules.
  --filter-json <json-or-file>  Replace filter config. Default preserves current filter.
  --lock "字段1,字段2"          Set frozen columns by label. Default preserves current lockFieldIds.
  --line-height <number>        Set row height. Default preserves current lineHeight.
  --backup-dir <dir>            Directory for before/after backups. Default .cache/openyida/manage-view
  --dry-run                     Resolve and print payload without saving.
`);
}

function parseArgs(argv) {
  const args = { sort: [] };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === '--dry-run') {
      args.dryRun = true;
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
      case '--view':
      case '--view-uuid':
        args.viewUuid = next;
        break;
      case '--columns':
        args.columns = splitList(next);
        break;
      case '--sort':
        args.sort.push(next);
        break;
      case '--filter-json':
        args.filterJson = next;
        break;
      case '--lock':
        args.lock = splitList(next);
        break;
      case '--line-height':
        args.lineHeight = Number(next);
        break;
      case '--backup-dir':
        args.backupDir = next;
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

function fieldLabel(field) {
  const label = field && field.props && field.props.label;
  if (!label) return field.label || field.name || '';
  if (typeof label === 'string') return label;
  return label.zh_CN || label.en_US || label.value || '';
}

function unwrap(result) {
  return result && (result.content || result.data || result);
}

function assertOk(result, action) {
  if (!result || result.success === false || result.__needLogin || result.__csrfExpired) {
    const message = result && (result.errorMsg || result.error || result.message || result.errorCode);
    throw new Error(`${action} failed: ${message || 'unknown error'}`);
  }
}

function loadJsonArg(value) {
  if (!value) return undefined;
  const maybePath = path.resolve(value);
  const raw = fs.existsSync(maybePath) ? fs.readFileSync(maybePath, 'utf8') : value;
  return JSON.parse(raw);
}

function resolveLabels(fields, labels, role) {
  const byLabel = new Map();
  fields.forEach((field) => {
    const id = field.componentId || field.id || field.fieldId;
    const label = normalizeLabel(fieldLabel(field));
    if (label && id && !byLabel.has(label)) byLabel.set(label, id);
  });

  return labels.map((label) => {
    const id = byLabel.get(normalizeLabel(label));
    if (!id) {
      throw new Error(`Cannot find ${role || 'field'} label: ${label}`);
    }
    return id;
  });
}

function parseSortRules(fields, rules) {
  if (!rules || rules.length === 0) return undefined;
  return rules.map((rule) => {
    const [label, direction = 'asc'] = String(rule).split(':');
    const id = resolveLabels(fields, [label], 'sort')[0];
    const normalizedDirection = direction.trim().toLowerCase();
    if (!['asc', 'desc', 'y', 'n'].includes(normalizedDirection)) {
      throw new Error(`Unsupported sort direction for ${label}: ${direction}`);
    }
    return { id, isAsc: ['asc', 'y'].includes(normalizedDirection) ? 'y' : 'n' };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.appType || !args.formUuid || !args.viewUuid || !args.columns || args.columns.length === 0) {
    usage();
    process.exit(2);
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

  const fetchPanel = () => requestWithAutoLogin((auth) => httpGet(
    auth.baseUrl,
    `/${args.appType}/query/dataview/getDataViewPanel.json`,
    {
      appType: args.appType,
      formUuid: args.formUuid,
      viewUuid: args.viewUuid,
      ccMode: 'tile',
      pageType: 'manage',
    },
    auth.cookies,
    { silentStatus: true }
  ), authRef);

  const panelResult = await fetchPanel();
  assertOk(panelResult, 'getDataViewPanel');
  const panel = unwrap(panelResult);
  const fields = panel.componentValueVoList || [];
  const currentConfig = panel.viewConfig || {};

  const showFields = resolveLabels(fields, args.columns, 'column');
  const sort = parseSortRules(fields, args.sort) || currentConfig.sort || [];
  const lockFieldIds = args.lock ? resolveLabels(fields, args.lock, 'lock') : currentConfig.lockFieldIds || [];
  const filter = args.filterJson ? loadJsonArg(args.filterJson) : currentConfig.filter || {};
  const defaultConfig = {
    filter,
    sort,
    showFields,
    widths: currentConfig.widths || null,
    lockFieldIds,
  };
  if (args.lineHeight || currentConfig.lineHeight) {
    defaultConfig.lineHeight = args.lineHeight || currentConfig.lineHeight;
  }

  const backupDir = path.resolve(args.backupDir || path.join('.cache', 'openyida', 'manage-view'));
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const beforePath = path.join(backupDir, `manage-view-before-${args.formUuid}-${args.viewUuid}-${stamp}.json`);
  const afterPath = path.join(backupDir, `manage-view-after-${args.formUuid}-${args.viewUuid}-${stamp}.json`);

  fs.writeFileSync(beforePath, JSON.stringify({
    appType: args.appType,
    formUuid: args.formUuid,
    viewUuid: args.viewUuid,
    viewConfig: currentConfig,
    columns: args.columns.map((label, index) => ({ label, fieldId: showFields[index] })),
  }, null, 2), 'utf8');

  const payload = {
    _csrf_token: authRef.csrfToken,
    appType: args.appType,
    viewUuid: args.viewUuid,
    formUuid: args.formUuid,
    defaultConfig: JSON.stringify(defaultConfig),
  };

  if (args.dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, beforePath, payload, defaultConfig }, null, 2));
    return;
  }

  const saveResult = await requestWithAutoLogin((auth) => httpPost(
    auth.baseUrl,
    `/web/dingtalk/${args.appType}/query/dataview/updateConfig.json`,
    querystring.stringify(payload),
    auth.cookies,
    { silentStatus: true }
  ), authRef);
  assertOk(saveResult, 'updateConfig');

  const afterResult = await fetchPanel();
  assertOk(afterResult, 'getDataViewPanel after save');
  const after = unwrap(afterResult);
  const output = {
    ok: true,
    endpoint: `/web/dingtalk/${args.appType}/query/dataview/updateConfig.json`,
    beforePath,
    afterPath,
    savedDefaultConfig: defaultConfig,
    afterViewConfig: after.viewConfig,
  };
  fs.writeFileSync(afterPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
