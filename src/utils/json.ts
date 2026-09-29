/** Preserve backend int64 identifiers before JSON.parse can round them. */
export function parseApiJson(input: unknown): unknown {
  if (typeof input !== 'string') return input
  if (!input.trim()) return null
  const safe = input.replace(/"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token => {
    if (/^-?\d+$/.test(token) && !Number.isSafeInteger(Number(token))) {
      return JSON.stringify(token)
    }
    return token
  })
  return JSON.parse(safe)
}
