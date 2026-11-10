import { API_BASE_URL, authHeaders, decodeResponse, uploadFile } from '@/utils/request'

function photoCollectionPath(inspectionId: string | number) {
	const id = String(inspectionId ?? '').trim()
	if (!id) throw new Error('缺少巡检记录 ID，无法处理照片')
	return `/admin/inspections/${encodeURIComponent(id)}/photos`
}

async function uploadInspectionPhoto(inspectionId: string | number, path: string, index: number) {
	const uploadPath = photoCollectionPath(inspectionId)
  // #ifdef H5
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const source = await fetch(path, { signal: controller.signal })
    if (!source.ok) throw new Error('照片已失效，请重新选择照片')
    const blob = await source.blob()
    const suffix = blob.type === 'image/png' ? 'png' : 'jpg'
    const form = new FormData()
    form.append('file', blob, `inspection-${Date.now()}-${index + 1}.${suffix}`)
    const response = await fetch(API_BASE_URL + uploadPath, {
      method: 'POST',
      body: form,
      headers: authHeaders(uploadPath),
      credentials: 'include',
      signal: controller.signal
    })
    return decodeResponse<unknown>(response.status, await response.text())
  } finally {
    clearTimeout(timeout)
  }
  // #endif

  // #ifndef H5
  return uploadFile<unknown>(uploadPath, path, {}, 'file')
  // #endif
}

/** Swagger requires an existing inspection ID and one multipart `file` per request. */
export async function uploadInspectionPhotos(inspectionId: string | number, paths: string[], onUploaded?: (path: string) => void) {
  let latest: unknown
  for (let index = 0; index < paths.length; index += 1) {
    latest = await uploadInspectionPhoto(inspectionId, paths[index], index)
    onUploaded?.(paths[index])
  }
  return latest
}

function photoFileName(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) throw new Error('照片路径为空')
  let pathname = raw
  try { pathname = new URL(raw, API_BASE_URL + '/').pathname } catch { /* use raw path */ }
  const encodedName = pathname.split('/').filter(Boolean).pop() || ''
  if (!encodedName) throw new Error('照片文件名无效')
  try { return decodeURIComponent(encodedName) } catch { return encodedName }
}

export function inspectionPhotoPath(inspectionId: string | number, value: unknown) {
  return `${photoCollectionPath(inspectionId)}/${encodeURIComponent(photoFileName(value))}`
}

/** Download with authentication and return a previewable local/blob URL. */
export async function loadInspectionPhoto(inspectionId: string | number, value: unknown): Promise<string> {
  const path = inspectionPhotoPath(inspectionId, value)
  // #ifdef H5
  const response = await fetch(API_BASE_URL + path, {
    headers: authHeaders(path),
    credentials: 'include'
  })
  if (!response.ok) throw new Error(`照片加载失败（${response.status}）`)
  return URL.createObjectURL(await response.blob())
  // #endif

  // #ifndef H5
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url: API_BASE_URL + path,
      header: authHeaders(path),
      success: result => result.statusCode >= 200 && result.statusCode < 300
        ? resolve(result.tempFilePath)
        : reject(new Error(`照片加载失败（${result.statusCode}）`)),
      fail: error => reject(new Error(error.errMsg || '照片加载失败'))
    })
  })
  // #endif
}

export function releaseInspectionPhoto(url: string) {
  // #ifdef H5
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  // #endif
}
