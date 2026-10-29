import type { Page } from '@playwright/test'

export async function blockApiWrites(page: Page): Promise<string[]> {
  const writes: string[] = []
  await page.route((url) => url.pathname === '/api' || url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    if (request.method() === 'GET' || request.method() === 'HEAD') {
      await route.fallback()
      return
    }
    writes.push(`${request.method()} ${new URL(request.url()).pathname}`)
    await route.abort('blockedbyclient')
  })
  return writes
}

// Start after page data has loaded to isolate requests caused by prototype controls.
export function observeApiRequests(page: Page): string[] {
  const requests: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      requests.push(`${request.method()} ${pathname}`)
    }
  })
  return requests
}
