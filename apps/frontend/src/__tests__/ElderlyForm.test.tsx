import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/elderly-form' }),
}))

vi.mock('../components/PageLayout', () => ({
  default: ({ children }: any) => <div data-testid="page-layout">{children}</div>,
  PageTitle: ({ children }: any) => <h1>{children}</h1>,
}))

const mockMutate = vi.fn()
const mockQueryData = { current: undefined as any }

vi.mock('../lib/trpc', () => ({
  trpc: {
    tenant: {
      getElderlyProfile: {
        useQuery: () => ({ data: mockQueryData.current, isLoading: false }),
      },
      saveElderlyProfile: {
        useMutation: (opts: any) => ({
          mutate: (data: any) => { mockMutate(data); opts?.onSuccess?.() },
          isPending: false,
          isError: false,
        }),
      },
    },
  },
}))

import ElderlyForm from '../pages/ElderlyForm'

describe('ElderlyForm', () => {
  beforeEach(() => {
    mockMutate.mockClear()
    mockQueryData.current = undefined
  })

  it('renders the form title', () => {
    render(<ElderlyForm />)
    expect(screen.getByText('טופס קשיש / מוגבלות')).toBeInTheDocument()
  })

  it('renders info banner about rights', () => {
    render(<ElderlyForm />)
    expect(screen.getByText(/זכויות מיוחדות לדיירים מעל גיל 70/)).toBeInTheDocument()
  })

  it('renders age input', () => {
    render(<ElderlyForm />)
    expect(screen.getByPlaceholderText('הכנס גיל')).toBeInTheDocument()
  })

  it('shows age 70+ message', () => {
    render(<ElderlyForm />)
    const ageInput = screen.getByPlaceholderText('הכנס גיל')
    fireEvent.change(ageInput, { target: { value: '75' } })
    expect(screen.getByText(/יש לך זכויות מיוחדות כקשיש/)).toBeInTheDocument()
  })

  it('shows age 80+ warning', () => {
    render(<ElderlyForm />)
    const ageInput = screen.getByPlaceholderText('הכנס גיל')
    fireEvent.change(ageInput, { target: { value: '85' } })
    expect(screen.getByText(/מעל גיל 80/)).toBeInTheDocument()
  })

  it('shows legal alternatives only for age 70+', () => {
    render(<ElderlyForm />)
    expect(screen.queryByText('חלופות דיור מועדפות (לפי חוק)')).not.toBeInTheDocument()

    const ageInput = screen.getByPlaceholderText('הכנס גיל')
    fireEvent.change(ageInput, { target: { value: '72' } })
    expect(screen.getByText('חלופות דיור מועדפות (לפי חוק)')).toBeInTheDocument()
  })

  it('renders disability checkbox', () => {
    render(<ElderlyForm />)
    expect(screen.getByText('יש לי מוגבלות')).toBeInTheDocument()
  })

  it('shows disability description when checkbox is checked', () => {
    render(<ElderlyForm />)
    const checkbox = screen.getByText('יש לי מוגבלות').closest('label')!.querySelector('input')!
    fireEvent.click(checkbox)
    expect(screen.getByPlaceholderText(/תאר\/י את המוגבלות/)).toBeInTheDocument()
  })

  it('renders accessibility needs checkboxes', () => {
    render(<ElderlyForm />)
    expect(screen.getByText(/נגישות מלאה/)).toBeInTheDocument()
    expect(screen.getByText(/צורך בקומה נמוכה/)).toBeInTheDocument()
    expect(screen.getByText(/חייב\/ת מעלית/)).toBeInTheDocument()
    expect(screen.getByText(/לא יכול\/ה לעבור רחוק/)).toBeInTheDocument()
  })

  it('renders companion section', () => {
    render(<ElderlyForm />)
    expect(screen.getByText('יש לי מלווה / אפוטרופוס')).toBeInTheDocument()
  })

  it('shows companion fields when checked', () => {
    render(<ElderlyForm />)
    const checkbox = screen.getByText('יש לי מלווה / אפוטרופוס').closest('label')!.querySelector('input')!
    fireEvent.click(checkbox)
    expect(screen.getByText('שם המלווה')).toBeInTheDocument()
    expect(screen.getByText('טלפון המלווה')).toBeInTheDocument()
  })

  it('renders preferred area input', () => {
    render(<ElderlyForm />)
    expect(screen.getByPlaceholderText(/אותו רחוב/)).toBeInTheDocument()
  })

  it('renders notes textarea', () => {
    render(<ElderlyForm />)
    expect(screen.getByPlaceholderText(/כל מידע נוסף/)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<ElderlyForm />)
    expect(screen.getByText(/שמור טופס/)).toBeInTheDocument()
  })

  it('calls mutate on submit with correct data', () => {
    render(<ElderlyForm />)
    const ageInput = screen.getByPlaceholderText('הכנס גיל')
    fireEvent.change(ageInput, { target: { value: '75' } })

    fireEvent.click(screen.getByText(/שמור טופס/))
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        age: 75,
        isOver70: true,
        isOver80: false,
      })
    )
  })

  it('sets isOver80 correctly for age 80+', () => {
    render(<ElderlyForm />)
    fireEvent.change(screen.getByPlaceholderText('הכנס גיל'), { target: { value: '82' } })
    fireEvent.click(screen.getByText(/שמור טופס/))
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        age: 82,
        isOver70: true,
        isOver80: true,
      })
    )
  })

  it('toggles legal alternatives', () => {
    render(<ElderlyForm />)
    fireEvent.change(screen.getByPlaceholderText('הכנס גיל'), { target: { value: '72' } })

    const altCheckbox = screen.getByText('דירה קטנה יותר + פיצוי כספי').closest('label')!.querySelector('input')!
    fireEvent.click(altCheckbox)

    fireEvent.click(screen.getByText(/שמור טופס/))
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        legalAlternatives: ['small_apt_plus_cash'],
      })
    )
  })

  it('does not show age warning for under 70', () => {
    render(<ElderlyForm />)
    fireEvent.change(screen.getByPlaceholderText('הכנס גיל'), { target: { value: '65' } })
    expect(screen.queryByText(/יש לך זכויות מיוחדות כקשיש/)).not.toBeInTheDocument()
    expect(screen.queryByText(/מעל גיל 80/)).not.toBeInTheDocument()
  })
})
