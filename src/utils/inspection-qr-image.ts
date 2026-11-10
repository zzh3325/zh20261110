import jsQR from 'jsqr'

/** Read only our route/code. Never navigate to an arbitrary decoded URL. */
export function inspectionCodeFromQr(text: string): string {
  let url: URL
  try { url = new URL(text.trim()) } catch { throw new Error('不是有效的巡检点位二维码，请扫描现场点位牌') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('不是有效的巡检点位二维码')
  const route = url.hash.slice(1), index = route.indexOf('?')
  if (index < 0 || route.slice(0, index) !== '/pages/inspection/check-in') throw new Error('该二维码不是巡检点位二维码')
  const values = new URLSearchParams(route.slice(index + 1)).getAll('code')
  if (values.length !== 1 || !values[0].trim() || values[0].length > 2048) throw new Error('巡检二维码缺少有效标识，请重新扫描')
  return values[0]
}

/** HTTP-compatible local image recognition; no camera stream or server upload. */
export async function readInspectionQrImage(path: string): Promise<string> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') throw new Error('当前环境不支持图片识别，请使用手机扫码工具打开现场二维码')
  const image = new Image()
  const canvas = document.createElement('canvas')
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { image.src = ''; reject(new Error('二维码图片读取超时，请重新拍摄')) }, 15000)
      image.onload = () => { clearTimeout(timer); resolve() }
      image.onerror = () => { clearTimeout(timer); reject(new Error('图片无法读取，请重新拍摄二维码')) }
      image.src = path
    })
    const width = image.naturalWidth, height = image.naturalHeight
    if (!width || !height) throw new Error('二维码图片无效，请重新拍摄')
    for (const maximum of [1600, 2800]) {
      const ratio = Math.min(1, maximum / Math.max(width, height))
      canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio))
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('当前浏览器不支持二维码图片识别')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
      const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })
      if (result?.data) return result.data
      if (ratio === 1) break
    }
    throw new Error('未识别到二维码，请将二维码拍清晰、拍完整后重试')
  } finally {
    image.onload = null; image.onerror = null; image.src = ''; canvas.width = 0; canvas.height = 0
  }
}
