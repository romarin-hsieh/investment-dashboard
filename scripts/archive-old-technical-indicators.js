#!/usr/bin/env node

/**
 * Archive Old Technical Indicators Script
 * 
 * 保留最近 30 天的技術指標文件，將舊文件歸檔到 GitHub Release assets
 * 防止 repository 大小無限膨脹
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const RETENTION_DAYS = 30;
const INDICATORS_DIR = path.join(__dirname, '..', 'public', 'data', 'technical-indicators');
const TEMP_ARCHIVE_DIR = path.join(__dirname, '..', 'temp-archive');

/**
 * 主要歸檔函數
 */
async function archiveOldIndicators() {
  console.log('🗂️ Starting technical indicators archival process...');
  
  try {
    // 1. 計算截止日期
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log(`📅 Cutoff date: ${cutoffDateStr} (keeping files newer than this)`);
    
    // 2. 檢查目錄是否存在
    try {
      await fs.access(INDICATORS_DIR);
    } catch (error) {
      console.log('📂 Technical indicators directory not found, nothing to archive');
      return;
    }
    
    // 3. 讀取所有文件
    const files = await fs.readdir(INDICATORS_DIR);
    const dateFiles = files.filter(file => 
      file.match(/^\d{4}-\d{2}-\d{2}_[A-Z]+\.json$/) && 
      file !== 'latest_index.json'
    );
    
    console.log(`📊 Found ${dateFiles.length} dated technical indicator files`);
    
    // 4. 分類文件：保留 vs 歸檔
    const filesToKeep = [];
    const filesToArchive = [];
    
    for (const file of dateFiles) {
      const fileDate = file.split('_')[0]; // 提取 YYYY-MM-DD
      if (fileDate < cutoffDateStr) {
        filesToArchive.push(file);
      } else {
        filesToKeep.push(file);
      }
    }
    
    console.log(`📦 Files to keep: ${filesToKeep.length}`);
    console.log(`🗃️ Files to archive: ${filesToArchive.length}`);
    
    if (filesToArchive.length === 0) {
      console.log('✅ No files need archiving');
      return;
    }
    
    // 5. 按月分組要歸檔的文件
    const filesByMonth = groupFilesByMonth(filesToArchive);
    
    // 6. 為每個月創建歸檔
    for (const [month, monthFiles] of Object.entries(filesByMonth)) {
      await createMonthlyArchive(month, monthFiles);
    }
    
    // 7. 刪除已歸檔的文件
    await removeArchivedFiles(filesToArchive);
    
    // 8. 更新 latest_index.json 如果需要
    await updateLatestIndex();
    
    console.log('✅ Technical indicators archival completed successfully');
    
  } catch (error) {
    console.error('❌ Archival process failed:', error);
    process.exit(1);
  }
}

/**
 * 按月分組文件
 */
function groupFilesByMonth(files) {
  const groups = {};
  
  for (const file of files) {
    const fileDate = file.split('_')[0]; // YYYY-MM-DD
    const month = fileDate.substring(0, 7); // YYYY-MM
    
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(file);
  }
  
  return groups;
}

/**
 * 創建月度歸檔
 */
async function createMonthlyArchive(month, files) {
  console.log(`📦 Creating archive for ${month} (${files.length} files)`);
  
  try {
    // 創建臨時目錄
    await fs.mkdir(TEMP_ARCHIVE_DIR, { recursive: true });
    
    const archiveDir = path.join(TEMP_ARCHIVE_DIR, month);
    await fs.mkdir(archiveDir, { recursive: true });
    
    // 複製文件到臨時目錄
    for (const file of files) {
      const sourcePath = path.join(INDICATORS_DIR, file);
      const destPath = path.join(archiveDir, file);
      await fs.copyFile(sourcePath, destPath);
    }
    
    // 創建 ZIP 歸檔
    const archiveName = `archive-technical-indicators-${month}.zip`;
    const archivePath = path.join(TEMP_ARCHIVE_DIR, archiveName);
    
    // 使用系統 zip 命令創建歸檔
    const zipCommand = process.platform === 'win32' 
      ? `powershell Compress-Archive -Path "${archiveDir}\\*" -DestinationPath "${archivePath}" -Force`
      : `cd "${TEMP_ARCHIVE_DIR}" && zip -r "${archiveName}" "${month}/"`;
    
    execSync(zipCommand, { stdio: 'inherit' });
    
    // 上傳到 GitHub Release
    await uploadToRelease(month, archivePath);
    
    // 清理臨時文件
    await fs.rm(archiveDir, { recursive: true, force: true });
    await fs.rm(archivePath, { force: true });
    
    console.log(`✅ Archive created and uploaded for ${month}`);
    
  } catch (error) {
    console.error(`❌ Failed to create archive for ${month}:`, error);
    throw error;
  }
}

/**
 * 上傳歸檔到 GitHub Release
 */
async function uploadToRelease(month, archivePath) {
  const releaseTag = `archive-${month}`;
  const archiveName = path.basename(archivePath);
  
  try {
    // 檢查 Release 是否存在，不存在則創建
    try {
      execSync(`gh release view "${releaseTag}"`, { stdio: 'pipe' });
      console.log(`📋 Release ${releaseTag} already exists`);
    } catch (error) {
      console.log(`📋 Creating release ${releaseTag}`);
      execSync(`gh release create "${releaseTag}" --title "Data Archive ${month}" --notes "Archived technical indicators for ${month}"`, { stdio: 'inherit' });
    }
    
    // 上傳歸檔文件
    console.log(`📤 Uploading ${archiveName} to release ${releaseTag}`);
    execSync(`gh release upload "${releaseTag}" "${archivePath}" --clobber`, { stdio: 'inherit' });
    
  } catch (error) {
    console.error(`❌ Failed to upload to release ${releaseTag}:`, error);
    throw error;
  }
}

/**
 * 刪除已歸檔的文件
 */
async function removeArchivedFiles(files) {
  console.log(`🗑️ Removing ${files.length} archived files from repository`);
  
  for (const file of files) {
    const filePath = path.join(INDICATORS_DIR, file);
    try {
      await fs.unlink(filePath);
      console.log(`   Removed: ${file}`);
    } catch (error) {
      console.error(`   Failed to remove ${file}:`, error);
    }
  }
}

/**
 * 更新 latest_index.json
 */
async function updateLatestIndex() {
  const indexPath = path.join(INDICATORS_DIR, 'latest_index.json');
  
  try {
    // 讀取現有索引
    let index = {};
    try {
      const indexContent = await fs.readFile(indexPath, 'utf8');
      index = JSON.parse(indexContent);
    } catch (error) {
      console.log('📋 No existing latest_index.json found, will create new one');
    }
    
    // 重新掃描剩餘文件
    const files = await fs.readdir(INDICATORS_DIR);
    const dateFiles = files.filter(file => 
      file.match(/^\d{4}-\d{2}-\d{2}_[A-Z]+\.json$/)
    );
    
    // 找出最新日期
    const dates = [...new Set(dateFiles.map(file => file.split('_')[0]))].sort();
    const latestDate = dates[dates.length - 1];
    
    if (latestDate) {
      // 更新索引
      index.date = latestDate;
      index.generatedAt = new Date().toISOString();
      index.retentionDays = RETENTION_DAYS;
      index.totalFiles = dateFiles.length;
      index.availableDates = dates;
      
      // 寫入更新的索引
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
      console.log(`📋 Updated latest_index.json with latest date: ${latestDate}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to update latest_index.json:', error);
  }
}

/**
 * 清理臨時目錄
 */
async function cleanup() {
  try {
    await fs.rm(TEMP_ARCHIVE_DIR, { recursive: true, force: true });
    console.log('🧹 Cleaned up temporary files');
  } catch (error) {
    console.error('⚠️ Failed to clean up temporary files:', error);
  }
}

// 主程序執行
if (require.main === module) {
  archiveOldIndicators()
    .then(() => cleanup())
    .catch((error) => {
      console.error('❌ Script failed:', error);
      cleanup().finally(() => process.exit(1));
    });
}

module.exports = {
  archiveOldIndicators,
  RETENTION_DAYS
};