import { API_BASE_URL, authHeaders, decodeResponse, uploadFile } from '@/utils/request'

/** Send all selected photos in one request so records are never duplicated per photo. */
export async function uploadPhotos(url: string, paths: string[], method: 'POST' | 'PUT' = 'POST') {
  // #ifdef H5
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const form = new FormData()
    const blobs = await Promise.all(paths.map(async path => {
      const response = await fetch(path, { signal: controller.signal })
      if (!response.ok) throw new Error('照片已失效，请重新选择照片')
      return response.blob()
    }))
    blobs.forEach((blob, index) => form.append('photos', blob, `inspection-${index + 1}.${blob.type === 'image/png' ? 'png' : 'jpg'}`))
    const response = await fetch(API_BASE_URL + url, {
      method, body: form, headers: authHeaders(url), credentials: 'include', signal: controller.signal
    })
    return decodeResponse(response.status, await response.text())
  } finally { clearTimeout(timeout) }
  // #endif
  // #ifndef H5
  if (paths.length !== 1 || method !== 'POST') throw new Error('当前平台暂不支持此照片提交方式，请使用 WebApp')
  return uploadFile(url, paths[0], {}, 'photos')
  // #endif
}
