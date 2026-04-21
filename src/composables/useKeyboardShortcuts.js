import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Build a keydown handler from a list of bindings.
 *
 * Exported separately from the composable so it can be exercised in unit
 * tests without mounting a Vue component. Options-API components that can't
 * use the composable directly (e.g. because their setup()/data()/methods
 * split doesn't play nicely with lifecycle hooks) can also wire this up by
 * hand in mounted()/beforeUnmount().
 *
 * Keys are matched against KeyboardEvent.key exactly, so lowercase-j is
 * 'j' and Shift+J is 'J'. Special names follow the spec ('Enter',
 * 'Escape', 'ArrowUp', etc).
 *
 * Keystrokes originating from text inputs (INPUT/TEXTAREA/SELECT or
 * contenteditable) are ignored so shortcuts never hijack typing in a
 * search box or filter field.
 */
export function createKeyHandler (bindings) {
  return (event) => {
    if (isTextInput(event.target)) return
    const binding = bindings.find(b => b.key === event.key)
    if (!binding) return
    binding.handler(event)
  }
}

/**
 * Register keyboard shortcuts scoped to the calling component's lifecycle.
 *
 * Listener attaches on mount and detaches on unmount, so a parent component
 * using this composable can never leak global handlers.
 */
export function useKeyboardShortcuts (bindings) {
  const handler = createKeyHandler(bindings)
  onMounted(() => window.addEventListener('keydown', handler))
  onBeforeUnmount(() => window.removeEventListener('keydown', handler))
}

function isTextInput (el) {
  if (!el || !el.tagName) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}
