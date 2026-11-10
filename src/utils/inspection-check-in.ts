import type { PointVerification, InspectionPoint } from '@/api/inspection-points'

const RETURN_KEY = 'daqiao-inspection-scan-return'
const EXPECTED_KEY = 'daqiao-inspection-expected-point'
let verification: PointVerification | undefined
const TWO_HOURS = 2 * 60 * 60 * 1000
function username(): string { return String(uni.getStorageSync('daqiao-current-user')?.username || '') }
export function setExpectedPoint(point?: InspectionPoint) {
  if (!point) { uni.removeStorageSync(EXPECTED_KEY); return }
  uni.setStorageSync(EXPECTED_KEY, { point, username: username(), expires: Date.now() + TWO_HOURS })
}
export function getExpectedPoint(): InspectionPoint | undefined {
  const saved = uni.getStorageSync(EXPECTED_KEY)
  if (saved && saved.username === username() && saved.expires > Date.now() && saved.point?.id) return saved.point
  return undefined
}
export function keepScanReturn(code: string) {
  if (!code || code.length > 2048) throw new Error('二维码链接无效')
  uni.setStorageSync(RETURN_KEY, { code, expires: Date.now() + TWO_HOURS })
}
export function resumeScanReturn(): boolean {
  const saved = uni.getStorageSync(RETURN_KEY)
  if (!saved?.code || saved.expires <= Date.now()) { uni.removeStorageSync(RETURN_KEY); return false }
  uni.reLaunch({ url: `/pages/inspection/check-in?code=${encodeURIComponent(saved.code)}` })
  return true
}
export function clearScanReturn() { uni.removeStorageSync(RETURN_KEY) }
export function acceptVerification(value: PointVerification) { verification = value }
export function takeVerification(): PointVerification | undefined { const value = verification; verification = undefined; return value }
export function clearInspectionCheckIn() {
  verification = undefined
  uni.removeStorageSync(RETURN_KEY)
  uni.removeStorageSync(EXPECTED_KEY)
}
