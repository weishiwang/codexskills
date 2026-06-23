#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');

function usage() {
  console.error('Usage: node build-select-linkage-patch.js <config.json> <patch.json>');
  process.exit(2);
}

const [, , configPath, outputPath] = process.argv;
if (!configPath || !outputPath) usage();

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const required = [
  'appType',
  'mappingFormUuid',
  'mainParentFieldId',
  'mainParentFieldLabel',
  'mainChildFieldId',
  'mappingParentFieldId',
  'mappingChildFieldId',
];

for (const key of required) {
  if (!config[key]) {
    throw new Error(`Missing required config key: ${key}`);
  }
}

const uuid = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const appType = config.appType;
const mapForm = config.mappingFormUuid;
const parent = config.mainParentFieldId;
const parentLabel = config.mainParentFieldLabel;
const child = config.mainChildFieldId;
const mapParent = config.mappingParentFieldId;
const mapChild = config.mappingChildFieldId;
const childComponentName = config.childComponentName || 'SelectField';
const deduplication = config.deduplication !== false;
const orderField = config.mappingOrderFieldId || '';
const order = config.mappingOrder || 'asc';

const relateExpr = `@{{${mapForm}/${mapParent}}}`;
const formula = `FETCHDISTINCTDATA("${mapForm}","${mapChild}",${deduplication ? 'true' : 'false'},QUERYAND(QUERYEQ("${mapParent}",#{${parent}})))`;

const condition = {
  condition: 'AND',
  rules: [
    {
      op: 'eq',
      otherFieldId: mapParent,
      innerFieldId: parent,
      innerFieldType: 'SelectField',
      ruleId: `item-${uuid()}`,
      innerFieldName: parentLabel,
    },
  ],
  ruleId: `group-${uuid()}`,
};

const linkageData = {
  formId: mapForm,
  innerLinkageFieldId: child,
  appType,
  otherLinkageFieldId: mapChild,
  tableFieldLinkages: [],
  deduplication,
  componentName: childComponentName,
  conditions: condition,
  linkageProp: 'dataSourceLinkage',
};

const linkageEvent = {
  onChange: [
    {
      __from__: 'linkage',
      id: 'assign',
      params: {
        appType,
        prop: 'dataSourceLinkage',
        type: 'formula',
        value: formula,
        target: child,
      },
      fieldId: parent,
    },
  ],
};

const parentProps = {
  dataSourceType: 'relate',
  dataSource: [],
  filterLocal: true,
  remote: '',
  relate: relateExpr,
  relateAppType: appType,
  relateOrderEnable: Boolean(orderField),
  relateOrderConfig: orderField ? [{ fieldId: orderField, order }] : [],
  defaultDataSource: {
    customStashOptions: [],
    complexType: 'relate',
    options: [],
    formula: relateExpr,
    url: '',
    value: '',
    searchConfig: { dataType: 'JSONP' },
  },
};

const childProps = {
  dataSourceType: 'linkage',
  dataSource: [],
  filterLocal: true,
  remote: '',
  relate: '',
  relateAppType: '',
  relateOrderEnable: false,
  relateOrderConfig: [],
  searchConfig: '',
  dataSourceLinkage: {
    data: linkageData,
    event: linkageEvent,
  },
  defaultDataSource: {
    customStashOptions: [],
    complexType: 'linkage',
    options: [],
    formula: {
      data: linkageData,
      event: linkageEvent,
    },
    url: '',
    value: '',
    searchConfig: { dataType: 'JSONP' },
  },
};

const patch = [
  {
    action: 'field-props',
    fieldId: parent,
    props: parentProps,
  },
  {
    action: 'field-props',
    fieldId: child,
    props: childProps,
  },
];

fs.writeFileSync(outputPath, JSON.stringify(patch, null, 2));
console.log(`Wrote ${outputPath}`);
