export interface ApiResult<T> {
  code: number | string
  message: string
  data: T
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}
