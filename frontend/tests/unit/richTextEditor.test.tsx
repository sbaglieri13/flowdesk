import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RichTextEditor } from '../../src/components/task/RichTextEditor'

describe('RichTextEditor', () => {
  it('renders stored HTML as formatted text without reporting a change', async () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        ariaLabel="Description"
        value='<p>Plain <strong>bold</strong> <span style="color: #ef4444">red</span></p><ol><li><p>one</p></li></ol>'
        onChange={onChange}
      />,
    )
    const editor = await screen.findByLabelText('Description')
    expect(editor.querySelector('strong')).toHaveTextContent('bold')
    expect(editor.querySelector('span[style*="color"]')).toHaveTextContent('red')
    expect(editor.querySelector('ol li')).toHaveTextContent('one')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('offers the formatting toolbar', () => {
    render(<RichTextEditor ariaLabel="Notes" value="" onChange={() => {}} />)
    for (const name of ['Bold (Ctrl+B)', 'Italic (Ctrl+I)', 'Underline (Ctrl+U)', 'Bullet list', 'Numbered list', 'Text color']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('shows the placeholder when empty and follows external value changes', async () => {
    const { rerender } = render(
      <RichTextEditor ariaLabel="Notes" value="" placeholder="Write here" onChange={() => {}} />,
    )
    const editor = await screen.findByLabelText('Notes')
    expect(editor.querySelector('[data-placeholder="Write here"]')).toBeInTheDocument()

    rerender(<RichTextEditor ariaLabel="Notes" value="<p>Reloaded</p>" placeholder="Write here" onChange={() => {}} />)
    await waitFor(() => expect(editor).toHaveTextContent('Reloaded'))
  })

  it('drops markup that is not part of the editor schema', async () => {
    render(
      <RichTextEditor
        ariaLabel="Description"
        value='<p>safe</p><script>window.hacked = true</script><img src=x onerror="window.hacked = true">'
        onChange={() => {}}
      />,
    )
    const editor = await screen.findByLabelText('Description')
    expect(editor.querySelector('script, img')).toBeNull()
    expect((window as { hacked?: boolean }).hacked).toBeUndefined()
  })
})
