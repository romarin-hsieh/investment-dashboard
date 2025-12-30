#!/usr/bin/env node

/**
 * Cleanup Old Technical Indicators Script
 * 
 * 清理超過 30 天的技術指標日檔，防止 repository 無限膨脹
 * 只清理 YYYY-MM-DD_SYMBOL.json 格式的文件，保留 latest_index.json
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const DAY_MS = 24 * 60 * 60 * 1000

function parseArgs(argv) {
  const args = {
    retentionDays: 30,
    dryRun: false,
    asOf: null,
    verbose: false
  }

  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--verbose') args.verbose = true
    else if (a.startsWith('--retention-days=')) {
      args.retentionDays = Number(a.split('=')[1])
    } else if (a.startsWith('--as-of=')) {
      args.asOf = a.split('=')[1]
    }
  }

  if (!Number.isFinite(args.retentionDays) || args.retentionDays < 1 || args.retentionDays > 365) {
    throw new Error(`Invalid --retention-days: ${args.retentionDays}`)
  }

  if (args.asOf && !/^\d{4}-\d{2}-\d{2}$/.test(args.asOf)) {
    throw new Error(`Invalid --as-of: ${args.asOf} (expected YYYY-MM-DD)`)
  }

  return args
}

function ymdToUtcEpoch(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// 台北「今天」：用 Intl 取 YYYY-MM-DD（不靠外部套件）
function getTodayYmdTaipei() {
  // en-CA 會回 YYYY-MM-DD
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' })
  return fmt.format(new Date())
}

async function readLatestIndexDate(latestIndexPath) {
  try {
    const raw = await fs.readFile(latestIndexPath, 'utf8')
    const json = JSON.parse(raw)
    const date = json?.date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`latest_index.json missing/invalid "date": ${date}`)
    }
    return date
  } catch (error) {
    throw new Error(`Cannot read latest_index.json: ${error.message}`)
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const repoRoot = process.cwd()
  const indicatorsDir = path.join(repoRoot, 'public', 'data', 'technical-indicators')
  const latestIndexPath = path.join(indicatorsDir, 'latest_index.json')

  console.log(`🧹 Cleanup Technical Indicators (keep last ${args.retentionDays} days)`)

  // 1) 決定 asOfDate
  let asOfDate = args.asOf
  if (!asOfDate) {
    try {
      asOfDate = await readLatestIndexDate(latestIndexPath)
      console.log(`📅 Using asOfDate from latest_index.json: ${asOfDate}`)
    } catch (e) {
      // fallback：台北今天（避免 workflow 因暫時缺檔而整個 fail）
      asOfDate = getTodayYmdTaipei()
      console.warn(`⚠️ latest_index.json not usable, fallback asOfDate=${asOfDate}. reason=${e?.message ?? e}`)
    }
  } else {
    console.log(`📅 Using specified asOfDate: ${asOfDate}`)
  }

  const asOfEpoch = ymdToUtcEpoch(asOfDate)
  const cutoffEpoch = asOfEpoch - (args.retentionDays - 1) * DAY_MS // 含 asOfDate 共保留 N 天

  // 2) 掃描目錄
  let all
  try {
    all = await fs.readdir(indicatorsDir)
  } catch (error) {
    console.error(`❌ Cannot read directory ${indicatorsDir}: ${error.message}`)
    process.exit(1)
  }

  const dayFileRe = /^(\d{4}-\d{2}-\d{2})_(.+)\.json$/ // YYYY-MM-DD_SYMBOL.json
  const candidates = []

  for (const filename of all) {
    const m = filename.match(dayFileRe)
    if (!m) continue
    const fileDate = m[1]
    const symbol = m[2]
    const fileEpoch = ymdToUtcEpoch(fileDate)
    candidates.push({ filename, fileDate, symbol, fileEpoch })
  }

  console.log(`📊 Found ${candidates.length} technical indicator day-files`)

  // 3) Guardrail：確保 asOfDate 不離「最新檔案日期」太遠（避免 asOfDate 解析錯導致大清空）
  if (candidates.length > 0) {
    const maxEpoch = Math.max(...candidates.map(x => x.fileEpoch))
    const diffDays = Math.floor((asOfEpoch - maxEpoch) / DAY_MS)
    if (diffDays > 7) {
      throw new Error(`Guardrail: asOfDate(${asOfDate}) is >7 days newer than latest fileDate. ` +
        `Possible wrong asOfDate. diffDays=${diffDays}`)
    }
    if (diffDays < -1) {
      console.warn(`⚠️ asOfDate(${asOfDate}) is older than latest fileDate by ${Math.abs(diffDays)} days`)
    }
  }

  // 4) 決定刪除清單
  const toDelete = candidates.filter(x => x.fileEpoch < cutoffEpoch).sort((a, b) => a.fileEpoch - b.fileEpoch)
  const keepCount = candidates.length - toDelete.length

  console.log(`📈 Analysis:`)
  console.log(`  - asOfDate: ${asOfDate}`)
  console.log(`  - retentionDays: ${args.retentionDays}`)
  console.log(`  - candidates(day-files): ${candidates.length}`)
  console.log(`  - keep: ${keepCount}`)
  console.log(`  - delete: ${toDelete.length}`)
  console.log(`  - mode: ${args.dryRun ? 'DRY_RUN' : 'DELETE'}`)

  if (args.verbose && toDelete.length > 0) {
    const sample = toDelete.slice(0, 50).map(x => `    ${x.filename} (${x.fileDate})`).join('\n')
    console.log(`📄 Delete list (first 50):`)
    console.log(sample)
    if (toDelete.length > 50) {
      console.log(`    ... (+${toDelete.length - 50} more files)`)
    }
  }

  // 5) 安全檢查：避免一次刪太多
  if (toDelete.length > 500) {
    throw new Error(`Guardrail: Attempting to delete ${toDelete.length} files (>500). This seems excessive. Please check asOfDate and retentionDays.`)
  }

  if (args.dryRun) {
    console.log(`✅ Dry run completed. Would delete ${toDelete.length} files.`)
    return
  }

  if (toDelete.length === 0) {
    console.log(`✅ No files to delete.`)
    return
  }

  // 6) 實際刪除（逐一 unlink，避免 Promise.all 太多檔時卡住）
  let deleted = 0
  let errors = 0

  for (const f of toDelete) {
    const fullPath = path.join(indicatorsDir, f.filename)
    try {
      await fs.unlink(fullPath)
      deleted++
      if (args.verbose) {
        console.log(`🗑️ Deleted: ${f.filename}`)
      }
    } catch (e) {
      // 允許重跑時遇到檔案已被刪除
      if (e?.code === 'ENOENT') {
        if (args.verbose) {
          console.log(`⚠️ Already deleted: ${f.filename}`)
        }
      } else {
        console.error(`❌ Failed to delete ${f.filename}: ${e.message}`)
        errors++
      }
    }
  }

  console.log(`✅ Cleanup completed:`)
  console.log(`  - Deleted: ${deleted} files`)
  console.log(`  - Errors: ${errors} files`)
  console.log(`  - Remaining: ${keepCount} files`)

  if (errors > 0) {
    console.warn(`⚠️ ${errors} files could not be deleted. Check permissions or file locks.`)
  }
}

main().catch(err => {
  console.error('❌ cleanup-old-technical-indicators failed:', err.message)
  process.exit(1)
})