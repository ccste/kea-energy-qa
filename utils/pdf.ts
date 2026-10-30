import { readFile } from 'node:fs/promises'
import type { Download } from '@playwright/test'

export interface PdfTextRun {
  text: string
  x: number
  y: number
  width: number
  height: number
}

export interface PdfPageText {
  width: number
  height: number
  runs: PdfTextRun[]
  lines: string[]
}

/** Parse the actual downloaded document. The caller owns download cleanup in its finally block. */
export async function readDownloadedPdf(download: Download): Promise<PdfPageText[]> {
  const failure = await download.failure()
  if (failure) throw new Error(`Invoice download failed: ${failure}`)
  const file = await download.path()
  if (!file) throw new Error('The invoice download has no local file.')
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loading = getDocument({ data: new Uint8Array(await readFile(file)) })
  try {
    const document = await loading.promise
    const pages: PdfPageText[] = []
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number)
      const viewport = page.getViewport({ scale: 1 })
      const content = await page.getTextContent()
      const runs: PdfTextRun[] = content.items.flatMap(item => 'str' in item && item.str.trim() ? [{
        text: item.str.trim(), x: item.transform[4], y: item.transform[5],
        width: item.width, height: item.height,
      }] : [])
      // Group by baseline, then read each line left to right. No invoice values are inferred.
      const lines: { y: number; runs: PdfTextRun[] }[] = []
      for (const run of [...runs].sort((a, b) => b.y - a.y || a.x - b.x)) {
        const line = lines.find(candidate => Math.abs(candidate.y - run.y) < 2)
        if (line) line.runs.push(run)
        else lines.push({ y: run.y, runs: [run] })
      }
      pages.push({
        width: viewport.width, height: viewport.height, runs,
        lines: lines.map(line => line.runs.sort((a, b) => a.x - b.x).map(run => run.text).join(' ')),
      })
      page.cleanup()
    }
    return pages
  } finally {
    await loading.destroy()
  }

}
