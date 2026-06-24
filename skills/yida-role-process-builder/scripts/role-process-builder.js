#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function usage() {
  console.error(`Usage:
  node role-process-builder.js roles --group <name> --roles-file <file> --member-user-id <userId> [--out <file>] [--cookies <file>]
  node role-process-builder.js publish --app <APP_XXX> --process-list <file> [--out <file>]
  node role-process-builder.js all --app <APP_XXX> --group <name> --roles-file <file> --member-user-id <userId> --process-list <file> [--out-dir <dir>]

Notes:
  - Run from the project root that contains .cache/cookies-public.json, or pass --cookies.
  - process-list may be an array or a schema object with processDrafts.
`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function resolveProjectFile(file) {
  if (!file) return null;
  return path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
}

function loadAuth(cookieFileArg) {
  const candidates = [
    cookieFileArg && resolveProjectFile(cookieFileArg),
    path.resolve(process.cwd(), '.cache/cookies-public.json'),
    path.resolve(process.cwd(), '.cache/cookies.json'),
  ].filter(Boolean);
  const cookieFile = candidates.find((candidate) => fs.existsSync(candidate));
  if (!cookieFile) {
    throw new Error(`No cookie file found. Tried: ${candidates.join(', ')}`);
  }
  const data = readJson(cookieFile);
  const cookies = data.cookies || [];
  const csrf = data.csrf_token ||
    (cookies.find((cookie) => cookie.name === 'tianshu_csrf_token') || {}).value ||
    (cookies.find((cookie) => cookie.name === 'c_csrf') || {}).value;
  const baseUrl = data.base_url || data.baseUrl;
  const userId = data.user_id || data.userId;
  if (!baseUrl || !csrf || !cookies.length) {
    throw new Error(`Cookie file is missing baseUrl, csrf token, or cookies: ${cookieFile}`);
  }
  return {
    cookieFile,
    baseUrl,
    csrf,
    userId,
    cookieHeader: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
  };
}

function idOf(value) {
  return typeof value === 'string' ? value : value && (value.uuid || value.value || value.id);
}

function normalizeRoleName(name) {
  return String(name || '').trim();
}

function readRoles(file) {
  return fs.readFileSync(resolveProjectFile(file), 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(normalizeRoleName)
    .filter(Boolean)
    .filter((name) => !name.startsWith('抄送'));
}

async function yidaRequest(auth, pathname, data = {}, method = 'GET', form = false) {
  const url = new URL(auth.baseUrl + pathname);
  url.searchParams.set('_csrf_token', auth.csrf);
  const headers = {
    Cookie: auth.cookieHeader,
    Referer: `${auth.baseUrl}/platformManage/role`,
    Origin: auth.baseUrl,
    Accept: 'application/json, text/plain, */*',
  };
  const options = { method, headers };
  if (method === 'GET') {
    Object.entries(data).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  } else if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    options.body = new URLSearchParams(data);
  } else {
    headers['Content-Type'] = 'application/json;charset=UTF-8';
    options.body = JSON.stringify(data || {});
  }
  const response = await fetch(url, options);
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!response.ok || json.success === false) {
    throw new Error(`${method} ${pathname} failed ${response.status}: ${json.errorMsg || text.slice(0, 500)}`);
  }
  return json.content !== undefined ? json.content : json;
}

async function listGroups(auth) {
  const result = await yidaRequest(auth, '/query/role/pageRoleGroup.json', {
    limit: 100,
    page: 1,
    needMembers: false,
  });
  return result.values || [];
}

async function listRoles(auth, queryType = 'myManaged') {
  const all = [];
  for (let page = 1; page < 50; page += 1) {
    const result = await yidaRequest(auth, '/query/role/pageUserManageRoles.json', {
      limit: 100,
      page,
      queryType,
      needMembers: false,
    });
    const values = result.values || [];
    all.push(...values);
    if (!values.length || all.length >= (result.totalCount || all.length)) break;
  }
  return all;
}

async function ensureGroup(auth, groupName) {
  const groups = await listGroups(auth);
  let group = groups.find((item) => item.name === groupName);
  if (group) return group;
  const uuid = await yidaRequest(auth, '/query/role/createOrUpdateRoleGroup.json', {
    name: groupName,
    children: [],
  }, 'POST');
  return { name: groupName, uuid: idOf(uuid), type: 'GROUP' };
}

async function createOrUpdateRoles(auth, options) {
  const groupName = options.group;
  const roles = readRoles(options['roles-file']);
  const memberUserId = options['member-user-id'] || auth.userId;
  if (!groupName || !roles.length || !memberUserId) {
    throw new Error('roles mode requires --group, --roles-file, and --member-user-id (or userId in cookies).');
  }

  const group = await ensureGroup(auth, groupName);
  const parentUuid = idOf(group);
  const roleEntries = await listRoles(auth, 'myManaged');
  const byName = new Map(roleEntries.filter((item) => item.type === 'ROLE').map((item) => [item.name, item]));
  const results = [];

  for (const name of roles) {
    const existing = byName.get(name);
    if (existing) {
      results.push({ name, uuid: existing.uuid, parentUuid: existing.parentUuid, skipped: true });
      continue;
    }
    const uuid = await yidaRequest(auth, '/query/role/createNewRole.json', {
      name,
      desc: 'Created by Codex yida-role-process-builder.',
      canModifyOwners: memberUserId,
      members: memberUserId,
      parentUuid,
    }, 'POST', true);
    results.push({ name, uuid: idOf(uuid), parentUuid, skipped: false });
  }

  const childIds = results.map((item) => item.uuid).filter(Boolean);
  await yidaRequest(auth, '/query/role/createOrUpdateRoleGroup.json', {
    name: groupName,
    uuid: parentUuid,
    children: childIds,
  }, 'POST');

  const verifiedEntries = await listRoles(auth, 'myManaged');
  const wanted = new Set(roles);
  const verifiedRoles = verifiedEntries
    .filter((item) => item.type === 'ROLE' && wanted.has(item.name))
    .map((item) => ({
      name: item.name,
      uuid: item.uuid,
      parentUuid: item.parentUuid,
      type: item.type,
    }));

  return {
    groupName,
    parentUuid,
    memberPlaceholder: memberUserId,
    requested: roles.length,
    created: results.filter((item) => !item.skipped).length,
    skipped: results.filter((item) => item.skipped).length,
    verifiedWantedRoles: verifiedRoles.length,
    roles: verifiedRoles,
    results,
  };
}

function parseJsonLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{') && line.endsWith('}'))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function normalizeProcessList(file, appFromArg) {
  const source = readJson(resolveProjectFile(file));
  if (Array.isArray(source)) {
    return { appType: appFromArg, items: source };
  }
  const appType = appFromArg || source.appType;
  const drafts = source.processDrafts || {};
  const items = Object.entries(drafts).map(([title, draft]) => ({
    title,
    seq: draft.seq,
    formUuid: draft.formUuid,
    definitionFile: draft.definitionFile,
  }));
  return { appType, items };
}

function publishProcesses(options) {
  const { appType, items } = normalizeProcessList(options['process-list'], options.app);
  if (!appType || !items.length) {
    throw new Error('publish mode requires --app (unless process-list contains appType) and a non-empty --process-list.');
  }

  const out = options.out ? resolveProjectFile(options.out) : path.resolve(process.cwd(), '.cache/openyida/process-publish-results.json');
  const existing = fs.existsSync(out) ? readJson(out) : [];
  const done = new Set(existing.filter((item) => item.success).map((item) => item.formUuid));
  const results = existing.slice();

  for (const item of items) {
    if (done.has(item.formUuid)) {
      console.log(`SKIP ${item.seq || ''} ${item.title || item.formUuid}`);
      continue;
    }
    console.log(`PUBLISH ${item.seq || ''} ${item.title || item.formUuid}`);
    const definitionFile = resolveProjectFile(item.definitionFile);
    const relativeDefinition = path.relative(process.cwd(), definitionFile);
    const child = spawnSync('openyida.cmd', [
      'create-process',
      appType,
      '--formUuid',
      item.formUuid,
      relativeDefinition,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: Number(options.timeout || 180000),
      shell: true,
    });
    const jsonLines = parseJsonLines(child.stdout || '');
    const finalJson = [...jsonLines].reverse().find((entry) => entry.success && entry.processCode) || null;
    const result = {
      seq: item.seq,
      title: item.title,
      formUuid: item.formUuid,
      definitionFile,
      success: child.status === 0 && !!finalJson,
      processCode: finalJson && finalJson.processCode,
      processId: finalJson && finalJson.processId,
      exitCode: child.status,
      stdoutJsonCount: jsonLines.length,
      error: child.status === 0 ? null : (child.error ? child.error.message : (child.stderr || child.stdout || '').slice(-4000)),
      publishedAt: new Date().toISOString(),
    };
    results.push(result);
    writeJson(out, results);
    if (!result.success) {
      throw new Error(`Failed to publish ${item.title || item.formUuid}: ${result.error || 'No processCode found in output'}`);
    }
  }

  return {
    success: true,
    total: results.length,
    succeeded: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    resultPath: out,
  };
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  const mode = argv._[0];
  if (!mode || !['roles', 'publish', 'all'].includes(mode)) usage();

  if (mode === 'roles' || mode === 'all') {
    const auth = loadAuth(argv.cookies);
    const roleResult = await createOrUpdateRoles(auth, argv);
    const out = argv.out && mode === 'roles'
      ? resolveProjectFile(argv.out)
      : path.resolve(process.cwd(), argv['out-dir'] || '.cache/openyida', 'created-yida-roles.json');
    writeJson(out, roleResult);
    console.log(JSON.stringify({ mode: 'roles', out, ...roleResult }, null, 2));
  }

  if (mode === 'publish' || mode === 'all') {
    const publishOptions = { ...argv };
    if (mode === 'all' && !publishOptions.out) {
      publishOptions.out = path.join(argv['out-dir'] || '.cache/openyida', 'process-publish-results.json');
    }
    const publishResult = publishProcesses(publishOptions);
    console.log(JSON.stringify({ mode: 'publish', ...publishResult }, null, 2));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
