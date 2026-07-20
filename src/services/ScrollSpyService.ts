/**
 * ScrollSpyService - 使用 IntersectionObserver 監控 StockCard 可見性
 * 提供高效能的 ScrollSpy 功能
 */

/** 單一可見元素的量測資訊。 */
interface VisibleElement {
  element: Element
  symbol: string
  intersectionRatio: number
  boundingClientRect: DOMRectReadOnly
}

export class ScrollSpyService {
  observer: IntersectionObserver | null
  callback: ((symbol: string) => void) | null
  observedElements: Map<Element, string>
  isActive: boolean
  observerOptions: IntersectionObserverInit
  debounceTimer?: ReturnType<typeof setTimeout> | null

  constructor() {
    this.observer = null
    this.callback = null
    this.observedElements = new Map() // element -> symbol mapping
    this.isActive = false

    // IntersectionObserver 配置
    this.observerOptions = {
      root: null, // 使用 viewport
      rootMargin: '-80px 0px -50% 0px', // 考慮 header 高度和中心位置
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] // 多個閾值以獲得更精確的交集比例
    }
  }

  /**
   * 初始化 ScrollSpy 服務
   * @param elements - 要監控的 StockCard 元素
   * @param callback - 當 active symbol 變更時的回調函數
   */
  setup(elements: Element[], callback: (symbol: string) => void): void {
    try {
      this.cleanup() // 清理現有的 observer

      this.callback = callback
      this.observedElements.clear()

      // 創建 IntersectionObserver
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        this.observerOptions
      )
      // 綁定為區域常數，讓型別在 forEach closure 內保持非 null
      const observer = this.observer

      // 開始觀察所有元素
      elements.forEach(element => {
        const symbol = (element as HTMLElement).dataset.symbol
        if (symbol) {
          this.observedElements.set(element, symbol)
          observer.observe(element)
        }
      })

      this.isActive = true
      console.log(`ScrollSpyService: Started observing ${elements.length} elements`)
    } catch (error) {
      console.error('ScrollSpyService: Error setting up observer:', error)
    }
  }

  /**
   * 處理 IntersectionObserver 回調
   * @param entries - 交集變更條目
   */
  handleIntersection(entries: IntersectionObserverEntry[]): void {
    if (!this.isActive || !this.callback) return

    try {
      // 收集所有可見的元素及其交集比例
      const visibleElements: VisibleElement[] = []

      entries.forEach(entry => {
        const symbol = this.observedElements.get(entry.target)
        if (symbol && entry.isIntersecting) {
          visibleElements.push({
            element: entry.target,
            symbol: symbol,
            intersectionRatio: entry.intersectionRatio,
            boundingClientRect: entry.boundingClientRect
          })
        }
      })

      // 如果沒有可見元素，不更新 active symbol
      if (visibleElements.length === 0) return

      // 找出最佳的 active symbol
      const activeSymbol = this.determineActiveSymbol(visibleElements)

      if (activeSymbol) {
        // 使用 debounce 避免過度頻繁的回調
        this.debouncedCallback(activeSymbol)
      }
    } catch (error) {
      console.error('ScrollSpyService: Error handling intersection:', error)
    }
  }

  /**
   * 確定當前的 active symbol
   * @param visibleElements - 可見元素列表
   * @returns active symbol
   */
  determineActiveSymbol(visibleElements: VisibleElement[]): string | null {
    if (visibleElements.length === 0) return null
    if (visibleElements.length === 1) return visibleElements[0].symbol

    // 多個元素可見時，選擇最佳的一個
    // 優先級：1. 交集比例最高 2. 距離視窗中心最近
    const viewportHeight = window.innerHeight
    const viewportCenter = viewportHeight / 2

    let bestElement = visibleElements[0]
    let bestScore = this.calculateElementScore(bestElement, viewportCenter)

    for (let i = 1; i < visibleElements.length; i++) {
      const element = visibleElements[i]
      const score = this.calculateElementScore(element, viewportCenter)

      if (score > bestScore) {
        bestElement = element
        bestScore = score
      }
    }

    return bestElement.symbol
  }

  /**
   * 計算元素的評分（用於確定最佳 active element）
   * @param elementInfo - 元素資訊
   * @param viewportCenter - 視窗中心位置
   * @returns 評分
   */
  calculateElementScore(elementInfo: VisibleElement, viewportCenter: number): number {
    const { intersectionRatio, boundingClientRect } = elementInfo

    // 元素中心位置
    const elementCenter = boundingClientRect.top + (boundingClientRect.height / 2)

    // 距離視窗中心的距離（越近越好）
    const distanceFromCenter = Math.abs(elementCenter - viewportCenter)
    const maxDistance = viewportCenter // 最大可能距離
    const centerScore = 1 - (distanceFromCenter / maxDistance)

    // 綜合評分：交集比例 (70%) + 中心距離 (30%)
    return (intersectionRatio * 0.7) + (centerScore * 0.3)
  }

  /**
   * 防抖回調函數
   * @param symbol - active symbol
   */
  debouncedCallback(symbol: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      if (this.callback && this.isActive) {
        this.callback(symbol)
      }
    }, 100) // 100ms 防抖
  }

  /**
   * 更新 active symbol（手動觸發）
   * @param symbol - 要設為 active 的 symbol
   */
  updateActiveSymbol(symbol: string): void {
    if (this.callback && this.isActive) {
      this.callback(symbol)
    }
  }

  /**
   * 重新掃描所有元素並更新 active symbol
   */
  refresh(): void {
    if (!this.observer || !this.isActive) return

    try {
      // 觸發重新檢查所有觀察的元素
      const elements = Array.from(this.observedElements.keys())
      const visibleElements: VisibleElement[] = []

      elements.forEach(element => {
        const rect = element.getBoundingClientRect()
        const symbol = this.observedElements.get(element)

        // 檢查元素是否在視窗內
        if (rect.top < window.innerHeight && rect.bottom > 0 && symbol) {
          const intersectionRatio = this.calculateIntersectionRatio(rect)
          if (intersectionRatio > 0) {
            visibleElements.push({
              element,
              symbol,
              intersectionRatio,
              boundingClientRect: rect
            })
          }
        }
      })

      const activeSymbol = this.determineActiveSymbol(visibleElements)
      if (activeSymbol) {
        this.updateActiveSymbol(activeSymbol)
      }
    } catch (error) {
      console.error('ScrollSpyService: Error refreshing:', error)
    }
  }

  /**
   * 計算元素的交集比例
   * @param rect - 元素的 bounding rect
   * @returns 交集比例 (0-1)
   */
  calculateIntersectionRatio(rect: DOMRect): number {
    const viewportHeight = window.innerHeight
    const headerOffset = 80 // 考慮 header 高度

    const visibleTop = Math.max(rect.top, headerOffset)
    const visibleBottom = Math.min(rect.bottom, viewportHeight)
    const visibleHeight = Math.max(0, visibleBottom - visibleTop)

    return visibleHeight / rect.height
  }

  /**
   * 清理 ScrollSpy 服務
   */
  cleanup(): void {
    try {
      if (this.observer) {
        this.observer.disconnect()
        this.observer = null
      }

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
        this.debounceTimer = null
      }

      this.observedElements.clear()
      this.callback = null
      this.isActive = false

      console.log('ScrollSpyService: Cleaned up')
    } catch (error) {
      console.error('ScrollSpyService: Error during cleanup:', error)
    }
  }

  /**
   * 暫停 ScrollSpy 服務
   */
  pause(): void {
    this.isActive = false
  }

  /**
   * 恢復 ScrollSpy 服務
   */
  resume(): void {
    this.isActive = true
    this.refresh() // 立即刷新狀態
  }
}

// 創建單例實例
export const scrollSpyService = new ScrollSpyService()
