import { describe, it, expect, vi } from 'vitest'
import { createKeyHandler } from './useKeyboardShortcuts'

function fakeEvent (key, target = document.createElement('div')) {
  return { key, target, preventDefault: vi.fn() }
}

describe('createKeyHandler', () => {
  it('invokes the matching binding handler', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler }
    ])

    keyHandler(fakeEvent('j'))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('is case-sensitive on KeyboardEvent.key', () => {
    const lower = vi.fn()
    const upper = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler: lower },
      { key: 'J', description: 'jump to top', handler: upper }
    ])

    keyHandler(fakeEvent('j'))
    keyHandler(fakeEvent('J'))

    expect(lower).toHaveBeenCalledTimes(1)
    expect(upper).toHaveBeenCalledTimes(1)
  })

  it('does nothing when no binding matches', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler }
    ])

    keyHandler(fakeEvent('z'))

    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores keystrokes from INPUT elements', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler }
    ])
    const input = document.createElement('input')

    keyHandler(fakeEvent('j', input))

    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores keystrokes from TEXTAREA elements', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler }
    ])
    const textarea = document.createElement('textarea')

    keyHandler(fakeEvent('j', textarea))

    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores keystrokes from contenteditable elements', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler }
    ])
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    // jsdom doesn't auto-compute isContentEditable from the attribute
    Object.defineProperty(div, 'isContentEditable', { value: true })

    keyHandler(fakeEvent('j', div))

    expect(handler).not.toHaveBeenCalled()
  })

  it('receives the event object as argument', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'Enter', description: 'open', handler }
    ])
    const event = fakeEvent('Enter')

    keyHandler(event)

    expect(handler).toHaveBeenCalledWith(event)
  })

  it('returns safely when target is null/undefined', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler }
    ])

    expect(() => keyHandler({ key: 'j', target: null, preventDefault: vi.fn() })).not.toThrow()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not call event.preventDefault by default (backward compat)', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler }
    ])
    const event = fakeEvent('j')

    keyHandler(event)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('calls event.preventDefault when binding opts in', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler, preventDefault: true }
    ])
    const event = fakeEvent('j')

    keyHandler(event)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('does not call preventDefault when no binding matches', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler, preventDefault: true }
    ])
    const event = fakeEvent('z')

    keyHandler(event)

    expect(handler).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('does not call preventDefault when keystroke is filtered (text input)', () => {
    const handler = vi.fn()
    const keyHandler = createKeyHandler([
      { key: 'j', description: 'next', handler, preventDefault: true }
    ])
    const input = document.createElement('input')
    const event = fakeEvent('j', input)

    keyHandler(event)

    expect(handler).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
