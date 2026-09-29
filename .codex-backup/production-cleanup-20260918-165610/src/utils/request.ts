import { parseApiJson } from '@/utils/json'
import type { ApiResult } from '@/types/api'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://10.20.148.252:9191').replace(/\/$/, '')
let redirecting = false

export class RequestError extends Error {
  statusCode?: number
  code?: number | string
  constructor(message: string, options: { statusCode?: number; code?: number | string } = {}) {
    super(message)
    this.name = 'RequestError'
    Object.assign(this, options)
  }
}

interface RequestOptions<T> {
  url: string
  method?: UniApp.RequestOptions['method']
  data?: unknown
  header?: Record<string, string>
  timeout?: number
  showError?: boolean
  unwrap?: boolean
  successCodes?: Array<number | string>
}

function isApiResult<T>(value: unknown): value is ApiResult<T> {
  return Boolean(value && typeof value === 'object' && 'code' in value && ('message' in value || 'data' in value))
}

function goLogin() {
  if (redirecting) return
  redirecting = true
  uni.removeStorageSync('auth-token')
  uni.removeStorageSync('daqiao-current-user')
  uni.removeStorageSync('daqiao-demo-mode')
  uni.reLaunch({
    url: '/pages/login/index',
    complete: () => setTimeout(() => { redirecting = false }, 500)
  })
}

export function authHeaders(url = ''): Record<string, string> {
  if (/^\/(public-key|login|register)(?:\?|$)/.test(url)) return {}
  const token = String(uni.getStorageSync('auth-token') || '').replace(/^Bearer\s+/i, '').trim()
  return token ? { Authorization: `Bearer ${token}`, token } : {}
}

export function decodeResponse<T>(statusCode: number, raw: unknown, options: Partial<RequestOptions<T>> = {}): T {
  if (statusCode === 401) {
    goLogin()
    throw new RequestError('登录状态已失效', { statusCode: 401 })
  }
  if (statusCode < 200 || statusCode >= 300) {
    throw new RequestError(`服务请求失败（${statusCode}）`, { statusCode })
  }
  let body: unknown
  try { body = parseApiJson(raw) } catch { throw new RequestError('接口返回了无法解析的数据') }
  if (isApiResult<T>(body)) {
    if (String(body.code) === '401') {
      goLogin()
      throw new RequestError('登录状态已失效', { statusCode: 401, code: body.code })
    }
    const successCodes = options.successCodes || [0, 200, '0', '200']
    if (!successCodes.includes(body.code)) {
      throw new RequestError(body.message || '业务处理失败', { code: body.code })
    }
    return options.unwrap === false ? body as T : body.data
  }
  return body as T
}

export function request<T>(options: RequestOptions<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data as UniApp.RequestOptions['data'],
      dataType: 'text',
      responseType: 'text',
      timeout: options.timeout || 15000,
      withCredentials: true,
      header: {
        'Content-Type': 'application/json',
        ...authHeaders(options.url),
        ...options.header
      },
      success: (response) => {
        try { resolve(decodeResponse<T>(response.statusCode, response.data, options)) }
        catch (error) { reject(error) }
      },
      fail: (error) => reject(new RequestError(error.errMsg || '网络连接失败'))
    })
  }).catch((error) => {
    if (options.showError !== false && !(error instanceof RequestError && error.statusCode === 401)) {
      uni.showToast({ title: error.message || '请求失败', icon: 'none' })
    }
    return Promise.reject(error)
  })
}

export const http = {
  get: <T>(url: string, data?: unknown, options: Partial<RequestOptions<T>> = {}) =>
    request<T>({ ...options, url, data, method: 'GET' }),
  post: <T>(url: string, data?: unknown, options: Partial<RequestOptions<T>> = {}) =>
    request<T>({ ...options, url, data, method: 'POST' }),
  put: <T>(url: string, data?: unknown, options: Partial<RequestOptions<T>> = {}) =>
    request<T>({ ...options, url, data, method: 'PUT' }),
  delete: <T>(url: string, data?: unknown, options: Partial<RequestOptions<T>> = {}) =>
    request<T>({ ...options, url, data, method: 'DELETE' })
}

export function uploadFile<T>(url: string, filePath: string, formData: Record<string, string> = {}, name = 'file'): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}${url}`,
      filePath,
      name,
      formData,
      header: authHeaders(url),
      success: (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new RequestError(`上传失败（${response.statusCode}）`))
          return
        }
        try { resolve(decodeResponse<T>(response.statusCode, response.data)) } catch (error) { reject(error) }
      },
      fail: (error) => reject(new RequestError(error.errMsg || '上传失败'))
    })
  })
}

export { API_BASE_URL }
