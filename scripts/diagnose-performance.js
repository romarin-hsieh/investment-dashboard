#!/usr/bin/env node

// 效能診斷工具
// 檢查各種可能影響效能的因素

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔍 Investment Dashboard 效能診斷工具');
console.log('=====================================\n');

// 1. 檢查檔案大小
function checkFileSizes() {
  console.log('📁 檢查檔案大小...');
  
  const distPath = path.join(projectRoot, 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('❌ dist 資料夾不存在，請先執行 npm run build');
    return;
  }
  
  const files = fs.readdirSync(distPath, { recursive: true });
  const largeFiles = [];
  
  files.forEach(file => {
    const filePath = path.join(distPath, file);
    if (fs.statSync(filePath).isFile()) {
      const size = fs.statSync(filePath).size;
      if (size > 500 * 1024) { // > 500KB
        largeFiles.push({
          file,
          size: (size / 1024 / 1024).toFixed(2) + 'MB'
        });
      }
    }
  });
  
  if (largeFiles.length > 0) {
    console.log('⚠️  發現大檔案:');
    largeFiles.forEach(({ file, size }) => {
      console.log(`   ${file}: ${size}`);
    });
  } else {
    console.log('✅ 檔案大小正常');
  }
  console.log('');
}

// 2. 檢查依賴
function checkDependencies() {
  console.log('📦 檢查依賴...');
  
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  const heavyDeps = [];
  Object.keys(allDeps).forEach(dep => {
    // 檢查可能影響效能的大型依賴
    if (dep.includes('babel') || dep.includes('webpack') || dep.includes('typescript')) {
      heavyDeps.push(dep);
    }
  });
  
  if (heavyDeps.length > 0) {
    console.log('⚠️  發現可能影響效能的依賴:');
    heavyDeps.forEach(dep => console.log(`   ${dep}`));
  } else {
    console.log('✅ 依賴配置良好');
  }
  console.log('');
}

// 3. 檢查快取狀態
function checkCacheStatus() {
  console.log('💾 檢查快取狀態...');
  
  // 檢查 node_modules
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    const stats = fs.statSync(nodeModulesPath);
    const age = Date.now() - stats.mtime.getTime();
    const ageHours = Math.floor(age / (1000 * 60 * 60));
    
    if (ageHours > 24) {
      console.log(`⚠️  node_modules 已 ${ageHours} 小時未更新，建議重新安裝`);
    } else {
      console.log('✅ node_modules 狀態良好');
    }
  } else {
    console.log('❌ node_modules 不存在，請執行 npm install');
  }
  
  // 檢查 dist
  const distPath = path.join(projectRoot, 'dist');
  if (fs.existsSync(distPath)) {
    const stats = fs.statSync(distPath);
    const age = Date.now() - stats.mtime.getTime();
    const ageMinutes = Math.floor(age / (1000 * 60));
    
    console.log(`📦 dist 資料夾最後建置: ${ageMinutes} 分鐘前`);
  } else {
    console.log('❌ dist 資料夾不存在，請執行 npm run build');
  }
  console.log('');
}

// 4. 檢查效能配置
function checkPerformanceConfig() {
  console.log('⚡ 檢查效能配置...');
  
  // 檢查 vite.config.js
  const viteConfigPath = path.join(projectRoot, 'vite.config.js');
  if (fs.existsSync(viteConfigPath)) {
    const config = fs.readFileSync(viteConfigPath, 'utf8');
    
    const checks = [
      { pattern: /sourcemap:\s*true/, message: '⚠️  生產環境建議關閉 sourcemap' },
      { pattern: /manualChunks/, message: '✅ 已配置 chunk 分割' },
      { pattern: /chunkSizeWarningLimit/, message: '✅ 已配置 chunk 大小限制' }
    ];
    
    checks.forEach(({ pattern, message }) => {
      if (pattern.test(config)) {
        console.log(`   ${message}`);
      }
    });
  }
  console.log('');
}

// 5. 生成建議
function generateRecommendations() {
  console.log('💡 效能優化建議');
  console.log('================');
  
  const recommendations = [
    '1. 定期清理快取: npm cache clean --force',
    '2. 使用生產建置: npm run build',
    '3. 檢查網路連線和 CDN 狀態',
    '4. 監控瀏覽器開發者工具的 Network 面板',
    '5. 考慮使用 Service Worker 進行快取',
    '6. 實施圖片懶載入和代碼分割'
  ];
  
  recommendations.forEach(rec => console.log(rec));
  console.log('');
}

// 執行診斷
async function runDiagnosis() {
  try {
    checkFileSizes();
    checkDependencies();
    checkCacheStatus();
    checkPerformanceConfig();
    generateRecommendations();
    
    console.log('🎉 診斷完成！');
    console.log('如果問題持續，請提供瀏覽器開發者工具的錯誤訊息。');
    
  } catch (error) {
    console.error('❌ 診斷過程中發生錯誤:', error.message);
  }
}

runDiagnosis();