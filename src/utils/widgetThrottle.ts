/**
 * TradingView Widget 載入節流管理
 * 限制同時載入的 widget 數量，避免瀏覽器過載
 */

interface ThrottleTask {
  loadFunction: () => unknown
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  timestamp: number
}

class WidgetThrottle {
  maxConcurrent: number
  currentLoading: number
  queue: ThrottleTask[]
  loadDelay: number

  constructor() {
    this.maxConcurrent = 6 // 增加到 6 個同時載入
    this.currentLoading = 0
    this.queue = []
    this.loadDelay = 100 // 減少到 100ms 間隔
  }

  /**
   * 添加 widget 載入任務到佇列
   */
  async addToQueue(loadFunction: () => unknown): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      this.queue.push({
        loadFunction,
        resolve,
        reject,
        timestamp: Date.now()
      })

      this.processQueue()
    })
  }

  /**
   * 處理載入佇列
   */
  async processQueue(): Promise<void> {
    if (this.currentLoading >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const task = this.queue.shift()
    if (!task) return
    this.currentLoading++

    try {
      // 添加載入延遲，避免同時發送太多請求
      if (this.currentLoading > 1) {
        await this.delay(this.loadDelay)
      }

      const result = await task.loadFunction()
      task.resolve(result)
    } catch (error) {
      task.reject(error)
    } finally {
      this.currentLoading--

      // 繼續處理佇列中的下一個任務
      setTimeout(() => {
        this.processQueue()
      }, 25) // 減少到 25ms
    }
  }

  /**
   * 延遲函數
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 獲取佇列狀態
   */
  getStatus(): { currentLoading: number; queueLength: number; maxConcurrent: number } {
    return {
      currentLoading: this.currentLoading,
      queueLength: this.queue.length,
      maxConcurrent: this.maxConcurrent
    }
  }

  /**
   * 清空佇列
   */
  clearQueue(): void {
    this.queue.forEach(task => {
      task.reject(new Error('Queue cleared'))
    })
    this.queue = []
  }

  /**
   * 調整並發數量
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, Math.min(10, max))
  }
}

// 單例模式
export const widgetThrottle = new WidgetThrottle()

export default widgetThrottle
