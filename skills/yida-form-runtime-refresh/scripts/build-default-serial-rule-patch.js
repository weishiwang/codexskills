#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage() {
  console.error(`Usage:
  node build-default-serial-rule-patch.js --app APP_XXX --form FORM-XXX --corp dingXXX --field serialNumberField_xxx --form-name "Purchase Order" --out patch.json

Options:
  --prefix PREFIX       Explicit serial prefix. Required for non-ASCII form names.
  --digits N            Sequence digit count. Default: 4.
  --reset PERIOD        noClean|day|month|year. Default: day.
  --date-format FORMAT  Default: yyyyMMdd.
  --start N             Initial sequence value. Default: 1.
  --out PATH            Write patch JSON to PATH. If omitted, prints to stdout.`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      usage();
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      usage();
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function requireArg(args, key) {
  const value = args[key];
  if (!value) {
    console.error(`Missing required option: --${key}`);
    usage();
  }
  return value;
}

function positiveInt(value, fallback, name) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function validateResetPeriod(value) {
  const period = value || 'day';
  if (!['noClean', 'day', 'month', 'year'].includes(period)) {
    throw new Error('--reset must be one of: noClean, day, month, year.');
  }
  return period;
}

function normalizePrefix(prefix) {
  const normalized = String(prefix || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!normalized) {
    throw new Error('Serial prefix is empty after normalization.');
  }
  return normalized;
}

function inferPrefix(formName) {
  if (!/^[\x00-\x7F]+$/.test(formName)) {
    throw new Error('Non-ASCII form names require --prefix. Do not guess pinyin initials.');
  }
  const words = formName.match(/[A-Za-z0-9]+/g) || [];
  if (words.length === 0) {
    throw new Error('Cannot infer prefix from form name; pass --prefix.');
  }
  return normalizePrefix(words.map((word) => word[0]).join(''));
}

function sidSuffix(prefix, kind) {
  const base = `${prefix}_${kind}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return base.slice(0, 40);
}

function serialRuleItem(ruleType, suffix, options) {
  return {
    resetPeriod: options.resetPeriod,
    dateFormat: options.dateFormat,
    ruleType,
    timeZone: '+8',
    __sid: `item_${suffix}`,
    __hide_delete__: ruleType === 'autoCount',
    __sid__: `serial_${suffix}`,
    digitCount: options.digits,
    isFixed: true,
    initialValue: options.start,
    content: options.content || '',
    formField: '',
    isFixedTips: '',
    resetPeriodTips: '',
  };
}

function buildRule(prefix, options) {
  return [
    serialRuleItem('character', sidSuffix(prefix, 'prefix'), {
      ...options,
      content: prefix,
    }),
    serialRuleItem('date', sidSuffix(prefix, 'date'), options),
    serialRuleItem('autoCount', sidSuffix(prefix, 'auto'), options),
  ];
}

function buildFormula(corpId, appType, formUuid, fieldId, serialNumberRule) {
  const ruleJson = JSON.stringify({ type: 'custom', value: serialNumberRule });
  const escapedRuleJson = ruleJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return {
    expression: `SERIALNUMBER("${corpId}", "${appType}", "${formUuid}", "${fieldId}", "${escapedRuleJson}")`,
  };
}

function preview(prefix, dateFormat, digits, start) {
  const datePreviewByFormat = {
    yy: '26',
    yyyy: '2026',
    yyyyMM: '202606',
    yyyyMMdd: '20260630',
  };
  const datePart = datePreviewByFormat[dateFormat] || dateFormat;
  return `${prefix}${datePart}${String(start).padStart(digits, '0')}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const appType = requireArg(args, 'app');
  const formUuid = requireArg(args, 'form');
  const corpId = requireArg(args, 'corp');
  const fieldId = requireArg(args, 'field');
  const formName = requireArg(args, 'form-name');
  const prefix = normalizePrefix(args.prefix || inferPrefix(formName));
  const digits = positiveInt(args.digits, 4, '--digits');
  const start = positiveInt(args.start, 1, '--start');
  const resetPeriod = validateResetPeriod(args.reset);
  const dateFormat = args['date-format'] || 'yyyyMMdd';

  const serialNumberRule = buildRule(prefix, {
    dateFormat,
    digits,
    resetPeriod,
    start,
  });
  const patch = [
    {
      action: 'field-props',
      fieldId,
      props: {
        serialNumberRule,
        serialNumPreview: preview(prefix, dateFormat, digits, start),
        serialNumReset: start,
        syncSerialConfig: false,
        formula: buildFormula(corpId, appType, formUuid, fieldId, serialNumberRule),
      },
    },
  ];

  const output = `${JSON.stringify(patch, null, 2)}\n`;
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, output, 'utf8');
  } else {
    process.stdout.write(output);
  }
}

try {
  main();
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
