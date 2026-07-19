// 性能監控工具
// 用於追蹤頁面載入時間和 API 調用性能

/** 單一操作的耗時摘要（名稱 + 毫秒）。 */
export interface OperationTiming {
  name: string | null;
  time: number;
}

/** generateReport() 回傳的完整報告。 */
export interface PerformanceReport {
  timestamp: string;
  metrics: Record<string, number>;
  summary: {
    totalOperations: number;
    totalTime: number;
    averageTime: number;
    slowestOperation: OperationTiming;
    fastestOperation: OperationTiming;
  };
}

/** checkPerformanceWarnings() 產生的單筆警告。 */
export interface PerformanceWarning {
  type: 'SLOW_OPERATION' | 'SLOW_TOTAL_LOAD';
  operation?: string;
  time: number;
  message: string;
}

class PerformanceMonitor {
  private metrics = new Map<string, number>();
  private startTimes = new Map<string, number>();

  // 開始計時
  start(label: string): void {
    this.startTimes.set(label, performance.now());
    console.log(`⏱️ Started timing: ${label}`);
  }

  // 結束計時並記錄
  end(label: string): number | null {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      console.warn(`No start time found for: ${label}`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.metrics.set(label, duration);
    this.startTimes.delete(label);

    console.log(`✅ Completed: ${label} - ${duration.toFixed(2)}ms`);
    return duration;
  }

  // 獲取指標
  getMetric(label: string): number | undefined {
    return this.metrics.get(label);
  }

  // 獲取所有指標
  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  // 清除指標
  clear(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }

  // 記錄 API 調用
  async measureAsync<T>(label: string, asyncFunction: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await asyncFunction();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      console.error(`❌ Error in ${label}:`, error);
      throw error;
    }
  }

  // 生成性能報告
  generateReport(): PerformanceReport {
    const metrics = this.getAllMetrics();
    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      metrics,
      summary: {
        totalOperations: Object.keys(metrics).length,
        totalTime: Object.values(metrics).reduce((sum, time) => sum + time, 0),
        averageTime: Object.values(metrics).reduce((sum, time) => sum + time, 0) / Object.keys(metrics).length || 0,
        slowestOperation: this.getSlowestOperation(),
        fastestOperation: this.getFastestOperation()
      }
    };

    console.log('📊 Performance Report:', report);
    return report;
  }

  // 獲取最慢的操作
  getSlowestOperation(): OperationTiming {
    let slowest: OperationTiming = { name: null, time: 0 };
    for (const [name, time] of this.metrics) {
      if (time > slowest.time) {
        slowest = { name, time };
      }
    }
    return slowest;
  }

  // 獲取最快的操作
  getFastestOperation(): OperationTiming {
    let fastest: OperationTiming = { name: null, time: Infinity };
    for (const [name, time] of this.metrics) {
      if (time < fastest.time) {
        fastest = { name, time };
      }
    }
    return fastest.time === Infinity ? { name: null, time: 0 } : fastest;
  }

  // 檢查性能警告
  checkPerformanceWarnings(): PerformanceWarning[] {
    const warnings: PerformanceWarning[] = [];
    const metrics = this.getAllMetrics();

    // 檢查載入時間過長的操作
    Object.entries(metrics).forEach(([name, time]) => {
      if (time > 5000) { // 5 seconds
        warnings.push({
          type: 'SLOW_OPERATION',
          operation: name,
          time: time,
          message: `Operation "${name}" took ${time.toFixed(2)}ms (>5s)`
        });
      }
    });

    // 檢查總載入時間
    const totalTime = Object.values(metrics).reduce((sum, time) => sum + time, 0);
    if (totalTime > 10000) { // 10 seconds
      warnings.push({
        type: 'SLOW_TOTAL_LOAD',
        time: totalTime,
        message: `Total load time ${totalTime.toFixed(2)}ms (>10s)`
      });
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Performance Warnings:', warnings);
    }

    return warnings;
  }
}

// 創建全局實例
export const performanceMonitor = new PerformanceMonitor();

// 常用的性能標籤
export const PERFORMANCE_LABELS = {
  STOCK_OVERVIEW_LOAD: 'stock_overview_total_load',
  QUOTES_FETCH: 'quotes_fetch',
  DAILY_DATA_FETCH: 'daily_data_fetch',
  METADATA_FETCH: 'metadata_fetch',
  SYMBOLS_CONFIG_LOAD: 'symbols_config_load',
  SKELETON_DISPLAY: 'skeleton_display_time',
  FIRST_CONTENT_PAINT: 'first_content_paint',
  MARKET_DASHBOARD_LOAD: 'market_dashboard_load',
  STOCK_DETAIL_LOAD: 'stock_detail_load'
} as const;

// 自動性能監控裝飾器
export function withPerformanceMonitoring(label: string) {
  return function (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const method = descriptor.value as (...args: unknown[]) => unknown;
    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      return await performanceMonitor.measureAsync(label, () => Promise.resolve(method.apply(this, args)));
    };
    return descriptor;
  };
}
