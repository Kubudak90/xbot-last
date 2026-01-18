import { render, screen, fireEvent } from '@testing-library/react'
import { Button, Badge, Card, Input, TextArea, Modal } from '@/components/common'

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByText('Primary')).toHaveClass('bg-blue-600')

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByText('Danger')).toHaveClass('bg-red-600')
  })

  it('applies size styles', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByText('Small')).toHaveClass('px-3')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByText('Large')).toHaveClass('px-6')
  })
})

describe('Badge Component', () => {
  it('renders with text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies variant styles', () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success')).toHaveClass('bg-green-100')

    rerender(<Badge variant="danger">Danger</Badge>)
    expect(screen.getByText('Danger')).toHaveClass('bg-red-100')
  })
})

describe('Card Component', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Card title="Card Title">Content</Card>)
    expect(screen.getByText('Card Title')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<Card title="Title" subtitle="Subtitle">Content</Card>)
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
  })

  it('renders action when provided', () => {
    render(
      <Card title="Title" action={<button>Action</button>}>
        Content
      </Card>
    )
    expect(screen.getByText('Action')).toBeInTheDocument()
  })
})

describe('Input Component', () => {
  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email" />)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })

  it('shows hint when no error', () => {
    render(<Input label="Email" hint="Enter your email" />)
    expect(screen.getByText('Enter your email')).toBeInTheDocument()
  })

  it('handles value changes', () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })
})

describe('TextArea Component', () => {
  it('renders with label', () => {
    render(<TextArea label="Description" />)
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('shows character count', () => {
    render(<TextArea charCount={50} maxChars={280} />)
    expect(screen.getByText('50/280')).toBeInTheDocument()
  })

  it('shows error when over limit', () => {
    render(<TextArea charCount={300} maxChars={280} />)
    expect(screen.getByText('300/280')).toHaveClass('text-red-600')
  })
})

describe('Modal Component', () => {
  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        Modal content
      </Modal>
    )
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        Modal content
      </Modal>
    )
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
  })

  it('calls onClose when clicking backdrop', () => {
    const handleClose = jest.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Modal content
      </Modal>
    )

    // Click on backdrop
    fireEvent.click(screen.getByText('Modal content').parentElement!.parentElement!.previousSibling!)
    expect(handleClose).toHaveBeenCalled()
  })
})
