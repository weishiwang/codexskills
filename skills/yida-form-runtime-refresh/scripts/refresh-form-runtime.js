#!/usr/bin/env node
'use strict';

const path = require('path');
const querystring = require('querystring');

const openyidaRoot = process.env.OPENYIDA_NODE_MODULE_DIR || 'C:/Users/Administrator/AppData/Roaming/npm/node_modules/openyida';
const {
  loadCookieData,
  triggerLogin,
  resolveBaseUrl,
  httpPost,
  requestWithAutoLogin,
} = require(path.join(openyidaRoot, 'lib/core/utils'));

function usage() {
  console.error('Usage: node refresh-form-runtime.js <appType> <formUuid>');
  process.exit(1);
}

function asString(value, fallback) {
  if (value === undefined || value === null) {
    return fallback === undefined ? '' : String(fallback);
  }
  return String(value);
}

function asYN(value, fallback) {
  if (value === 'y' || value === 'n') {
    return value;
  }
  if (value === true) {
    return 'y';
  }
  if (value === false) {
    return 'n';
  }
  return fallback;
}

function boolString(value, fallback) {
  if (value === true || value === 'true' || value === 'y') {
    return 'true';
  }
  if (value === false || value === 'false' || value === 'n') {
    return 'false';
  }
  return fallback ? 'true' : 'false';
}

function titleJson(info) {
  const title = info.title || info.i18nTitle || {};
  return JSON.stringify({
    pureEn_US: title.pureEn_US || title.en_US || title.zh_CN || '',
    en_US: title.en_US || title.pureEn_US || title.zh_CN || '',
    zh_CN: title.zh_CN || title.en_US || title.pureEn_US || '',
    envLocale: title.envLocale || null,
    type: 'i18n',
    ja_JP: title.ja_JP || title.zh_CN || title.en_US || '',
    key: title.key || null,
  });
}

function buildUpdatePayload(csrfToken, formUuid, info) {
  return querystring.stringify({
    _api: 'Form.updateFormSchemaInfo',
    _csrf_token: csrfToken,
    _locale_time_zone_offset: '28800000',
    formUuid,
    serialSwitch: asYN(info.serialSwitch, 'n'),
    consultPerson: asString(info.consultPerson),
    defaultManager: asYN(info.defaultManager, 'n'),
    submissionRule: asString(info.submissionRule),
    redirectConfig: asString(info.redirectConfig),
    pushTask: asYN(info.pushTask, 'y'),
    defaultOrder: asString(info.defaultOrder),
    showPrint: asYN(info.showPrint, 'y'),
    relateUuid: asString(info.relateUuid),
    title: titleJson(info),
    pageType: asString(info.pageType, 'web,mobile'),
    isInner: asYN(info.isInner, 'y'),
    isNew: asYN(info.isNew, 'n'),
    isAgent: asYN(info.isAgent, 'y'),
    showAgent: asYN(info.showAgent, 'n'),
    showDingGroup: asYN(info.showDingGroup, 'y'),
    reStart: asYN(info.reStart, 'n'),
    previewConfig: asYN(info.previewConfig, 'y'),
    formulaType: asYN(info.formulaType, 'n'),
    displayTitle: asString(info.displayTitle, '${legao_creator}\u53d1\u8d77\u7684${legao_formname}'),
    displayType: asString(info.displayType),
    isRenderNav: boolString(info.isRenderNav !== undefined ? info.isRenderNav : info.renderNav, true),
    manageCustomActionInfo: asString(info.manageCustomActionInfo, '[]'),
  });
}

async function readSchemaInfo(authRef, appType, formUuid) {
  return requestWithAutoLogin((auth) => {
    const body = querystring.stringify({
      _csrf_token: auth.csrfToken,
      formUuid,
    });
    return httpPost(
      auth.baseUrl,
      `/dingtalk/web/${appType}/query/formdesign/getFormSchemaInfo.json`,
      body,
      auth.cookies,
      { silentStatus: true }
    );
  }, authRef);
}

async function main() {
  const appType = process.argv[2];
  const formUuid = process.argv[3];
  if (!appType || !formUuid) {
    usage();
  }

  let cookieData = loadCookieData();
  if (!cookieData) {
    cookieData = triggerLogin();
  }
  const authRef = {
    csrfToken: cookieData.csrf_token,
    cookies: cookieData.cookies,
    baseUrl: resolveBaseUrl(cookieData),
    cookieData,
  };

  const before = await readSchemaInfo(authRef, appType, formUuid);
  if (!before || !before.success || !before.content) {
    throw new Error('getFormSchemaInfo failed: ' + JSON.stringify(before));
  }

  const update = await requestWithAutoLogin((auth) => {
    return httpPost(
      auth.baseUrl,
      `/dingtalk/web/${appType}/query/formdesign/updateFormSchemaInfo.json`,
      buildUpdatePayload(auth.csrfToken, formUuid, before.content),
      auth.cookies,
      { silentStatus: true }
    );
  }, authRef);

  if (!update || !update.success) {
    throw new Error('updateFormSchemaInfo failed: ' + JSON.stringify(update));
  }

  const after = await readSchemaInfo(authRef, appType, formUuid);
  const beforeInfo = before.content || {};
  const afterInfo = after && after.content ? after.content : {};
  console.log(JSON.stringify({
    success: true,
    appType,
    formUuid,
    api: 'updateFormSchemaInfo',
    before: {
      title: beforeInfo.title && beforeInfo.title.zh_CN,
      version: beforeInfo.version,
      formStatus: beforeInfo.formStatus,
      formulaType: beforeInfo.formulaType,
      supportSerialNumberField: beforeInfo.supportSerialNumberField,
      isRenderNav: beforeInfo.isRenderNav,
    },
    after: {
      title: afterInfo.title && afterInfo.title.zh_CN,
      version: afterInfo.version,
      formStatus: afterInfo.formStatus,
      formulaType: afterInfo.formulaType,
      supportSerialNumberField: afterInfo.supportSerialNumberField,
      isRenderNav: afterInfo.isRenderNav,
    },
  }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ success: false, error: err.message }, null, 2));
  process.exit(1);
});
