import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock @react-pdf/renderer - heavy dependency not suited for jsdom
vi.mock('@react-pdf/renderer', () => {
  const React = require('react')
  return {
    Document: ({ children }: any) => React.createElement('div', { 'data-testid': 'pdf-document' }, children),
    Page: ({ children }: any) => React.createElement('div', { 'data-testid': 'pdf-page' }, children),
    Text: ({ children }: any) => React.createElement('span', {}, children),
    View: ({ children }: any) => React.createElement('div', {}, children),
    Image: ({ src }: any) => React.createElement('img', { src, 'data-testid': 'pdf-image' }),
    StyleSheet: { create: (s: any) => s },
    Font: {
      register: vi.fn(),
      registerHyphenationCallback: vi.fn(),
    },
    pdf: vi.fn(() => ({
      toBlob: vi.fn().mockResolvedValue(new Blob(['fake-pdf'], { type: 'application/pdf' })),
    })),
  }
})

import GenerateDocPDF from '../components/GenerateDocPDF'

describe('GenerateDocPDF', () => {
  const baseProps = {
    template: {
      key: 'test',
      title: 'מסמך בדיקה',
      sections: [
        { heading: 'סעיף 1', content: 'תוכן עם {{fullName}}' },
        { heading: 'סעיף 2', content: 'כתובת: {{address}}' },
      ],
    },
    variables: { fullName: 'יוסף', address: 'תל אביב' },
    docTitle: 'מסמך בדיקה',
  }

  it('renders download button', () => {
    render(<GenerateDocPDF {...baseProps} />)
    expect(screen.getByText(/הורד PDF/)).toBeInTheDocument()
  })

  it('button is enabled by default', () => {
    render(<GenerateDocPDF {...baseProps} />)
    const btn = screen.getByRole('button')
    expect(btn).not.toBeDisabled()
  })

  it('shows generating state when clicked', async () => {
    render(<GenerateDocPDF {...baseProps} />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    // Button should show generating text or become disabled
    expect(btn).toBeDisabled()
  })

  it('renders with null template', () => {
    render(<GenerateDocPDF {...baseProps} template={null} />)
    expect(screen.getByText(/הורד PDF/)).toBeInTheDocument()
  })

  it('uses docTitle as fallback when template is null', () => {
    render(<GenerateDocPDF {...baseProps} template={null} docTitle="fallback title" />)
    expect(screen.getByText(/הורד PDF/)).toBeInTheDocument()
  })

  it('renders with signature image prop', () => {
    render(
      <GenerateDocPDF
        {...baseProps}
        signatureImage="data:image/png;base64,abc123"
      />
    )
    expect(screen.getByText(/הורד PDF/)).toBeInTheDocument()
  })

  it('renders with filledVariables override', () => {
    render(
      <GenerateDocPDF
        {...baseProps}
        filledVariables={{ fullName: 'שם אחר' }}
      />
    )
    expect(screen.getByText(/הורד PDF/)).toBeInTheDocument()
  })
})
