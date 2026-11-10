/* Isolated tests: never send writes to the deployed backend. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ts = require('typescript');
const source = file => fs.readFileSync(file, 'utf8');
function compile(code) { return ts.transpileModule(code.replace(/import\s[\s\S]*?from\s*['"][^'"]+['"];?/g, ''), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText; }
function moduleOf(file, mocks = {}) { const ctx = { exports: {}, Error, Date, URL, ...mocks }; vm.runInNewContext(compile(source(file)), ctx); return ctx.exports; }
const values = new Map();
const storage = { getStorageSync: k => values.get(k), setStorageSync: (k, v) => values.set(k, v), removeStorageSync: k => values.delete(k), reLaunch: o => values.set('redirect', o.url) };
let response, verificationRequest;
class RequestError extends Error { constructor(message, status) { super(message); this.statusCode = status; } }
const coordinates = moduleOf('src/utils/inspection-coordinates.ts');
const times = moduleOf('src/utils/inspection-time.ts');
const qrImages = moduleOf('src/utils/inspection-qr-image.ts', { URLSearchParams });
const api = moduleOf('src/api/inspection-points.ts', { ...coordinates, RequestError, http: { get: async () => { if (response instanceof Error) throw response; return response; }, post: async (url, data) => { verificationRequest = data; return response; } } });
const utils = moduleOf('src/utils/inspection-check-in.ts', { uni: storage });
const point = { id: '101', code: 'XJ001', name: '主坝坝顶', area: '主坝', location: '主坝坝顶', enabled: true, latitude: 28.669289, longitude: 102.193071, coordinateSystem: 'WGS84' };
const valid = () => ({ point: { ...point }, checkInProof: 'server-proof', checkInTime: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() });
async function serviceTests() {
  response = [point]; assert.equal((await api.getInspectionPoints())[0].id, '101');
  response = valid(); assert.equal((await api.verifyInspectionPoint('code', '101')).point.id, '101'); assert.equal(verificationRequest.expectedPointId, '101');
  response = valid(); await assert.rejects(api.verifyInspectionPoint('code', '102'), /点位不匹配/);
  response = valid(); response.point.enabled = false; await assert.rejects(api.verifyInspectionPoint('code'), /停用/);
  response = valid(); response.expiresAt = new Date(0).toISOString(); await assert.rejects(api.verifyInspectionPoint('code'), /过期/);
  response = valid(); response.checkInProof = ''; await assert.rejects(api.verifyInspectionPoint('code'), /凭证/);
  response = valid(); delete response.point.latitude; await assert.rejects(api.verifyInspectionPoint('code'), /预设经纬度/);
  response = valid(); response.point.latitude = 91; await assert.rejects(api.verifyInspectionPoint('code'), /有效范围/);
  for (const system of [undefined, null, '', ' ', 'wgs84']) {
    response = valid(); response.point.coordinateSystem = system; assert.equal((await api.verifyInspectionPoint('code')).point.coordinateSystem, 'WGS84');
  }
  response = valid(); response.point.coordinateSystem = 'GCJ02'; await assert.rejects(api.verifyInspectionPoint('code'), /WGS84 不一致/);
  response = valid(); response.point.latitude = '28.669289'; response.point.longitude = '102.193071'; assert.equal((await api.verifyInspectionPoint('code')).point.longitude, 102.193071);
  response = { id: '101' }; await assert.rejects(api.getInspectionPoints(), /格式/);
  assert.equal(api.pointError(new RequestError('404', 404)), api.POINT_SERVICE_MESSAGE);
  assert.match(api.pointError(new RequestError('403', 403)), /无权访问/);
  response = new RequestError('数据操作失败，请稍后重试', 500); await assert.rejects(api.getInspectionPoints(), /数据操作失败/);
}
function contextTests() {
  values.set('daqiao-current-user', { username: 'alice' }); utils.setExpectedPoint(point); assert.equal(utils.getExpectedPoint().id, '101');
  values.set('daqiao-current-user', { username: 'bob' }); assert.equal(utils.getExpectedPoint(), undefined);
  utils.keepScanReturn('a&b'); assert.equal(utils.resumeScanReturn(), true); assert.equal(values.get('redirect'), '/pages/inspection/check-in?code=a%26b');
  utils.acceptVerification(valid()); assert.equal(utils.takeVerification().point.id, '101'); assert.equal(utils.takeVerification(), undefined);
  utils.clearInspectionCheckIn(); assert.equal(utils.resumeScanReturn(), false);
}
function pageHarness({ failedSave = false, failedPhoto = false, existingRecord, failPhotoAt = 1, scan = true, savedDraft, confirmScan = true, scanVerifier, serverPhotosMissing = false, missingSaveId = false } = {}) {
  let posts = 0, puts = 0, uploads = 0, navigations = 0, release, load, show, hide, unload, clockNow, lastPayload, failOnce = failedPhoto;
  const intervals = new Map(), imageRequests = [];
  let serverPhotos = [...(existingRecord?.photoPaths || [])];
  let intervalId = 0;
  class PageDate extends Date {
    constructor(...args) { if (args.length) super(...args); else super(clockNow ?? Date.now()); }
    static now() { return clockNow ?? Date.now(); }
  }
  const gate = new Promise(resolve => { release = resolve; }), timers = [], toasts = [], modals = [], attempts = [], draftSaves = [], scanRequests = [];
  async function uploadPhotos(id, paths, onUploaded) {
    for (const path of paths) {
      uploads++; attempts.push({ id: String(id), path }); await gate;
      if (failOnce && uploads === failPhotoAt) { failOnce = false; throw Error('photo failed'); }
      serverPhotos.push(`/image/${id}/${path}.jpg`);
      onUploaded?.(path);
    }
  }
  const records = moduleOf('src/api/inspection.ts', { ...coordinates, http: {
    post: async (url, payload) => { posts++; lastPayload = payload; if (failedSave) throw Error('save failed'); return missingSaveId ? {} : { id: 201 }; },
    put: async (url, payload) => { puts++; lastPayload = payload; serverPhotos = [...payload.photoPaths]; return null; },
    get: async () => ({ ...(existingRecord || { id: 201 }), photoPaths: serverPhotosMissing ? [] : serverPhotos })
  }, uploadInspectionPhotos: uploadPhotos });
  const code = source('src/pages/inspection/execute.vue').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
  const ctx = { exports: {}, Error, Date: PageDate, ...coordinates, ...times, ...records, uploadInspectionPhotos: uploadPhotos, getExpectedPoint: () => undefined, takeVerification: () => scan ? { ...valid(), checkInTime: '2026-10-01T09:00:00+08:00' } : undefined,
    keepScanReturn: utils.keepScanReturn, clearScanReturn: utils.clearScanReturn,
    ...qrImages, verifyInspectionPoint: async (code, expectedPointId) => { scanRequests.push({ code, expectedPointId }); return scanVerifier ? scanVerifier(code, expectedPointId) : { ...valid(), expectedPointId }; },
    getInspectionPoints: async () => [], pointError: e => e.message,
    ref: value => ({ value }), reactive: v => v, computed: fn => ({ get value() { return fn(); } }), onLoad: fn => { load = fn; }, onShow: fn => { show = fn; }, onHide: fn => { hide = fn; }, onUnload: fn => { unload = fn; },
    setInterval: fn => { intervals.set(++intervalId, fn); return intervalId; }, clearInterval: id => intervals.delete(id),
    useAuthStore: () => ({ displayName: 'tester' }), useInspectionDraftStore: () => ({ get: () => savedDraft || ({ taskId: '', result: '', remark: '', photos: [] }), save: v => draftSaves.push(v), remove: () => {} }),
    setExpectedPoint: () => {}, setTimeout: (fn, delay) => { timers.push({ fn, delay }); return 1; }, clearTimeout: () => {}, uni: { chooseImage: options => imageRequests.push(options), getStorageSync: storage.getStorageSync, setNavigationBarTitle: () => {}, showToast: o => toasts.push(o), showModal: o => { modals.push(o); if (o.title === '点位核验通过') o.success({ confirm: confirmScan }); }, switchTab: () => { navigations++; } } };
  vm.runInNewContext(compile(code + '\nexport const test = { submit, draft, verified, expected, inspectionItem, checkPosition, inspectionType, loading, submitted, submitting, inspectionTime, inspectionTimeUserEdited, inspector, savedRecordId, formLocked, uploadedLocalPhotos, photoUploadError, changeInspectionDate, changeInspectionClock, useCurrentInspectionTime, verifyScannedQr, scanPoint, scanning, choosePhoto };'), ctx);
  const test = ctx.exports.test; test.loading.value = false; test.inspectionItem.value = '主坝巡检'; test.checkPosition.value = point.location;
  Object.assign(test.draft, { result: 'NORMAL', photos: ['local-photo'] });
  test.inspectionTime.value = '2026-11-05T09:00:00+08:00';
  return { test, timers, toasts, modals, attempts, draftSaves, scanRequests, imageRequests, intervals, release, setNow: now => { clockNow = now; }, show: () => show(), hide: () => hide(), unload: () => unload(), tick: () => { for (const fn of Array.from(intervals.values())) fn(); }, load: options => load(options), payload: () => lastPayload, counts: () => ({ posts, puts, uploads, navigations }) };
}
async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
async function submitTests() {
  const h = pageHarness(); await h.test.submit(); assert.equal(h.counts().posts, 0, 'Unverified form must never save');
  h.test.verified.value = valid(); const first = h.test.submit(); await flush(); await h.test.submit(); assert.equal(h.counts().posts, 1); assert.equal(h.counts().uploads, 1);
  h.release(); await first; await h.test.submit(); assert.equal(h.counts().posts, 1); assert.equal(h.test.submitted.value, true); assert.equal(h.toasts.at(-1).title, '提交成功'); assert.equal(h.timers[0].delay, 800); h.timers[0].fn(); assert.equal(h.counts().navigations, 1);
  const expired = pageHarness(); expired.test.verified.value = valid(); expired.test.verified.value.expiresAt = new Date(0).toISOString(); await expired.test.submit(); assert.equal(expired.counts().posts, 0);
  const partial = pageHarness({ failedPhoto: true, failPhotoAt: 2 }); partial.test.verified.value = valid(); partial.test.draft.photos = ['first-photo', 'failed-photo', 'third-photo'];
  const p = partial.test.submit(); await flush(); partial.release(); await p;
  assert.equal(partial.test.savedRecordId.value, '201'); assert.equal(partial.test.submitted.value, false); assert.equal(partial.test.formLocked.value, true);
  assert.deepEqual(Array.from(partial.test.draft.photos), ['failed-photo', 'third-photo']); assert.equal(partial.timers.length, 0);
  partial.test.verified.value = undefined; await partial.test.submit();
  assert.equal(partial.counts().posts, 1); assert.equal(partial.counts().puts, 0); assert.equal(partial.test.submitted.value, true);
  assert.equal(partial.attempts.filter(a => a.path === 'first-photo').length, 1); assert.ok(partial.attempts.every(a => a.id === '201'));
  const failed = pageHarness({ failedSave: true }); failed.test.verified.value = valid(); await failed.test.submit(); assert.equal(failed.test.submitting.value, false); assert.equal(failed.test.submitted.value, false);
}
async function formTests() {
  for (const scan of [false, true]) {
    const fresh = pageHarness({ scan }); const before = Date.now(); await fresh.load({}); const after = Date.now();
    assert.ok(Date.parse(fresh.test.inspectionTime.value) >= before && Date.parse(fresh.test.inspectionTime.value) <= after, 'New inspection must default to the current time, not check-in time');
    assert.ok(times.inspectionTimeParts(fresh.test.inspectionTime.value).date);
  }
  const restored = pageHarness({ savedDraft: { taskId: '', result: '', remark: '', photos: [], inspectionTime: '2026-11-01T10:20:00+08:00', inspectionTimeUserEdited: true } });
  await restored.load({}); assert.equal(restored.test.inspectionTime.value, '2026-11-01T10:20:00+08:00');
  const h = pageHarness(); h.test.verified.value = valid(); h.release();
  h.test.checkPosition.value = '用户补充的检查部位';
  h.test.changeInspectionDate({ detail: { value: '2026-11-06' } }); h.test.changeInspectionClock({ detail: { value: '15:25' } });
  await h.test.submit(); assert.equal(h.payload().checkPosition, '用户补充的检查部位'); assert.equal(h.payload().inspectionTime, '2026-11-06T15:25:00+08:00');
  assert.equal(h.payload().checkInTime, h.test.verified.value.checkInTime);
  const original = { id: 17, inspectionItem: '旧记录', checkPosition: '旧位置', inspectionType: '日常巡检', inspectionTime: '2026-10-09T06:53:29.376', inspector: 'original-inspector', coordinate: '', result: '正常', photoPaths: [] };
  const edit = pageHarness({ existingRecord: original }); await edit.load({ id: '17' }); await edit.test.submit();
  assert.equal(edit.counts().puts, 0, 'Legacy records without photos must be supplemented before completion');
  edit.test.draft.photos = ['supplement']; edit.release(); await edit.test.submit();
  assert.equal(edit.counts().posts, 0); assert.equal(edit.counts().puts, 1); assert.equal(edit.payload().inspector, original.inspector); assert.equal(edit.payload().inspectionTime, original.inspectionTime); assert.equal(edit.payload().coordinate, '');
  assert.equal(edit.payload().pointId, undefined); assert.equal(edit.payload().checkInProof, undefined); assert.equal(edit.payload().checkInTime, undefined);
}
async function payloadTests() {
  let posted, updated;
  const records = moduleOf('src/api/inspection.ts', { ...coordinates, uploadInspectionPhotos: async () => {}, http: { post: async (url, data) => { posted = data; return { id: '201' }; }, put: async (url, data) => { updated = data; return { id: data.id }; } } });
  const business = { inspectionItem: '主坝巡检', checkPosition: point.location, result: 'NORMAL', inspector: 'tester', photoPaths: [] };
  await assert.rejects(records.saveInspection(business), /核验/); assert.equal(posted, undefined);
  const qrBusiness = { ...business, pointId: '101', expectedPointId: '101', checkInMethod: 'QR_CODE', checkInProof: 'server-proof', checkInTime: '2026-11-03T09:00:00+08:00' };
  await assert.rejects(records.saveInspection(qrBusiness), /预设经纬度/); assert.equal(posted, undefined);
  const qrCoordinates = { pointLatitude: point.latitude, pointLongitude: point.longitude };
  await assert.rejects(records.saveInspection({ ...qrBusiness, ...qrCoordinates }), /现场照片/); assert.equal(posted, undefined);
  await assert.rejects(records.saveInspection({ ...qrBusiness, ...qrCoordinates, photoPaths: ['foreign.jpg'], attachmentLocalPaths: [null, ''] }), /现场照片/); assert.equal(posted, undefined);
  await records.saveInspection({ ...qrBusiness, ...qrCoordinates, attachmentLocalPaths: ['local-photo'], photoPaths: ['foreign.jpg'], coordinate: '伪造的旧草稿坐标' });
  assert.equal(posted.photoPaths.length, 0, 'New record must not claim existing foreign photos');
  assert.equal(posted.coordinate, '28.669289,102.193071'); assert.equal(posted.pointLatitude, 28.669289); assert.equal(posted.pointLongitude, 102.193071); assert.equal(posted.coordinateSource, 'POINT_PRESET'); assert.equal(posted.coordinateSystem, 'WGS84'); assert.equal(posted.pointId, '101'); assert.equal(posted.checkInProof, 'server-proof'); assert.equal(posted.result, '正常');
  await assert.rejects(records.updateInspection({ ...business, id: 'old-id' }), /现场照片/); assert.equal(updated, undefined);
  await records.updateInspection({ ...business, id: 'old-id', coordinate: '', photoPaths: ['old.jpg'] }); assert.equal(updated.id, 'old-id'); assert.equal(updated.coordinate, ''); assert.equal(updated.checkInProof, undefined);
  let readPath, listParams;
  const listApi = moduleOf('src/api/inspection.ts', { ...coordinates, listOf: x => x, http: { get: async (url, params) => { readPath = url; listParams = params; return url.endsWith('/201') ? { id: 201, photoPaths: ['saved.jpg'] } : []; } } });
  await listApi.getInspections('101'); assert.equal(readPath, '/get/inspections'); assert.equal(listParams.pointId, '101');
  await listApi.getInspections(); assert.equal(listParams, undefined);
  const detail = await listApi.getInspection(201); assert.equal(readPath, '/get/inspections/201'); assert.equal(detail.photoPaths[0], 'saved.jpg');
}
async function photoUtilityTests() {
  let uploadCount = 0; const completed = [];
  const photos = moduleOf('src/utils/photos.ts', { API_BASE_URL: 'http://test.invalid', authHeaders: () => ({}), AbortController, setTimeout, clearTimeout,
    FormData: class { append() {} },
    fetch: async url => String(url).startsWith('http:') ? { status: ++uploadCount === 2 ? 500 : 200, text: async () => '{}' } : { ok: true, blob: async () => ({ type: 'image/png' }) },
    decodeResponse: status => { if (status !== 200) throw Error('upload failed'); return {}; }
  });
  await assert.rejects(photos.uploadInspectionPhotos(201, ['a', 'b', 'c'], p => completed.push(p)), /upload failed/);
  assert.deepEqual(completed, ['a']);
  await photos.uploadInspectionPhotos(201, ['b', 'c'], p => completed.push(p)); assert.deepEqual(completed, ['a', 'b', 'c']); assert.equal(uploadCount, 4);
}
function timeTests() {
  assert.equal(times.inspectionTimeParts('2026-11-05T01:02:03Z').time, '09:02');
  assert.equal(times.inspectionTimeParts('2026-11-05T23:30:00Z').date, '2026-11-06');
  assert.equal(times.inspectionTimeParts('2026-10-09T06:53:29.376').time, '06:53');
  assert.equal(times.inspectionTimeValue('2026-11-05', '12:20'), '2026-11-05T12:20:00+08:00');
  assert.throws(() => times.inspectionTimeValue('2026-02-30', '12:20')); assert.throws(() => times.inspectionTimeValue('2026-11-05', '24:30'));
}
async function scanPageTests() {
  let load, called = 0;
  const code = source('src/pages/inspection/check-in.vue').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
  const ctx = { exports: {}, Error, Date, ref: value => ({ value }), onLoad: fn => { load = fn; }, useAuthStore: () => ({ isAuthenticated: false }), keepScanReturn: utils.keepScanReturn, pointError: e => e.message, uni: storage, verifyInspectionPoint: async () => { called++; return valid(); } };
  vm.runInNewContext(compile(code), ctx); load({ code: 'valid-code' }); assert.equal(values.get('redirect'), '/pages/login/index'); assert.equal(called, 0); assert.equal(utils.resumeScanReturn(), true); assert.equal(values.get('redirect'), '/pages/inspection/check-in?code=valid-code');
}
function coordinateTests() {
  for (const latitude of [undefined, null, '', ' ', '0x10', 'NaN', NaN, Infinity, 91, -91]) assert.throws(() => coordinates.pointPresetCoordinates({ ...point, latitude }));
  for (const longitude of [undefined, null, '', ' ', 181, -181]) assert.throws(() => coordinates.pointPresetCoordinates({ ...point, longitude }));
  assert.equal(coordinates.pointPresetCoordinates({ latitude: 0, longitude: 0, coordinateSystem: 'WGS84' }).coordinate, '0,0');
  for (const system of [undefined, null, '', ' ', 'wgs84', ' WGS84 ']) {
    assert.equal(coordinates.pointPresetCoordinates({ ...point, coordinateSystem: system }).coordinateSystem, 'WGS84');
  }
  assert.throws(() => coordinates.pointPresetCoordinates({ ...point, coordinateSystem: 'CGCS2000' }), /WGS84 不一致/);
  assert.equal(coordinates.coordinateSystemLabel('CGCS2000'), 'CGCS2000（2000国家大地坐标系）');
  assert.throws(() => coordinates.pointPresetCoordinates({ ...point, coordinateSystem: 'UNKNOWN' }));
}
async function imageScanTests() {
  const camera = pageHarness({ scan: false }); camera.test.scanPoint();
  assert.equal(camera.imageRequests.length, 1); assert.deepEqual(Array.from(camera.imageRequests[0].sourceType), ['camera']); assert.equal(camera.imageRequests[0].count, 1);
  camera.imageRequests[0].fail({ errMsg: 'chooseImage:fail cancel' }); assert.equal(camera.test.scanning.value, false);
  const link = 'http://10.0.0.1:8135/app/#/pages/inspection/check-in?code=a%26b';
  assert.equal(qrImages.inspectionCodeFromQr(link), 'a&b');
  for (const text of ['hello', 'javascript:alert(1)', 'https://example.com/#/other?code=x', 'http://10.0.0.1/#/pages/inspection/check-in?code=', 'http://10.0.0.1/#/pages/inspection/check-in?code=a&code=b']) assert.throws(() => qrImages.inspectionCodeFromQr(text));
  await assert.rejects(qrImages.readInspectionQrImage('blob:test'), /当前环境不支持/);
  const h = pageHarness(); h.test.expected.value = point; h.test.inspectionItem.value = '已填写项目'; h.test.checkPosition.value = '已填写检查部位'; h.test.draft.remark = '保留说明'; const originalTime = h.test.inspectionTime.value;
  await h.test.verifyScannedQr(link);
  assert.equal(h.scanRequests[0].code, 'a&b'); assert.equal(h.scanRequests[0].expectedPointId, '101'); assert.equal(h.test.verified.value.point.id, '101');
  assert.equal(h.test.inspectionItem.value, '已填写项目'); assert.equal(h.test.checkPosition.value, '已填写检查部位'); assert.equal(h.test.draft.remark, '保留说明'); assert.equal(h.test.draft.photos.length, 1); assert.equal(h.test.inspectionTime.value, originalTime);
  assert.equal(utils.resumeScanReturn(), false);
  const cancelled = pageHarness({ confirmScan: false }); await cancelled.test.verifyScannedQr(link); assert.equal(cancelled.test.verified.value, undefined);
  const failed = pageHarness({ scanVerifier: async () => { throw Error('点位不匹配'); } }); await assert.rejects(failed.test.verifyScannedQr(link), /点位不匹配/); assert.equal(failed.test.verified.value, undefined);
  let canvas;
  const imageReader = moduleOf('src/utils/inspection-qr-image.ts', { URLSearchParams, setTimeout, clearTimeout,
    Image: class { naturalWidth=1000; naturalHeight=700; set src(value) { if (value) Promise.resolve().then(() => this.onload?.()); } },
    document: { createElement: () => (canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }) }) }) },
    jsQR: () => ({ data: link })
  });
  assert.equal(await imageReader.readInspectionQrImage('blob:test'), link); assert.equal(canvas.width, 0);
}
async function liveTimeTests() {
  const h = pageHarness({ scan: false, savedDraft: { taskId: '', result: '', remark: '', photos: [], inspectionTime: '2026-11-05T00:00:00+08:00' } });
  h.setNow(Date.parse('2026-11-05T08:28:00Z')); await h.load({}); h.show();
  assert.equal(times.inspectionTimeParts(h.test.inspectionTime.value).time, '16:28');
  h.setNow(Date.parse('2026-11-05T08:29:00Z')); h.tick(); assert.equal(times.inspectionTimeParts(h.test.inspectionTime.value).time, '16:29');
  h.test.changeInspectionClock({ detail: { value: '15:10' } }); assert.equal(h.test.inspectionTimeUserEdited.value, true);
  h.setNow(Date.parse('2026-11-05T08:32:00Z')); h.tick(); assert.equal(times.inspectionTimeParts(h.test.inspectionTime.value).time, '15:10');
  h.test.useCurrentInspectionTime(); assert.equal(times.inspectionTimeParts(h.test.inspectionTime.value).time, '16:32');
  h.hide(); assert.equal(h.intervals.size, 0); h.setNow(Date.parse('2026-11-05T09:00:00Z')); h.show(); assert.equal(times.inspectionTimeParts(h.test.inspectionTime.value).time, '17:00');
  h.unload(); assert.equal(h.intervals.size, 0);
}
async function mandatoryPhotoTests() {
  const empty = pageHarness(); empty.test.verified.value = valid(); empty.test.draft.photos = []; await empty.test.submit();
  assert.equal(empty.counts().posts, 0); assert.equal(empty.test.submitted.value, false); assert.match(empty.toasts.at(-1).title, /照片/);
  const failed = pageHarness({ failedPhoto: true }); failed.test.verified.value = valid(); const first = failed.test.submit(); await flush(); failed.release(); await first;
  assert.equal(failed.test.submitted.value, false); assert.equal(failed.timers.length, 0);
  failed.test.draft.photos = []; await failed.test.submit(); assert.equal(failed.test.submitted.value, false); assert.equal(failed.counts().posts, 1);
  failed.test.draft.photos = ['replacement']; await failed.test.submit(); assert.equal(failed.test.submitted.value, true); assert.equal(failed.counts().posts, 1);
  const missing = pageHarness({ serverPhotosMissing: true }); missing.test.verified.value = valid(); missing.release(); await missing.test.submit();
  assert.equal(missing.test.submitted.value, false); assert.equal(missing.timers.length, 0); assert.match(missing.test.photoUploadError.value, /服务器尚未关联/);
  await missing.test.submit(); assert.equal(missing.counts().posts, 1); assert.equal(missing.test.submitted.value, false);
  const camera = pageHarness(); camera.test.choosePhoto(); assert.deepEqual(Array.from(camera.imageRequests[0].sourceType), ['camera']);
  const missingId = pageHarness({ missingSaveId: true }); missingId.test.verified.value = valid(); await missingId.test.submit();
  assert.equal(missingId.test.submitted.value, false); assert.equal(missingId.timers.length, 0);
  await missingId.test.submit(); assert.equal(missingId.counts().posts, 1); assert.match(missingId.modals.at(-1).title, /记录已保存/);
  const records = moduleOf('src/api/inspection.ts');
  for (const paths of [[], null, [null], ['', ' ']]) assert.equal(records.hasInspectionPhotos(paths), false);
  assert.equal(records.hasInspectionPhotos(['saved.jpg']), true);
  const indexCode = source('src/pages/inspection/index.vue').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
  const ctx = { exports: {}, ...records, ref: value => ({ value }), computed: fn => ({ get value() { return fn(); } }), onShow: () => {} };
  vm.runInNewContext(compile(indexCode + '\nexport const test = { done, statusText };'), ctx);
  assert.equal(ctx.exports.test.done({ result: '正常', photoPaths: [] }), false); assert.equal(ctx.exports.test.statusText({ result: '正常', photoPaths: [] }), '待补照片');
  assert.equal(ctx.exports.test.done({ result: '正常', photoPaths: ['saved.jpg'] }), true);
}
(async () => { coordinateTests(); timeTests(); await serviceTests(); contextTests(); await submitTests(); await formTests(); await payloadTests(); await photoUtilityTests(); await scanPageTests(); await imageScanTests(); await liveTimeTests(); await mandatoryPhotoTests(); console.log('PASS: mandatory camera photos, no-photo save/update blocked, server association required for success, failed-photo removal cannot bypass completion, same-record retry, pending-photo list status, QR/time/history regressions.'); })().catch(e => { console.error(e); process.exitCode = 1; });
