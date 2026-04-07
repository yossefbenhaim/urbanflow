import React, { useMemo, useCallback, useEffect, useRef } from 'react'
import { FIELD_LABELS, normalizePlaceholderName } from '../utils/templateRenderer'

interface TemplateRendererProps {
  content: string
  profileData: Record<string, string>
  manualFields: Record<string, string>
  onFieldChange: (fieldName: string, value: string) => void
  /** Called whenever the fully-resolved content changes (for PDF generation) */
  onContentReady?: (filledContent: string) => void
}

interface TemplatePart {
  type: 'text' | 'field'
  value: string
  fieldName?: string
}

/** Supports both English and Hebrew placeholder names */
function splitTemplate(content: string): TemplatePart[] {
  const parts: TemplatePart[] = []
  const regex = /\{\{([\w\u0590-\u05FF]+)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) })
    }
    // Normalise Hebrew placeholder names to their English keys
    const fieldName = normalizePlaceholderName(match[1])
    parts.push({ type: 'field', value: match[0], fieldName })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) })
  }

  return parts
}

const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  content,
  profileData,
  manualFields,
  onFieldChange,
  onContentReady,
}) => {
  const parts = useMemo(() => splitTemplate(content), [content])

  // Merge profile + manual data
  const allVariables = useMemo(
    () => ({ ...profileData, ...manualFields }),
    [profileData, manualFields],
  )

  // Build final filled content and notify parent
  const filledContent = useMemo(() => {
    return content.replace(/\{\{([\w\u0590-\u05FF]+)\}\}/g, (match, rawName: string) => {
      const key = normalizePlaceholderName(rawName)
      const value = allVariables[key]
      return value || match
    })
  }, [content, allVariables])

  const prevFilledRef = useRef(filledContent)
  useEffect(() => {
    if (filledContent !== prevFilledRef.current) {
      prevFilledRef.current = filledContent
    }
    onContentReady?.(filledContent)
  }, [filledContent, onContentReady])

  const handleChange = useCallback(
    (fieldName: string, value: string) => {
      onFieldChange(fieldName, value)
    },
    [onFieldChange],
  )

  return (
    <div className="whitespace-pre-wrap" dir="rtl">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.value}</span>
        }

        const fieldName = part.fieldName!
        const autoValue = profileData[fieldName]
        const manualValue = manualFields[fieldName]
        const label = FIELD_LABELS[fieldName] ?? fieldName

        // Auto-filled from profile — show as styled inline text (not editable)
        if (autoValue) {
          return (
            <span
              key={index}
              className="text-[#1e3a5f] font-semibold border-b-2 border-[#3b6b9c]/40 bg-[#eef4fb] rounded px-1 mx-0.5"
              title={`${label} (מולא אוטומטית)`}
            >
              {autoValue}
            </span>
          )
        }

        // Manually filled field — show as styled inline text once filled
        if (manualValue) {
          return (
            <span
              key={index}
              className="text-[#7a4f1e] font-semibold border-b-2 border-[#e8a854]/60 bg-[#fff8f0] rounded px-1 mx-0.5 cursor-pointer"
              title={`${label} — לחץ לעריכה`}
              onClick={() => {
                const newVal = window.prompt(label, manualValue)
                if (newVal !== null) handleChange(fieldName, newVal)
              }}
            >
              {manualValue}
            </span>
          )
        }

        // Missing field — show input box
        return (
          <input
            key={index}
            type="text"
            value=""
            placeholder={label}
            className="bg-[#fff8f0] border border-[#e8a854] text-[#212121] placeholder-[#9ca3af] rounded px-2 py-0.5 inline-block w-40 focus:border-[#3b6b9c] focus:outline-none focus:ring-1 focus:ring-[#3b6b9c]/30 text-right"
            dir="rtl"
            onChange={(e) => handleChange(fieldName, e.target.value)}
          />
        )
      })}
    </div>
  )
}

export default TemplateRenderer
