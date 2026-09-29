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
  return Boolean(value && typeof value === 'object' && 'code' in value && 'data' in value)
}

function goLogin() {
  if (redirecting) return
  redirecting = true
  uni.removeStorageSync('auth-token')
  uni.reLaunch({
    url: '/pages/login/index',
    complete: () => setTimeout(() => { redirecting = false }, 500)
  })
}

export function request<T>(options: RequestOptions<T>): Promise<T> {
  const token = uni.getStorageSync('auth-token')
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data as UniApp.RequestOptions['data'],
      timeout: options.timeout || 15000,
      withCredentials: true,
      header: {
        'Content-Type': 'application/json',
        ...(token ? {
          Authorization: `Bearer ${String(token).replace(/^Bearer\s+/i, '')}`,
          token: String(token).replace(/^Bearer\s+/i, '')
        } : {}),
        ...options.header
      },
      success: (response) => {
        if (response.statusCode === 401) {
          goLogin()
          reject(new RequestError('登录状态已失效', { statusCode: 401 }))
          return
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new RequestError(`服务请求失败（${response.statusCode}）`, { statusCode: response.statusCode }))
          return
        }

        const body = response.data as T | ApiResult<T>
        if (isApiResult<T>(body)) {
          const successCodes = options.successCodes || [0, 200, '0', '200']
          if (!successCodes.includes(body.code)) {
            reject(new RequestError(body.message || '业务处理失败', { code: body.code }))
            return
          }
          resolve(options.unwrap === false ? body as T : body.data)
          return
        }
        resolve(body as T)
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
  const token = uni.getStorageSync('auth-token')
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}${url}`,
      filePath,
      name,
      formData,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new RequestError(`上传失败（${response.statusCode}）`))
          return
        }
        try { resolve(JSON.parse(response.data) as T) } catch { resolve(response.data as T) }
      },
      fail: (error) => reject(new RequestError(error.errMsg || '上传失败'))
    })
  })
}

export { API_BASE_URL }
