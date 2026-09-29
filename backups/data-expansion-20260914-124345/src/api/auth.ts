import JSEncrypt from 'jsencrypt'
import { http } from '@/utils/request'
import type { ApiResult } from '@/types/api'
import type { UserInfo } from '@/types/domain'

export type AuthStep = 'public-key' | 'encrypt' | 'submit' | 'user-info'
export type AuthStepHandler = (step: AuthStep) => void

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  password: string
  realName?: string
}

export interface LoginResult {
  token: string
  user?: UserInfo
}

type TokenContainer = {
  token?: unknown
  accessToken?: unknown
  access_token?: unknown
  jwt?: unknown
  user?: UserInfo
  userInfo?: UserInfo
}

function nonEmptyString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePublicKey(publicKey: string): string {
  const raw = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '')
  const lines = raw.match(/.{1,64}/g) || []
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`
}

function randomPrefix(length = 3): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let index = 0; index < length; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function tokenFromObject(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const source = value as TokenContainer
  return [source.token, source.accessToken, source.access_token, source.jwt]
    .map(nonEmptyString)
    .find(Boolean) || ''
}

function extractToken(response: ApiResult<unknown>): string {
  const dataToken = typeof response.data === 'string'
    ? nonEmptyString(response.data)
    : tokenFromObject(response.data)
  if (dataToken) return dataToken

  const message = nonEmptyString(response.message)
  const looksLikeJwt = message.split('.').length === 3 && message.length > 40
  if (looksLikeJwt) return message

  throw new Error('登录成功，但响应中未找到 Token')
}

function extractUser(response: ApiResult<unknown>): UserInfo | undefined {
  if (!response.data || typeof response.data !== 'object') return undefined
  const source = response.data as TokenContainer
  return source.user || source.userInfo
}

export async function getPublicKey(): Promise<string> {
  const response = await http.get<string | { publicKey?: string; key?: string }>('/public-key')
  const publicKey = typeof response === 'string'
    ? response.trim()
    : nonEmptyString(response?.publicKey) || nonEmptyString(response?.key)
  if (!publicKey) throw new Error('后端未返回 RSA 公钥')
  return publicKey
}

export async function encryptPassword(password: string, onStep?: AuthStepHandler): Promise<string> {
  onStep?.('public-key')
  const publicKey = await getPublicKey()
  onStep?.('encrypt')
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(normalizePublicKey(publicKey))
  // 后端解密后会移除前 3 个字符，再与数据库密码进行比对。
  const encryptedPassword = encryptor.encrypt(`${randomPrefix(3)}${password}`)
  if (!encryptedPassword) throw new Error('密码 RSA 加密失败，请检查公钥格式')
  return encryptedPassword
}

export async function login(payload: LoginPayload, onStep?: AuthStepHandler): Promise<LoginResult> {
  const encryptedPassword = await encryptPassword(payload.password, onStep)
  onStep?.('submit')
  const response = await http.post<ApiResult<unknown>>('/login', {
    username: payload.username,
    password: encryptedPassword
  }, { unwrap: false })

  return {
    token: extractToken(response),
    user: extractUser(response)
  }
}

export async function getUserInfo(username = ''): Promise<UserInfo> {
  const response = await http.get<ApiResult<UserInfo | null>>('/userInfo', undefined, {
    unwrap: false,
    showError: false,
    // 实际联调返回 1003（超级管理员），同时兼容旧版角色码。
    successCodes: [0, 200, 201, 202, 1001, 1002, 1003, '0', '200', '201', '202', '1001', '1002', '1003']
  })
  if (response.data && typeof response.data === 'object') {
    return {
      ...response.data,
      username: response.data.username || String(response.data.userName || username),
      role: typeof response.data.role === 'object' && response.data.role && !Array.isArray(response.data.role)
        ? String((response.data.role as Record<string, unknown>).namezh || (response.data.role as Record<string, unknown>).name || '用户')
        : response.data.role
    }
  }

  const roleByCode: Record<string, string> = {
    '200': '普通用户',
    '201': '管理员',
    '202': '超级管理员',
    '1001': '普通用户',
    '1002': '管理员',
    '1003': '超级管理员'
  }
  return {
    username,
    realName: username,
    role: response.message || roleByCode[String(response.code)] || '用户'
  }
}

export async function register(payload: RegisterPayload, onStep?: AuthStepHandler): Promise<ApiResult<unknown>> {
  const encryptedPassword = await encryptPassword(payload.password, onStep)
  onStep?.('submit')
  return http.post<ApiResult<unknown>>('/register', {
    username: payload.username,
    password: encryptedPassword,
    ...(payload.realName ? { realname: payload.realName } : {})
  }, { unwrap: false })
}
