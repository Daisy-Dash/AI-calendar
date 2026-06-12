import { useMemo } from 'react'

export default function MarkdownText({ content }) {
  const rendered = useMemo(() => {
    if (!content) return ''
    const lines = content.split('\n')
    const result = []

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]

      if (line.startsWith('```')) {
        const codeLines = []
        i++
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i])
          i++
        }
        result.push(
          <pre key={i} className="bg-choco-600/5 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap">
            {codeLines.join('\n')}
          </pre>
        )
        continue
      }

      if (line.startsWith('### ')) {
        result.push(<h4 key={i} className="font-bold text-sm mt-3 mb-1">{formatInline(line.slice(4))}</h4>)
      } else if (line.startsWith('## ')) {
        result.push(<h3 key={i} className="font-bold text-sm mt-3 mb-1">{formatInline(line.slice(3))}</h3>)
      } else if (line.startsWith('# ')) {
        result.push(<h2 key={i} className="font-bold text-base mt-3 mb-1">{formatInline(line.slice(2))}</h2>)
      } else if (/^\d+\.\s/.test(line)) {
        result.push(
          <div key={i} className="flex gap-1.5 text-sm leading-relaxed">
            <span className="flex-shrink-0">{line.match(/^\d+\./)[0]}</span>
            <span>{formatInline(line.replace(/^\d+\.\s/, ''))}</span>
          </div>
        )
      } else if (/^[-*·•]\s/.test(line)) {
        result.push(
          <div key={i} className="flex gap-1.5 text-sm leading-relaxed ml-1">
            <span className="flex-shrink-0">·</span>
            <span>{formatInline(line.replace(/^[-*·•]\s/, ''))}</span>
          </div>
        )
      } else if (line.startsWith('---') || line.startsWith('***')) {
        result.push(<hr key={i} className="border-choco-100 my-2" />)
      } else if (line.startsWith('> ')) {
        result.push(
          <div key={i} className="border-l-2 border-choco-200 pl-3 my-1 text-sm text-choco-400 italic">
            {formatInline(line.slice(2))}
          </div>
        )
      } else if (line.trim() === '') {
        result.push(<div key={i} className="h-2" />)
      } else {
        result.push(<p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>)
      }
    }
    return result
  }, [content])

  return <div className="markdown-text">{rendered}</div>
}

function formatInline(text) {
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const codeMatch = remaining.match(/`([^`]+)`/)

    let earliest = null
    let type = null

    if (boldMatch && (!earliest || boldMatch.index < earliest.index)) {
      earliest = boldMatch
      type = 'bold'
    }
    if (codeMatch && (!earliest || codeMatch.index < earliest.index)) {
      earliest = codeMatch
      type = 'code'
    }

    if (!earliest) {
      parts.push(remaining)
      break
    }

    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index))
    }

    if (type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold">{earliest[1]}</strong>)
    } else if (type === 'code') {
      parts.push(<code key={key++} className="bg-choco-600/5 px-1.5 py-0.5 rounded text-xs font-mono">{earliest[1]}</code>)
    }

    remaining = remaining.slice(earliest.index + earliest[0].length)
  }

  return parts
}
