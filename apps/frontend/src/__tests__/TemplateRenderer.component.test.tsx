import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TemplateRenderer from '../components/TemplateRenderer'

describe('TemplateRenderer component', () => {
  const defaultProps = {
    content: '',
    profileData: {} as Record<string, string>,
    manualFields: {} as Record<string, string>,
    onFieldChange: vi.fn(),
    onContentReady: vi.fn(),
  }

  it('renders plain text without placeholders', () => {
    render(<TemplateRenderer {...defaultProps} content="שלום עולם" />)
    expect(screen.getByText('שלום עולם')).toBeInTheDocument()
  })

  it('renders auto-filled field from profileData as styled span', () => {
    render(
      <TemplateRenderer
        {...defaultProps}
        content="שם: {{fullName}}"
        profileData={{ fullName: 'יוסף' }}
      />
    )
    const span = screen.getByText('יוסף')
    expect(span).toBeInTheDocument()
    expect(span.tagName).toBe('SPAN')
    expect(span.title).toContain('מולא אוטומטית')
  })

  it('renders input for unfilled field', () => {
    render(
      <TemplateRenderer
        {...defaultProps}
        content="שם: {{fullName}}"
      />
    )
    const input = screen.getByPlaceholderText(/שם מלא|fullName/i)
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('calls onFieldChange when user types in unfilled field', () => {
    const onFieldChange = vi.fn()
    render(
      <TemplateRenderer
        {...defaultProps}
        content="שם: {{fullName}}"
        onFieldChange={onFieldChange}
      />
    )
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'דוד' } })
    expect(onFieldChange).toHaveBeenCalledWith('fullName', 'דוד')
  })

  it('renders manually filled field as clickable span', () => {
    render(
      <TemplateRenderer
        {...defaultProps}
        content="שם: {{fullName}}"
        manualFields={{ fullName: 'דוד' }}
      />
    )
    const span = screen.getByText('דוד')
    expect(span).toBeInTheDocument()
    expect(span.title).toContain('לחץ לעריכה')
  })

  it('calls onContentReady with filled content', () => {
    const onContentReady = vi.fn()
    render(
      <TemplateRenderer
        {...defaultProps}
        content="שם: {{fullName}}, ת.ז: {{idNumber}}"
        profileData={{ fullName: 'יוסף' }}
        manualFields={{ idNumber: '123456789' }}
        onContentReady={onContentReady}
      />
    )
    expect(onContentReady).toHaveBeenCalledWith('שם: יוסף, ת.ז: 123456789')
  })

  it('handles multiple placeholders in content', () => {
    render(
      <TemplateRenderer
        {...defaultProps}
        content="{{fullName}} גר ב{{address}}"
        profileData={{ fullName: 'יוסף', address: 'תל אביב' }}
      />
    )
    expect(screen.getByText('יוסף')).toBeInTheDocument()
    expect(screen.getByText('תל אביב')).toBeInTheDocument()
  })

  it('prioritizes profileData for auto-fill display', () => {
    render(
      <TemplateRenderer
        {...defaultProps}
        content="{{fullName}}"
        profileData={{ fullName: 'יוסף' }}
        manualFields={{ fullName: 'דוד' }}
      />
    )
    // profileData renders as auto-filled (blue, non-editable)
    const span = screen.getByText('יוסף')
    expect(span.title).toContain('מולא אוטומטית')
  })

  it('renders RTL direction', () => {
    const { container } = render(
      <TemplateRenderer {...defaultProps} content="טקסט" />
    )
    expect(container.firstChild).toHaveAttribute('dir', 'rtl')
  })

  it('handles content with no placeholders returning same content to onContentReady', () => {
    const onContentReady = vi.fn()
    render(
      <TemplateRenderer
        {...defaultProps}
        content="טקסט פשוט ללא שדות"
        onContentReady={onContentReady}
      />
    )
    expect(onContentReady).toHaveBeenCalledWith('טקסט פשוט ללא שדות')
  })

  it('handles empty content', () => {
    const { container } = render(
      <TemplateRenderer {...defaultProps} content="" />
    )
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument()
  })

  it('opens prompt on click of manually filled field', () => {
    const onFieldChange = vi.fn()
    const promptMock = vi.spyOn(window, 'prompt').mockReturnValue('ערך חדש')

    render(
      <TemplateRenderer
        {...defaultProps}
        content="{{fullName}}"
        manualFields={{ fullName: 'ערך ישן' }}
        onFieldChange={onFieldChange}
      />
    )

    fireEvent.click(screen.getByText('ערך ישן'))
    expect(promptMock).toHaveBeenCalled()
    expect(onFieldChange).toHaveBeenCalledWith('fullName', 'ערך חדש')
    promptMock.mockRestore()
  })

  it('does not call onFieldChange when prompt is cancelled', () => {
    const onFieldChange = vi.fn()
    const promptMock = vi.spyOn(window, 'prompt').mockReturnValue(null)

    render(
      <TemplateRenderer
        {...defaultProps}
        content="{{fullName}}"
        manualFields={{ fullName: 'ערך' }}
        onFieldChange={onFieldChange}
      />
    )

    fireEvent.click(screen.getByText('ערך'))
    expect(onFieldChange).not.toHaveBeenCalled()
    promptMock.mockRestore()
  })
})
