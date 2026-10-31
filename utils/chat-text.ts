const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/
const INLINE = /\*\*(?=\S)[^*\n]*[^\s*]\*\*|(?<![\w*])\*(?=\S)[^*\n]*[^\s*]\*(?![\w*])|(?<![\w_])_(?=\S)[^_\n]*[^\s_]_(?![\w_])|`[^`\n]+`/g

export function normalizeAnswerWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function inlineText(text: string): string {
  return text.replace(INLINE, (span) => span.startsWith('**') ? span.slice(2, -2) : span.slice(1, -1))
}

/** Normalize the supported display formatting without discarding amounts or prose. */
export function renderedAnswerText(text: string): string {
  const blocks = text.split(/\n{2,}/).flatMap((block) => {
    const lines = block.split('\n').map((line) => line.trimEnd()).filter((line) => line.trim() !== '')
    if (!lines.length) return []
    // Only a whole list block loses its markers. Mixed paragraphs retain literal markers.
    const list = lines.every((line) => BULLET.test(line)) ? BULLET
      : lines.every((line) => NUMBERED.test(line)) ? NUMBERED : undefined
    if (list) return lines.map((line) => inlineText(line.replace(list, '$1')))
    if (lines.length === 1 && HEADING.test(lines[0])) return [inlineText(lines[0].replace(HEADING, '$1'))]
    return [inlineText(lines.join(' '))]
  })
  return normalizeAnswerWhitespace(blocks.join('\n'))
}
