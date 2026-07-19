import { onMounted, onBeforeUnmount } from 'vue'

/** 單一鍵盤綁定：對應 KeyboardEvent.key 的按鍵、處理函式，以及是否攔截預設行為。 */
export interface KeyBinding {
  /** 精確比對 KeyboardEvent.key（'j'、'J'、'Enter'、'ArrowUp' …）。 */
  key: string;
  /** 命中時執行的處理函式。 */
  handler: (event: KeyboardEvent) => void;
  /**
   * 是否在文字輸入過濾之後、handler 之前呼叫 event.preventDefault()。
   * 預設 false，僅為絕不該觸發瀏覽器預設行為的按鍵開啟。
   */
  preventDefault?: boolean;
}

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
 *
 * Per-binding `preventDefault: true` opts that key into `event.preventDefault()`
 * AFTER the text-input filter and BEFORE the handler runs. Default is false
 * for backward compatibility — opt in only for keys that should never reach
 * the browser's default action (vim-style nav keys, custom-overlay triggers).
 * Avoid for `Enter` / `Escape` since those have legitimate defaults
 * (button-click activation, fullscreen exit, etc.) the user may rely on.
 */
export function createKeyHandler (bindings: KeyBinding[]): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    if (isTextInput(event.target)) return
    const binding = bindings.find(b => b.key === event.key)
    if (!binding) return
    if (binding.preventDefault && typeof event.preventDefault === 'function') {
      event.preventDefault()
    }
    binding.handler(event)
  }
}

/**
 * Register keyboard shortcuts scoped to the calling component's lifecycle.
 *
 * Listener attaches on mount and detaches on unmount, so a parent component
 * using this composable can never leak global handlers.
 */
export function useKeyboardShortcuts (bindings: KeyBinding[]): void {
  const handler = createKeyHandler(bindings)
  onMounted(() => window.addEventListener('keydown', handler))
  onBeforeUnmount(() => window.removeEventListener('keydown', handler))
}

function isTextInput (el: EventTarget | null): boolean {
  // 原本以 `el.tagName` 判斷；改用 instanceof 使 EventTarget 窄化為
  // HTMLElement，才能安全讀取 tagName / isContentEditable。所有真實文字
  // 輸入目標（input/textarea/select/contenteditable）皆為 HTMLElement，
  // null 與非 HTMLElement 目標一律回傳 false，語意與原本相同。
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}
