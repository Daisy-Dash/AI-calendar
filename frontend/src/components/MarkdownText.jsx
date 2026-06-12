import { useMemo } from 'react'

function parseLine(line) {
  const parts = []
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g
  let last = 0
  let match
  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: line.slice(last, match.index) })
    if (match[2]) parts.push({ type: 'bold', content: match[2] })
    else if (match[3]) parts.push({ type: 'code', content: match[3] })
    last = regex.lastIndex
  }
  if (last < line.length) parts.push({ type: 'text', content: line.slice(last) })
  return parts
}

export default function MarkdownText({ content, className = '' }) {
  const rendered = useMemo(() => {
    if (!content) return null
    const lines = content.split('\n')
    const elements = []
    let inCodeBlock = false
    let codeLines = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={i} className="my-1.5 px-2.5 py-2 rounded-lg bg-choco-600/5 text-[11px] leading-relaxed overflow-x-auto font-mono">
              {codeLines.join('\n')}
            </pre>
          )
          codeLines = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeLines.push(line)
        continue
      }

      if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />)
        continue
      }

      const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const text = headingMatch[2]
        const cls = level === 1 ? 'text-sm font-bold' : level === 2 ? 'text-[13px] font-semibold' : 'text-xs font-semibold'
        elements.push(<p key={i} className={`${cls} text-choco-600 mt-1`}>{text}</p>)
        continue
      }

      const numberedMatch = line.match(/^(\d+)\.\s+(.+)/)
      if (numberedMatch) {
        elements.push(
          <div key={i} className="flex gap-1.5 pl-1">
            <span className="text-choco-300 flex-shrink-0">{numberedMatch[1]}.</span>
            <span>{parseLine(numberedMatch[2]).map((p, j) =>
              p.type === 'bold' ? <strong key={j}>{p.content}</strong> :
              p.type === 'code' ? <code key={j} className="px-1 py-0.5 rounded bg-choco-600/5 text-[11px] font-mono">{p.content}</code> :
              <span key={j}>{p.content}</span>
            )}</span>
          </div>
        )
        continue
      }

      const bulletMatch = line.match(/^[-*]\s+(.+)/)
      if (bulletMatch) {
        elements.push(
          <div key={i} className="flex gap-1.5 pl-1">
            <span className="text-choco-300 flex-shrink-0">·</span>
            <span>{parseLine(bulletMatch[1]).map((p, j) =>
              p.type === 'bold' ? <strong key={j}>{p.content}</strong> :
              p.type === 'code' ? <code key={j} className="px-1 py-0.5 rounded bg-choco-600/5 text-[11px] font-mono">{p.content}</code> :
              <span key={j}>{p.content}</span>
            )}</span>
          </div>
        )
        continue
      }

      elements.push(
        <p key={i}>
          {parseLine(line).map((p, j) =>
            p.type === 'bold' ? <strong key={j}>{p.content}</strong> :
            p.type === 'code' ? <code key={j} className="px-1 py-0.5 rounded bg-choco-600/5 text-[11px] font-mono">{p.content}</code> :
            <span key={j}>{p.content}</span>
          )}
        </p>
      )
    }

    if (inCodeBlock && codeLines.length > 0) {
      elements.push(
        <pre key="code-end" className="my-1.5 px-2.5 py-2 rounded-lg bg-choco-600/5 text-[11px] leading-relaxed overflow-x-auto font-mono">
          {codeLines.join('\n')}
        </pre>
      )
    }

    return elements
  }, [content])

  return <div className={`text-sm leading-relaxed space-y-0.5 ${className}`}>{rendered}</div>
}
