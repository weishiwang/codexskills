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
    if (npmRoot) {
      candidates.push(path.join(npmRoot, 'openyida', 'lib', 'core', 'utils.js'));
    }
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
      // Try next candidate.
    }
  }
  throw new Error('Cannot load openyida/lib/core/utils. Install openyida globally or run inside an OpenYida-enabled project.');
}

const { loadCookieData, resolveBaseUrl, httpGet, httpPost, requestWithAutoLogin } = requireOpenYidaUtils();

function usage() {
  console.error(`Usage:
  node scripts/diagnose-timer-flow.js --app APP_XXX --process LPROC_XXX [options]

Options:
  --name "Flow name"          Optional name hint for list matching
  --form FORM-XXX             Optional formUuid hint for list matching
  --project-root <dir>        YiDA project root that contains .cache/cookies.json
  --output <dir>              Output directory. Default .cache/openyida/timer-flow
  --page-size <n>             Default 20
`);
}

function parseArgs(argv) {
  const args = { outputDir: path.join('.cache', 'openyida', 'timer-flow'), pageSize: 20 };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = argv[i + 1];
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
      case '--process':
      case '--process-code':
        args.processCode = next;
        break;
      case '--name':
        args.flowName = next;
        break;
      case '--form':
      case '--form-uuid':
        args.formUuid = next;
        break;
      case '--project-root':
        args.projectRoot = next;
        break;
      case '--output':
        args.outputDir = next;
        break;
      case '--page-size':
        args.pageSize = Number(next);
        break;
      default:
        throw new Error(`Unknown option: ${key}`);
    }
  }
  return args;
}

function findCookieProjectRoot(explicitRoot) {
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }
  if (process.env.OPENYIDA_PROJECT_ROOT) {
    return path.resolve(process.env.OPENYIDA_PROJECT_ROOT);
  }

  let current = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, '.cache', 'cookies.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return process.cwd();
}

function unwrap(result) {
  return result && (result.content !== undefined ? result.content : result.data !== undefined ? result.data : result);
}

function hasErrorCode(result) {
  if (!result) {
    return false;
  }
  const code = result.errorCode;
  return code !== undefined && code !== null && code !== '' && code !== 0;
}

function resultMessage(result) {
  if (!result) {
    return 'unknown error';
  }
  return result.errorMsg || result.throwable || result.error || result.message || result.errorCode || 'unknown error';
}

function resultHasError(result) {
  return !!(
    !result
    || result.__needLogin
    || result.__csrfExpired
    || result.success === false
    || hasErrorCode(result)
  );
}

function assertOk(result, action) {
  if (resultHasError(result)) {
    throw new Error(`${action} failed: ${resultMessage(result)}`);
  }
}

function flattenListData(result) {
  const content = unwrap(result) || {};
  const data = Array.isArray(content.data) ? content.data : [];
  const flows = [];
  for (const item of data) {
    if (Array.isArray(item.flowList)) {
      flows.push(...item.flowList);
    } else {
      flows.push(item);
    }
  }
  return flows;
}

function dedupeByProcessCode(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const code = item && item.processCode;
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    out.push(item);
  }
  return out;
}

function dedupeById(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const id = item && item.id;
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(item);
  }
  return out;
}

function parseDetailContent(result) {
  const content = result && result.content;
  if (typeof content === 'string') {
    return JSON.parse(content);
  }
  if (content && typeof content === 'object') {
    return content;
  }
  return null;
}

function extractVersions(result) {
  const content = unwrap(result) || {};
  return Array.isArray(content.data) ? content.data : [];
}

function sortVersions(items) {
  const list = Array.isArray(items) ? items.slice() : [];
  list.sort((left, right) => {
    const leftTime = Number(left && left.modifiedTime) || 0;
    const rightTime = Number(right && right.modifiedTime) || 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    const leftVersion = Number(left && left.version) || 0;
    const rightVersion = Number(right && right.version) || 0;
    if (rightVersion !== leftVersion) {
      return rightVersion - leftVersion;
    }
    return String(right && right.status || '').localeCompare(String(left && left.status || ''));
  });
  return list;
}

function summarizeVersions(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    id: item.id,
    version: item.version,
    status: item.status,
    name: item.name,
    modifiedTime: item.modifiedTime,
  }));
}

function buildDetailAttemptSummary(attempt, result, detail) {
  return {
    method: attempt.method,
    endpoint: attempt.endpoint,
    api: attempt.api,
    source: attempt.source,
    params: attempt.params,
    success: result && result.success,
    errorCode: result && result.errorCode,
    errorMsg: result && result.errorMsg,
    throwable: result && result.throwable,
    hasDetail: !!detail,
    hasSchema: !!(detail && detail.schema),
    hasTimerStart: !!findStartNode(detail && detail.schema ? detail.schema : null),
  };
}

function findStartNode(schema) {
  const queue = [];
  if (schema && Array.isArray(schema.children)) {
    queue.push(...schema.children);
  }
  while (queue.length > 0) {
    const node = queue.shift();
    if (node && node.componentName === 'StartNode') {
      return node;
    }
    if (node && Array.isArray(node.children)) {
      queue.push(...node.children);
    }
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.appType || !args.processCode) {
    usage();
    process.exit(2);
  }

  const projectRoot = findCookieProjectRoot(args.projectRoot);
  const cookieData = loadCookieData(projectRoot);
  if (!cookieData || !cookieData.cookies || !cookieData.csrf_token) {
    throw new Error(`No valid YiDA login cache found under ${projectRoot}. Run openyida login first or pass --project-root.`);
  }

  const authRef = {
    csrfToken: cookieData.csrf_token,
    cookies: cookieData.cookies,
    baseUrl: resolveBaseUrl(cookieData),
    cookieData,
  };

  const get = (requestPath, query) => requestWithAutoLogin(
    (auth) => httpGet(auth.baseUrl, requestPath, query || null, auth.cookies, { silentStatus: true }),
    authRef
  );
  const post = (requestPath, body) => requestWithAutoLogin(
    (auth) => httpPost(auth.baseUrl, requestPath, querystring.stringify(body || {}), auth.cookies, { silentStatus: true }),
    authRef
  );

  const stamp = Date.now();
  const listQueryBase = {
    _csrf_token: authRef.csrfToken,
    _locale_time_zone_offset: '28800000',
    type: '3',
    key: args.flowName || '',
    appType: args.appType,
    formUuid: args.formUuid || '',
    status: '',
    pageIndex: '1',
    pageSize: String(args.pageSize || 100),
    _stamp: String(stamp),
  };

  const appListResult = await get(
    `/alibaba/web/${args.appType}/query/appLogicflowBinding/listflow.json?${querystring.stringify({
      ...listQueryBase,
      _api: 'Connector.getListflow',
      _mock: 'false',
    })}`
  );
  assertOk(appListResult, 'list app timer flows');

  const formListResult = await get(
    `/alibaba/web/${args.appType}/query/formLogicflowBinding/listflow.json?${querystring.stringify({
      ...listQueryBase,
      _api: 'Connector.getTriggerList',
      _mock: 'false',
    })}`
  );
  assertOk(formListResult, 'list form timer flows');

  const flows = dedupeByProcessCode([
    ...flattenListData(appListResult),
    ...flattenListData(formListResult),
  ]);

  const matchedFlow = flows.find((flow) => flow.processCode === args.processCode) || null;

  const queryVersions = async (status) => get(
    `/alibaba/web/${args.appType}/query/process/pageProcessVersion.json?${querystring.stringify({
      _api: 'Process.getProcessVersionInfo',
      _mock: 'false',
      _csrf_token: authRef.csrfToken,
      _locale_time_zone_offset: '28800000',
      processCode: args.processCode,
      appType: args.appType,
      status: status || '',
      pageIndex: '1',
      pageSize: '10',
      orderByModifyTime: 'desc',
      _stamp: String(Date.now()),
    })}`
  );

  let versionsAllResult = null;
  let versionsPublishedResult = null;
  let allVersions = [];
  let publishedVersions = [];
  try {
    versionsAllResult = await queryVersions('');
    assertOk(versionsAllResult, 'query timer flow versions');
    allVersions = sortVersions(extractVersions(versionsAllResult));
  } catch (error) {
    versionsAllResult = {
      success: false,
      errorMsg: error && error.message ? error.message : String(error),
    };
  }
  try {
    versionsPublishedResult = await queryVersions('PUBLISHED');
    assertOk(versionsPublishedResult, 'query published timer flow versions');
    publishedVersions = sortVersions(extractVersions(versionsPublishedResult));
  } catch (error) {
    versionsPublishedResult = {
      success: false,
      errorMsg: error && error.message ? error.message : String(error),
    };
  }

  const preferredVersions = dedupeById([
    ...publishedVersions,
    ...allVersions,
  ]);

  const detailAttempts = [];
  const detailRequestCandidates = [];
  for (const version of preferredVersions) {
    const params = {
      processId: String(version.id),
      processCode: args.processCode,
      isLogic: 'true',
    };
    detailRequestCandidates.push(
      {
        method: 'GET',
        endpoint: `/alibaba/web/${args.appType}/query/simpleProcess/getProcessById.json`,
        api: 'Process.getProcessById',
        params,
        source: `version:${version.version}:${version.status || 'UNKNOWN'}`,
      },
      {
        method: 'GET',
        endpoint: `/alibaba/web/${args.appType}/query/simpleProcess/getProcess.json`,
        api: 'Process.getProcess',
        params,
        source: `version:${version.version}:${version.status || 'UNKNOWN'}`,
      },
      {
        method: 'POST',
        endpoint: `/alibaba/web/${args.appType}/query/simpleProcess/getProcessById.json`,
        api: 'Process.getProcessById',
        params,
        source: `version:${version.version}:${version.status || 'UNKNOWN'}`,
      },
      {
        method: 'POST',
        endpoint: `/alibaba/web/${args.appType}/query/simpleProcess/getProcess.json`,
        api: 'Process.getProcess',
        params,
        source: `version:${version.version}:${version.status || 'UNKNOWN'}`,
      }
    );
  }
  detailRequestCandidates.push(
    {
      method: 'GET',
      endpoint: `/alibaba/web/${args.appType}/query/simpleProcess/getProcessById.json`,
      api: 'Process.getProcessById',
      params: {
        processCode: args.processCode,
        isLogic: 'true',
      },
      source: 'processCode',
    },
    {
      method: 'GET',
      endpoint: `/alibaba/web/${args.appType}/query/simpleProcess/getProcess.json`,
      api: 'Process.getProcess',
      params: {
        processCode: args.processCode,
        isLogic: 'true',
      },
      source: 'processCode',
    }
  );

  let detailResult = null;
  let detail = null;
  let chosenDetailAttempt = null;
  for (const attempt of detailRequestCandidates) {
    const payload = {
      _csrf_token: authRef.csrfToken,
      _locale_time_zone_offset: '28800000',
      _api: attempt.api,
      _mock: 'false',
      _stamp: String(Date.now()),
      ...attempt.params,
    };
    const result = attempt.method === 'POST'
      ? await post(attempt.endpoint, payload)
      : await get(`${attempt.endpoint}?${querystring.stringify(payload)}`);
    const parsed = parseDetailContent(result);
    detailAttempts.push(buildDetailAttemptSummary(attempt, result, parsed));
    if (!resultHasError(result) && parsed && parsed.schema) {
      detailResult = result;
      detail = parsed;
      chosenDetailAttempt = buildDetailAttemptSummary(attempt, result, parsed);
      break;
    }
  }
  if (!detailResult) {
    const tail = detailAttempts.length > 0 ? detailAttempts[detailAttempts.length - 1] : null;
    throw new Error(`get timer flow detail failed: ${(tail && (tail.errorMsg || tail.throwable || tail.errorCode)) || 'all detail attempts failed'}`);
  }

  const schema = detail && detail.schema ? detail.schema : null;
  const startNode = findStartNode(schema);
  const startProps = startNode && startNode.props ? startNode.props : {};
  const startConfig = startProps.start || {};
  const timerTriggerType = startConfig.triggerType || '';
  const timerText = startConfig.repeatRuleText || '';
  const detailFormUuid = startConfig.startTrigger && startConfig.startTrigger.selectFormUuid
    ? startConfig.startTrigger.selectFormUuid
    : '';

  const metadataBroken = !!(
    matchedFlow
    && matchedFlow.eventType === 3
    && (
      matchedFlow.eventName === '<未设置>'
      || !matchedFlow.eventName
      || !matchedFlow.formUuid
      || matchedFlow.status === 'n'
    )
  );

  const diagnosis = {
    ok: true,
    appType: args.appType,
    processCode: args.processCode,
    projectRoot,
    requestedFlowName: args.flowName || null,
    requestedFormUuid: args.formUuid || null,
    matchedFlow,
    processVersions: {
      preferred: chosenDetailAttempt && chosenDetailAttempt.params && chosenDetailAttempt.params.processId
        ? chosenDetailAttempt.params.processId
        : null,
      published: summarizeVersions(publishedVersions),
      all: summarizeVersions(allVersions),
    },
    listSummary: flows.map((flow) => ({
      processCode: flow.processCode,
      name: flow.name,
      eventType: flow.eventType,
      eventName: flow.eventName,
      formUuid: flow.formUuid,
      status: flow.status,
      lastAction: flow.lastAction,
    })),
    detailSummary: {
      hasDetail: !!detail,
      hasSchema: !!schema,
      hasTimerStart: !!startNode,
      detailSource: chosenDetailAttempt ? chosenDetailAttempt.source : null,
      detailEndpoint: chosenDetailAttempt ? `${chosenDetailAttempt.method} ${chosenDetailAttempt.endpoint}` : null,
      detailProcessId: chosenDetailAttempt && chosenDetailAttempt.params ? chosenDetailAttempt.params.processId || null : null,
      timerTriggerType,
      timerRuleText: timerText || null,
      detailFormUuid: detailFormUuid || null,
    },
    metadataBroken,
    recommendedAction: metadataBroken && startNode
      ? 'Open the designer and publish the flow from the real UI, then re-run this diagnosis.'
      : metadataBroken
        ? 'Confirm the processCode and detail endpoint first; the list metadata is broken but the timer start node was not found.'
        : startNode
          ? 'Timer metadata looks healthy. Investigate business conditions or runtime logs next.'
          : 'The process detail did not look like a timer flow. Verify processCode and endpoint selection.',
    evidence: {
      appListResult,
      formListResult,
      versionsPublishedResult,
      versionsAllResult,
      detailAttempts,
      detailResult,
    },
  };

  const outputDir = path.isAbsolute(args.outputDir)
    ? args.outputDir
    : path.join(projectRoot, args.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const fileName = `timer-flow-diagnosis-${args.processCode}.json`;
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, JSON.stringify(diagnosis, null, 2), 'utf8');
  console.log(JSON.stringify({ ok: true, outputPath, summary: diagnosis.detailSummary, metadataBroken }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
