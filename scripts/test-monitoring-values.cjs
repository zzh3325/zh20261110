// Offline value regression: no requests to the production API.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file, mocks = {}) {
  const text = fs.readFileSync(file, 'utf8').replace(/import\s[^;\n]*from\s*['"][^'"]+['"];?/g, '');
  const ctx = { exports: {}, parseApiJson: JSON.parse, ...mocks };
  vm.runInNewContext(ts.transpileModule(text.replace(/import\.meta\.env/g, '({})'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, ctx);
  return ctx.exports;
}
const helpers = load('src/utils/monitoring-values.ts');
const web = load('src/api/business-monitoring.ts', helpers);
const browser = load('src/api/data-browser.ts', helpers);
const pcRoot = '../DaQiaoReservoir-main1109/DaQiaoReservoir-main/src';
const pc = load(`${pcRoot}/api/data/onlineMonitoring/daqiaoRecdata.ts`);
const pcFormatter = load(`${pcRoot}/utils/formatMonitorValue.ts`);
for (const key of ['horizontal', 'settlement', 'joint', 'temperature']) {
  const category = { key, kind: 'rec' };
  for (const row of [{ data1: 248.42, calc1: 999, yqcz1: 17 }, { data1: 0, value: 8 }, { data1: null, value: '12.34' }, { data1: -3.25 }, { data1: 'bad' }, {}]) {
    assert.equal(web.metricValue(category, row, 'value'), pc.getDaqiaoData1Value(row, key === 'temperature'));
  }
}
const pressure = { key: 'pressure', kind: 'sensor' };
assert.equal(web.metricValue(pressure, { resultData: JSON.stringify({ '水位': 1234.56 }) }, '水位'), 1.2346);
assert.equal(web.metricValue(pressure, { resultData: { '水位高程': 2015.6 } }, '水位高程'), 2015.6);
assert.equal(web.metricValue(pressure, { resultData: { '水压': 22 } }, '水压'), 22);
assert.equal(web.metricValue(pressure, { resultData: {} }, '水位'), null);
const gnss = { key: 'gnss', kind: 'gnss' };
for (const row of [{ x: 0, dx: 9 }, { dx: 0 }, { deltaX: 0 }, { dispX: 0 }]) assert.equal(web.metricValue(gnss, row, 'dx'), 0);
assert.equal(web.metricValue(gnss, { x: '0.0123456', dx: 2 }, 'dx'), 12.346);
assert.equal(web.metricValue(gnss, { deltaY: -0.002 }, 'dy'), -2);
assert.equal(web.metricValue(gnss, { dispZ: '' }, 'dz'), null);
for (const key of ['dx', 'dy', 'dz']) assert.equal(web.metricsFor(gnss).find(m => m.key === key).unit, 'mm');
const total = { kind: 'total' };
assert.equal(web.metricValue(total, { dx: 0.001 }, 'dx'), 1);
assert.equal(web.metricValue(total, { DY: '-0.002' }, 'dy'), -2);
assert.equal(web.metricValue(total, { dz: null }, 'dz'), null);
assert.equal(web.metricValue(total, { dz: 0 }, 'dz'), 0);
for (const metric of web.metricsFor(total)) assert.equal(metric.unit, 'mm');
assert.equal(web.metricValue({ kind: 'sqdb' }, { rz: 2015.6 }, 'RZ'), 2015.6);
assert.equal(web.metricValue({ kind: 'meteo' }, { resultValue: { '温度': 0 } }, '温度'), 0);
assert.equal(web.metricValue({ kind: 'meteo' }, { resultValue: {} }, '温度'), null);
const history = browser.displayFields({ dx: 0.0123456, DY: 0, dz: null, currentZ: 2015.625 }, 'totalData');
assert.equal(history.find(f => f.key === 'dx').label, 'dX (mm)');
assert.equal(history.find(f => f.key === 'dx').value, '12.346');
assert.equal(history.find(f => f.key === 'DY').value, '0');
assert.equal(history.find(f => f.key === 'dz').value, '未提供');
assert.equal(history.find(f => f.key === 'currentZ').value, '2015.625');
const flow = { kind: 'sensor', key: 'flow' };
const weather = { kind: 'meteo', key: 'weather' };
for (const [category, row, key, shown] of [
  [pressure, { resultData: { 水位: 1234.54999 } }, '水位', '1.2346'],
  [pressure, { resultData: { 水位高程: 2015.6 } }, '水位高程', '2015.6'],
  [pressure, { resultData: { 水压: 0 } }, '水压', '0'],
  [flow, { resultData: { 流量: 0.0000123456 } }, '流量', '0'],
  [flow, { resultData: { 流量: 0.01234567 } }, '流量', '0.0123'],
  [weather, { resultValue: { 气压: 793.901234 } }, '气压', '793.9012'],
  [weather, { resultValue: { 温度: -2.123456 } }, '温度', '-2.1235'],
  [{ sttp: 'ZZ', kind: 'sqdb' }, { TGTQ: 12.340056 }, 'tgtq', '12.3401'],
  [flow, { resultData: { 流量: '' } }, '流量', '--']
]) {
  const value = web.metricValue(category, row, key);
  assert.equal(helpers.formatMonitorValue(value), shown);
  if (value !== null) assert.equal(helpers.formatMonitorValue(value), pcFormatter.formatMonitorValue(value));
}
const gate = { SWCHRCD: ' 001 ', supwptn: 0, SDWWPTN: '05', MSQMT: '超声波', TM: '2026-11-09T10:00:00' };
assert.deepEqual(Array.from(web.gateHistoryFields, field => web.gateHistoryValue(gate, field.key)), ['001', '0', '05', '超声波']);
assert.equal(web.gateHistoryValue({ msqmt: ' ' }, 'msqmt'), '未提供');
assert.equal(web.recordTime(gate), gate.TM);
console.log('PASS: PC 11-09 precision parity, gate history fields, pressure conversion, GNSS aliases and displacement units.');
