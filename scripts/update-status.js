#!/usr/bin/env node

/**
 * Status File Updater
 * 
 * 更新 data/status.json 文件，供前端檢查數據新鮮度
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  statusFile: path.join(__dirname, '../public/data/status.json'),
  dataDir: path.join(__dirname, '../public/data')
};

/**
 * 檢查文件狀態
 */
function checkFileStatus(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return {
      exists: true,
      size: stats.size,
      modified: stats.mtime.toISOString()
    };
  } catch (error) {
    return {
      exists: false,
      size: 0,
      modified: null,
      error: error.message
    };
  }
}

/**
 * 計算目錄中的文件數量
 */
function countFilesInDir(dirPath, extension = '.json') {
  try {
    const files = fs.readdirSync(dirPath);
    return files.filter(file => file.endsWith(extension)).length;
  } catch (error) {
    return 0;
  }
}

/**
 * 生成狀態數據
 */
function generateStatusData() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // 檢查各種數據文件
  const ohlcvDir = path.join(CONFIG.dataDir, 'ohlcv');
  const technicalDir = path.join(CONFIG.dataDir, 'technical-indicators');
  const quotesFile = path.join(CONFIG.dataDir, 'quotes', 'latest.json');
  const metadataFile = path.join(CONFIG.dataDir, 'symbols_metadata.json');
  const dailyFile = path.join(CONFIG.dataDir, 'daily', `${today}.json`);

  return {
    generated: now.toISOString(),
    last_updated: now.toISOString(), // Required for cache busting in fetcher.ts
    date: today,
    status: 'updated',
    data_sources: {
      ohlcv: {
        ...checkFileStatus(path.join(ohlcvDir, 'index.json')),
        fileCount: countFilesInDir(ohlcvDir),
        directory: 'data/ohlcv/'
      },
      technical_indicators: {
        ...checkFileStatus(path.join(technicalDir, 'latest_index.json')),
        fileCount: countFilesInDir(technicalDir),
        directory: 'data/technical-indicators/'
      },
      quotes: {
        ...checkFileStatus(quotesFile),
        file: 'data/quotes/latest.json'
      },
      metadata: {
        ...checkFileStatus(metadataFile),
        file: 'data/symbols_metadata.json'
      },
      daily_snapshot: {
        ...checkFileStatus(dailyFile),
        file: `data/daily/${today}.json`
      }
    },
    update_info: {
      source: 'GitHub Actions Daily Update',
      workflow: 'daily-data-update.yml',
      next_update: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      update_frequency: 'daily'
    },
    health_check: {
      all_systems: 'operational',
      last_check: now.toISOString(),
      issues: []
    }
  };
}

/**
 * 驗證數據完整性
 */
function validateDataIntegrity(statusData) {
  const issues = [];

  // 檢查 OHLCV 數據
  if (!statusData.data_sources.ohlcv.exists) {
    issues.push('OHLCV index file missing');
  } else if (statusData.data_sources.ohlcv.fileCount < 10) {
    issues.push(`OHLCV file count too low: ${statusData.data_sources.ohlcv.fileCount}`);
  }

  // 檢查技術指標
  if (!statusData.data_sources.technical_indicators.exists) {
    issues.push('Technical indicators index file missing');
  }

  // 檢查 metadata
  if (!statusData.data_sources.metadata.exists) {
    issues.push('Metadata file missing');
  }

  // 更新健康狀態
  if (issues.length > 0) {
    statusData.health_check.all_systems = 'degraded';
    statusData.health_check.issues = issues;
    statusData.status = 'partial';
  }

  return statusData;
}

/**
 * 更新狀態文件
 */
async function updateStatusFile() {
  console.log('🚀 Updating status file...');

  try {
    // 確保目錄存在
    const statusDir = path.dirname(CONFIG.statusFile);
    if (!fs.existsSync(statusDir)) {
      fs.mkdirSync(statusDir, { recursive: true });
    }

    // 生成狀態數據
    let statusData = generateStatusData();

    // 驗證數據完整性
    statusData = validateDataIntegrity(statusData);

    // 寫入文件
    fs.writeFileSync(CONFIG.statusFile, JSON.stringify(statusData, null, 2));

    console.log('✅ Status file updated successfully');
    console.log(`📊 Status: ${statusData.status}`);
    console.log(`📁 OHLCV files: ${statusData.data_sources.ohlcv.fileCount}`);
    console.log(`📁 Technical indicators: ${statusData.data_sources.technical_indicators.fileCount}`);

    if (statusData.health_check.issues.length > 0) {
      console.log('⚠️ Issues found:');
      statusData.health_check.issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }

    return statusData;

  } catch (error) {
    console.error('❌ Failed to update status file:', error);
    throw error;
  }
}

// 主執行函數
async function main() {
  try {
    console.log('🚀 Status File Updater');
    console.log('='.repeat(30));

    const statusData = await updateStatusFile();

    console.log('\n📊 Status Summary:');
    console.log(`- Overall status: ${statusData.status}`);
    console.log(`- Generated: ${statusData.generated}`);
    console.log(`- Next update: ${statusData.update_info.next_update}`);

    if (statusData.status === 'partial') {
      console.log('\n⚠️ Some issues detected, but system is operational');
      process.exit(0); // 不要因為部分問題而失敗
    } else {
      console.log('\n🎉 All systems operational!');
    }

  } catch (error) {
    console.error('❌ Error updating status file:', error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('update-status.js')) {
  main();
}

export { updateStatusFile, generateStatusData };