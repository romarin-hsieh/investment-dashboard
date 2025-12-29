/**
 * Widget Load Manager - 全域併發控制
 * 限制同時載入的 Widget 數量，避免瀏覽器資源競爭
 */
class WidgetLoadManager {
  constructor() {
    this.maxConcurrent = 3 // 最多同時載入 3 個 Widget
    this.currentLoading = 0
    this.queue = []
    this.loadingWidgets = new Set()
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageLoadTime: 0,
      loadTimes: []
    }
  }

  /**
   * 添加 Widget 載入任務到佇列
   * @param {Function} loadFunction - Widget 載入函數
   * @param {string} widgetId - Widget 唯一識別碼
   * @param {number} priority - 優先級 (1=高, 2=中, 3=低)
   * @returns {Promise} 載入 Promise
   */
  async addToQueue(loadFunction, widgetId, priority = 2) {
    return new Promise((resolve, reject) => {
      const task = {
        id: widgetId,
        loadFunction,
        priority,
        resolve,
        reject,
        createdAt: Date.now()
      }

      // 檢查是否已在載入中
      if (this.loadingWidgets.has(widgetId)) {
        console.warn(`Widget ${widgetId} is already loading, skipping duplicate request`)
        reject(new Error('Widget already loading'))
        return
      }

      // 按優先級插入佇列
      this.insertByPriority(task)
      this.stats.totalRequests++
      
      console.log(`WidgetLoadManager: Added ${widgetId} to queue (priority: ${priority}, queue size: ${this.queue.length})`)
      
      // 嘗試處理佇列
      this.processQueue()
    })
  }

  /**
   * 按優先級插入任務
   */
  insertByPriority(task) {
    let insertIndex = this.queue.length
    
    // 找到合適的插入位置（優先級數字越小越優先）
    for (let i = 0; i < this.queue.length; i++) {
      if (task.priority < this.queue[i].priority) {
        insertIndex = i
        break
      }
    }
    
    this.queue.splice(insertIndex, 0, task)
  }

  /**
   * 處理載入佇列
   */
  async processQueue() {
    // 如果已達到併發上限或佇列為空，則返回
    if (this.currentLoading >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    // 取出下一個任務
    const task = this.queue.shift()
    this.currentLoading++
    this.loadingWidgets.add(task.id)

    const startTime = Date.now()
    
    console.log(`WidgetLoadManager: Starting load for ${task.id} (${this.currentLoading}/${this.maxConcurrent} slots used)`)

    try {
      // 執行載入函數
      await task.loadFunction()
      
      const loadTime = Date.now() - startTime
      this.updateStats(loadTime, true)
      
      console.log(`WidgetLoadManager: Successfully loaded ${task.id} in ${loadTime}ms`)
      task.resolve()
      
    } catch (error) {
      const loadTime = Date.now() - startTime
      this.updateStats(loadTime, false)
      
      console.error(`WidgetLoadManager: Failed to load ${task.id} after ${loadTime}ms:`, error)
      task.reject(error)
      
    } finally {
      // 清理並繼續處理佇列
      this.currentLoading--
      this.loadingWidgets.delete(task.id)
      
      // 繼續處理下一個任務
      setTimeout(() => this.processQueue(), 100) // 小延遲避免過於頻繁
    }
  }

  /**
   * 更新統計資訊
   */
  updateStats(loadTime, success) {
    if (success) {
      this.stats.completedRequests++
    } else {
      this.stats.failedRequests++
    }
    
    this.stats.loadTimes.push(loadTime)
    
    // 保持最近 100 次的載入時間記錄
    if (this.stats.loadTimes.length > 100) {
      this.stats.loadTimes.shift()
    }
    
    // 計算平均載入時間
    this.stats.averageLoadTime = this.stats.loadTimes.reduce((sum, time) => sum + time, 0) / this.stats.loadTimes.length
  }

  /**
   * 取消特定 Widget 的載入
   */
  cancelWidget(widgetId) {
    // 從佇列中移除
    const taskIndex = this.queue.findIndex(task => task.id === widgetId)
    if (taskIndex !== -1) {
      const task = this.queue.splice(taskIndex, 1)[0]
      task.reject(new Error('Widget load cancelled'))
      console.log(`WidgetLoadManager: Cancelled queued widget ${widgetId}`)
      return true
    }
    
    return false
  }

  /**
   * 清空佇列
   */
  clearQueue() {
    const cancelledCount = this.queue.length
    this.queue.forEach(task => {
      task.reject(new Error('Queue cleared'))
    })
    this.queue = []
    console.log(`WidgetLoadManager: Cleared queue, cancelled ${cancelledCount} tasks`)
  }

  /**
   * 獲取當前狀態
   */
  getStatus() {
    return {
      currentLoading: this.currentLoading,
      queueSize: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      stats: { ...this.stats }
    }
  }

  /**
   * 調整併發限制
   */
  setMaxConcurrent(max) {
    this.maxConcurrent = Math.max(1, Math.min(10, max)) // 限制在 1-10 之間
    console.log(`WidgetLoadManager: Max concurrent set to ${this.maxConcurrent}`)
    
    // 如果提高了限制，嘗試處理更多任務
    if (this.currentLoading < this.maxConcurrent) {
      this.processQueue()
    }
  }

  /**
   * 重置統計
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageLoadTime: 0,
      loadTimes: []
    }
    console.log('WidgetLoadManager: Stats reset')
  }
}

// 創建全域單例
export const widgetLoadManager = new WidgetLoadManager()

// 開發模式下暴露到 window 以便調試
if (import.meta.env.DEV) {
  window.widgetLoadManager = widgetLoadManager
}