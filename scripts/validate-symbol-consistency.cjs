const fs = require('fs');
const path = require('path');

/**
 * 符號數據一致性驗證工具
 * 檢查所有數據源中的符號是否一致，避免 RR 符號可見性問題重現
 */

class SymbolConsistencyValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.dataSources = {
      universe: path.join(this.projectRoot, 'config/universe.json'),
      quotes: path.join(this.projectRoot, 'public/data/quotes/latest.json'),
      metadata: path.join(this.projectRoot, 'public/data/symbols_metadata.json'),
      symbolsConfig: path.join(this.projectRoot, 'src/utils/symbolsConfig.js'),
      staticService: path.join(this.projectRoot, 'src/utils/staticSectorIndustryService.js')
    };
  }

  // 讀取各數據源的符號列表
  async loadAllSymbols() {
    const symbols = {};

    try {
      // 1. Universe.json
      const universeData = JSON.parse(fs.readFileSync(this.dataSources.universe, 'utf8'));
      symbols.universe = universeData.symbols || [];

      // 2. Quotes
      const quotesData = JSON.parse(fs.readFileSync(this.dataSources.quotes, 'utf8'));
      symbols.quotes = quotesData.items.map(item => item.symbol);

      // 3. Metadata
      const metadataData = JSON.parse(fs.readFileSync(this.dataSources.metadata, 'utf8'));
      symbols.metadata = metadataData.items.map(item => item.symbol);

      // 4. SymbolsConfig (從文件中提取)
      const symbolsConfigContent = fs.readFileSync(this.dataSources.symbolsConfig, 'utf8');
      const staticSymbolsMatch = symbolsConfigContent.match(/getStaticSymbols\(\)\s*\{[^}]*return\s*\[([\s\S]*?)\]/);
      if (staticSymbolsMatch) {
        const symbolsString = staticSymbolsMatch[1];
        symbols.symbolsConfig = symbolsString
          .split(',')
          .map(s => s.trim().replace(/['"]/g, ''))
          .filter(s => s && !s.startsWith('//'));
      } else {
        symbols.symbolsConfig = [];
      }

      // 5. StaticService (從文件中提取)
      const staticServiceContent = fs.readFileSync(this.dataSources.staticService, 'utf8');
      const fallbackSymbolsMatch = staticServiceContent.match(/fallbackSymbols\s*=\s*\[([\s\S]*?)\]/);
      if (fallbackSymbolsMatch) {
        const symbolsString = fallbackSymbolsMatch[1];
        symbols.staticService = symbolsString
          .split(',')
          .map(s => s.trim().replace(/['"]/g, ''))
          .filter(s => s && !s.startsWith('//'));
      } else {
        symbols.staticService = [];
      }

      return symbols;
    } catch (error) {
      console.error('❌ 讀取數據源失敗:', error.message);
      throw error;
    }
  }

  // 檢查數據一致性
  validateConsistency(symbols) {
    const universeSymbols = symbols.universe;
    const issues = [];
    const summary = {
      universe: universeSymbols.length,
      quotes: symbols.quotes.length,
      metadata: symbols.metadata.length,
      symbolsConfig: symbols.symbolsConfig.length,
      staticService: symbols.staticService.length
    };

    console.log('📊 數據源符號統計:');
    Object.entries(summary).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} 個符號`);
    });

    // 檢查缺失的符號
    const dataSourcesToCheck = ['quotes', 'metadata', 'symbolsConfig', 'staticService'];
    
    dataSourcesToCheck.forEach(source => {
      const missing = universeSymbols.filter(symbol => !symbols[source].includes(symbol));
      const extra = symbols[source].filter(symbol => !universeSymbols.includes(symbol));
      
      if (missing.length > 0) {
        issues.push({
          type: 'missing',
          source: source,
          symbols: missing,
          severity: source === 'metadata' ? 'critical' : 'warning'
        });
      }
      
      if (extra.length > 0) {
        issues.push({
          type: 'extra',
          source: source,
          symbols: extra,
          severity: 'info'
        });
      }
    });

    return { summary, issues };
  }

  // 檢查 metadata 品質
  validateMetadataQuality() {
    try {
      const metadataData = JSON.parse(fs.readFileSync(this.dataSources.metadata, 'utf8'));
      const qualityIssues = [];

      metadataData.items.forEach(item => {
        // 檢查 confidence
        if (item.confidence < 0.7) {
          qualityIssues.push({
            symbol: item.symbol,
            issue: 'low_confidence',
            value: item.confidence,
            impact: 'Will be grouped as "Unknown" in StockOverview'
          });
        }

        // 檢查 sector
        if (!item.sector || item.sector === 'Unknown' || item.sector.trim() === '') {
          qualityIssues.push({
            symbol: item.symbol,
            issue: 'missing_sector',
            value: item.sector,
            impact: 'Will be grouped as "Unknown" in StockOverview'
          });
        }

        // 檢查 industry
        if (!item.industry || item.industry.trim() === '') {
          qualityIssues.push({
            symbol: item.symbol,
            issue: 'missing_industry',
            value: item.industry,
            impact: 'Industry information will not be displayed'
          });
        }

        // 檢查 exchange
        if (!item.exchange) {
          qualityIssues.push({
            symbol: item.symbol,
            issue: 'missing_exchange',
            value: item.exchange,
            impact: 'Exchange information will not be displayed'
          });
        }
      });

      return qualityIssues;
    } catch (error) {
      console.error('❌ 檢查 metadata 品質失敗:', error.message);
      return [];
    }
  }

  // 生成報告
  generateReport(symbols, validation, qualityIssues) {
    console.log('\n🔍 符號數據一致性驗證報告');
    console.log('='.repeat(50));

    // 一致性檢查結果
    const criticalIssues = validation.issues.filter(issue => issue.severity === 'critical');
    const warningIssues = validation.issues.filter(issue => issue.severity === 'warning');
    
    if (criticalIssues.length === 0 && warningIssues.length === 0) {
      console.log('✅ 所有數據源符號完全一致！');
    } else {
      console.log(`❌ 發現 ${criticalIssues.length} 個嚴重問題，${warningIssues.length} 個警告`);
    }

    // 詳細問題報告
    validation.issues.forEach(issue => {
      const icon = issue.severity === 'critical' ? '❌' : 
                   issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      
      console.log(`\n${icon} ${issue.source} - ${issue.type}:`);
      console.log(`   符號: ${issue.symbols.join(', ')}`);
      
      if (issue.type === 'missing' && issue.source === 'metadata') {
        console.log('   影響: 這些符號在 StockOverview 中不會顯示！');
        console.log('   解決: 運行 node run-metadata-update.cjs');
      }
    });

    // Metadata 品質報告
    if (qualityIssues.length > 0) {
      console.log('\n⚠️ Metadata 品質問題:');
      qualityIssues.forEach(issue => {
        console.log(`   ${issue.symbol}: ${issue.issue} (${issue.value})`);
        console.log(`     影響: ${issue.impact}`);
      });
    } else {
      console.log('\n✅ Metadata 品質良好');
    }

    // 建議修復步驟
    const hasMetadataMissing = criticalIssues.some(issue => 
      issue.source === 'metadata' && issue.type === 'missing'
    );
    
    if (hasMetadataMissing || qualityIssues.length > 0) {
      console.log('\n🛠️ 建議修復步驟:');
      if (hasMetadataMissing) {
        console.log('1. 運行: node run-metadata-update.cjs');
      }
      if (qualityIssues.length > 0) {
        console.log('2. 檢查並修復 metadata 品質問題');
      }
      console.log('3. 清除瀏覽器緩存並重新測試');
    }

    return {
      isHealthy: criticalIssues.length === 0 && qualityIssues.length === 0,
      criticalIssues: criticalIssues.length,
      warnings: warningIssues.length + qualityIssues.length
    };
  }

  // 主驗證流程
  async validate() {
    try {
      console.log('🚀 開始符號數據一致性驗證...\n');

      // 載入所有符號數據
      const symbols = await this.loadAllSymbols();

      // 驗證一致性
      const validation = this.validateConsistency(symbols);

      // 檢查 metadata 品質
      const qualityIssues = this.validateMetadataQuality();

      // 生成報告
      const report = this.generateReport(symbols, validation, qualityIssues);

      console.log('\n' + '='.repeat(50));
      if (report.isHealthy) {
        console.log('🎉 驗證完成：系統健康，所有符號數據一致！');
      } else {
        console.log(`⚠️ 驗證完成：發現 ${report.criticalIssues} 個嚴重問題，${report.warnings} 個警告`);
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ 驗證過程失敗:', error.message);
      process.exit(1);
    }
  }
}

// 執行驗證
if (require.main === module) {
  const validator = new SymbolConsistencyValidator();
  validator.validate();
}

module.exports = SymbolConsistencyValidator;