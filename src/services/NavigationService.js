/**
 * NavigationService - 處理 Stock Overview 頁面內的導覽功能
 * 使用純 DOM scroll 避免與 Hash Router 衝突
 */
export class NavigationService {
  constructor() {
    this.headerOffset = 80 // 預設 header 高度
  }

  /**
   * 滾動到指定的股票 symbol
   * @param {string} symbol - 股票代碼
   * @param {boolean} smooth - 是否使用平滑滾動
   * @returns {Promise<void>}
   */
  async scrollToSymbol(symbol, smooth = true) {
    try {
      const sanitizedSymbol = this.sanitizeSymbol(symbol)
      const targetId = `sym-${sanitizedSymbol}`
      const targetElement = document.getElementById(targetId)

      if (!targetElement) {
        console.warn(`NavigationService: Element with ID "${targetId}" not found for symbol "${symbol}"`)
        return
      }

      // 檢查 prefers-reduced-motion 設定
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      
      // 計算滾動位置，考慮 sticky header
      const elementTop = targetElement.offsetTop
      const scrollTop = elementTop - this.getHeaderOffset()
      const currentScrollTop = window.pageYOffset
      const scrollDistance = Math.abs(scrollTop - currentScrollTop)
      
      // 距離感知滾動：超過 2 個 viewport 高度使用瞬移
      const viewportHeight = window.innerHeight
      const distanceThreshold = viewportHeight * 2
      const shouldUseInstant = scrollDistance > distanceThreshold || prefersReducedMotion
      const shouldUseSmooth = smooth && !shouldUseInstant

      console.log(`NavigationService: Scroll distance ${scrollDistance}px, threshold ${distanceThreshold}px, using ${shouldUseSmooth ? 'smooth' : 'instant'} scroll`)

      // 執行滾動
      window.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: shouldUseSmooth ? 'smooth' : 'instant'
      })

      // 等待滾動完成後設定 focus（提升無障礙性）
      if (shouldUseSmooth) {
        // 平滑滾動需要等待
        await this.waitForScrollComplete()
      }

      // 設定 focus 到目標元素
      targetElement.focus({ preventScroll: true })

      console.log(`NavigationService: Scrolled to symbol "${symbol}" (ID: ${targetId}) using ${shouldUseSmooth ? 'smooth' : 'instant'} behavior`)
    } catch (error) {
      console.error('NavigationService: Error scrolling to symbol:', error)
    }
  }

  /**
   * 清理 symbol 為有效的 DOM ID
   * @param {string} symbol - 原始 symbol
   * @returns {string} 清理後的 symbol
   */
  sanitizeSymbol(symbol) {
    return symbol.replace(/[^a-zA-Z0-9]/g, '_')
  }

  /**
   * 更新 URL query 參數
   * @deprecated 不建議在 Hash Router 環境下使用。請使用 Vue Router query 方法代替。
   * @param {string} symbol - 股票代碼
   */
  updateQueryParam(symbol) {
    console.warn('DEPRECATED: NavigationService.updateQueryParam() should not be used with Hash Router. Use Vue Router query methods instead.')
    
    try {
      const url = new URL(window.location)
      
      if (symbol) {
        url.searchParams.set('focus', symbol)
      } else {
        url.searchParams.delete('focus')
      }

      // 使用 replaceState 避免影響瀏覽器歷史
      window.history.replaceState(null, '', url.toString())
      
      console.log(`NavigationService: Updated URL query param to focus=${symbol}`)
    } catch (error) {
      console.error('NavigationService: Error updating query param:', error)
    }
  }

  /**
   * 從 URL query 參數讀取 focus symbol
   * @deprecated 不建議在 Hash Router 環境下使用。請使用 Vue Router $route.query 代替。
   * @returns {string|null} focus symbol 或 null
   */
  getFocusSymbolFromQuery() {
    console.warn('DEPRECATED: NavigationService.getFocusSymbolFromQuery() should not be used with Hash Router. Use Vue Router $route.query.focus instead.')
    
    try {
      const url = new URL(window.location)
      return url.searchParams.get('focus')
    } catch (error) {
      console.error('NavigationService: Error reading query param:', error)
      return null
    }
  }

  /**
   * 獲取當前 header 高度
   * @returns {number} header 高度（像素）
   */
  getHeaderOffset() {
    try {
      // 嘗試動態計算 header 高度
      const header = document.querySelector('header, .header, .navbar, .app-header')
      if (header) {
        const rect = header.getBoundingClientRect()
        return rect.height + 20 // 額外 20px 間距
      }
    } catch (error) {
      console.warn('NavigationService: Could not calculate header height:', error)
    }
    
    return this.headerOffset // 使用預設值
  }

  /**
   * 等待平滑滾動完成
   * @returns {Promise<void>}
   */
  waitForScrollComplete() {
    return new Promise(resolve => {
      let lastScrollTop = window.pageYOffset
      let scrollEndTimer = null

      const checkScrollEnd = () => {
        const currentScrollTop = window.pageYOffset
        
        if (Math.abs(currentScrollTop - lastScrollTop) < 1) {
          // 滾動已停止
          clearTimeout(scrollEndTimer)
          resolve()
        } else {
          // 滾動仍在進行
          lastScrollTop = currentScrollTop
          scrollEndTimer = setTimeout(checkScrollEnd, 50)
        }
      }

      // 開始檢查
      scrollEndTimer = setTimeout(checkScrollEnd, 50)
      
      // 最大等待時間 2 秒
      setTimeout(resolve, 2000)
    })
  }

  /**
   * 驗證 symbol 是否存在於頁面中
   * @param {string} symbol - 股票代碼
   * @returns {boolean} 是否存在
   */
  isSymbolValid(symbol) {
    const sanitizedSymbol = this.sanitizeSymbol(symbol)
    const targetId = `sym-${sanitizedSymbol}`
    return document.getElementById(targetId) !== null
  }
}

// 創建單例實例
export const navigationService = new NavigationService()