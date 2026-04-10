import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/power-of-attorney' }),
}))

vi.mock('../components/PageLayout', () => ({
  default: ({ children }: any) => <div data-testid="page-layout">{children}</div>,
  PageTitle: ({ children }: any) => <h1>{children}</h1>,
}))

const mockMutate = vi.fn()
const mockRefetch = vi.fn()
const mockPoaData = { current: undefined as any }

vi.mock('../lib/trpc', () => ({
  trpc: {
    tenant: {
      getMyPowerOfAttorneys: {
        useQuery: () => ({ data: mockPoaData.current, refetch: mockRefetch }),
      },
      createPowerOfAttorney: {
        useMutation: (opts: any) => ({
          mutate: (data: any) => { mockMutate(data); opts?.onSuccess?.() },
          isPending: false,
        }),
      },
    },
  },
}))

import PowerOfAttorneyForm from '../pages/PowerOfAttorneyForm'

describe('PowerOfAttorneyForm', () => {
  beforeEach(() => {
    mockMutate.mockClear()
    mockRefetch.mockClear()
    mockPoaData.current = undefined
  })

  it('renders title', () => {
    render(<PowerOfAttorneyForm />)
    expect(screen.getByText('📋 ייפוי כוח')).toBeInTheDocument()
  })

  it('shows empty state when no POAs exist', () => {
    mockPoaData.current = []
    render(<PowerOfAttorneyForm />)
    expect(screen.getByText('אין ייפויי כוח פעילים')).toBeInTheDocument()
  })

  it('renders new POA button', () => {
    render(<PowerOfAttorneyForm />)
    expect(screen.getByText('+ ייפוי כוח חדש')).toBeInTheDocument()
  })

  it('shows create form when button clicked', () => {
    render(<PowerOfAttorneyForm />)
    fireEvent.click(screen.getByText('+ ייפוי כוח חדש'))
    expect(screen.getByText('יצירת ייפוי כוח חדש')).toBeInTheDocument()
  })

  it('toggles form visibility', () => {
    render(<PowerOfAttorneyForm />)
    fireEvent.click(screen.getByText('+ ייפוי כוח חדש'))
    expect(screen.getByText('יצירת ייפוי כוח חדש')).toBeInTheDocument()

    fireEvent.click(screen.getByText('ביטול'))
    expect(screen.queryByText('יצירת ייפוי כוח חדש')).not.toBeInTheDocument()
  })

  it('shows 3 POA type options in form', () => {
    render(<PowerOfAttorneyForm />)
    fireEvent.click(screen.getByText('+ ייפוי כוח חדש'))

    expect(screen.getByText(/ייפוי כוח מלא/)).toBeInTheDocument()
    expect(screen.getByText(/ייפוי כוח חלקי/)).toBeInTheDocument()
    expect(screen.getByText(/הצבעה בלבד/)).toBeInTheDocument()
  })

  it('submit button is disabled without required fields', () => {
    render(<PowerOfAttorneyForm />)
    fireEvent.click(screen.getByText('+ ייפוי כוח חדש'))

    const submitBtn = screen.getByText(/צור ייפוי כוח/)
    expect(submitBtn).toBeDisabled()
  })

  it('submit button enables when required fields filled', () => {
    render(<PowerOfAttorneyForm />)
    fireEvent.click(screen.getByText('+ ייפוי כוח חדש'))

    const inputs = screen.getAllByRole('textbox')
    // receiverUserId
    fireEvent.change(inputs[0], { target: { value: 'user-uuid-123' } })
    // apartmentId
    fireEvent.change(inputs[1], { target: { value: 'apt-uuid-456' } })

    const submitBtn = screen.getByText(/צור ייפוי כוח/)
    expect(submitBtn).not.toBeDisabled()
  })

  it('calls mutate with form data on submit', () => {
    render(<PowerOfAttorneyForm />)
    fireEvent.click(screen.getByText('+ ייפוי כוח חדש'))

    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'user-uuid-123' } })
    fireEvent.change(inputs[1], { target: { value: 'apt-uuid-456' } })

    fireEvent.click(screen.getByText(/צור ייפוי כוח/))
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        receiverUserId: 'user-uuid-123',
        apartmentId: 'apt-uuid-456',
        poaType: 'full',
        notarized: false,
      })
    )
  })

  it('renders existing POAs', () => {
    mockPoaData.current = [
      {
        id: '1',
        poa_type: 'full',
        status: 'approved',
        granter: { full_name: 'יוסף' },
        receiver: { full_name: 'דוד' },
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        notarized: true,
        file_url: null,
      },
    ]
    render(<PowerOfAttorneyForm />)
    expect(screen.getByText(/יוסף/)).toBeInTheDocument()
    expect(screen.getByText(/דוד/)).toBeInTheDocument()
    expect(screen.getByText(/מאושר/)).toBeInTheDocument()
    expect(screen.getByText(/נוטריוני/)).toBeInTheDocument()
  })

  it('renders POA status badges correctly', () => {
    mockPoaData.current = [
      { id: '1', poa_type: 'voting_only', status: 'pending', granter: {}, receiver: {} },
    ]
    render(<PowerOfAttorneyForm />)
    expect(screen.getByText(/ממתין לאישור/)).toBeInTheDocument()
  })

  it('renders file link when available', () => {
    mockPoaData.current = [
      { id: '1', poa_type: 'full', status: 'approved', granter: {}, receiver: {}, file_url: 'https://example.com/doc.pdf' },
    ]
    render(<PowerOfAttorneyForm />)
    expect(screen.getByText(/צפייה במסמך/)).toBeInTheDocument()
  })

  it('shows legal notice in form', () => {
    render(<PowerOfAttorneyForm />)
    fireEvent.click(screen.getByText('+ ייפוי כוח חדש'))
    expect(screen.getByText(/רק מיופה הכוח יוכל להצביע/)).toBeInTheDocument()
  })

  it('has notarized checkbox', () => {
    render(<PowerOfAttorneyForm />)
    fireEvent.click(screen.getByText('+ ייפוי כוח חדש'))
    expect(screen.getByText('מסמך נוטריוני מאושר')).toBeInTheDocument()
  })

  it('has date inputs', () => {
    render(<PowerOfAttorneyForm />)
    fireEvent.click(screen.getByText('+ ייפוי כוח חדש'))
    expect(screen.getByText('תוקף מתאריך')).toBeInTheDocument()
    expect(screen.getByText('תוקף עד')).toBeInTheDocument()
  })
})
