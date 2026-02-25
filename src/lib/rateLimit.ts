// Einfacher In-Memory Rate-Limiter (MVP – single instance)
// Für Multi-Instance-Deployment durch Redis ersetzen.
const ipMap = new Map<string, number[]>()

export function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const times = (ipMap.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (times.length >= maxRequests) return false
  times.push(now)
  ipMap.set(ip, times)
  return true
}
