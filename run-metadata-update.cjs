const fs = require('fs');
const path = require('path');

// 簡化版的 metadata 更新腳本
async function updateMetadata() {
  try {
    console.log('🚀 開始更新 metadata...');
    
    // 讀取統一配置 stocks.json
    const configPath = path.join(__dirname, 'config/stocks.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const symbols = configData.stocks.filter(s => s.enabled).map(s => s.symbol);
    
    console.log(`📊 從 stocks.json 讀取到 ${symbols.length} 個符號`);
    console.log(`🎯 包含 RR: ${symbols.includes('RR') ? '✅' : '❌'}`);
    
    // 讀取現有的 metadata
    const metadataPath = path.join(__dirname, 'public/data/symbols_metadata.json');
    let existingMetadata = { items: [] };
    
    try {
      const existingData = fs.readFileSync(metadataPath, 'utf8');
      existingMetadata = JSON.parse(existingData);
      console.log(`📋 現有 metadata 包含 ${existingMetadata.items.length} 個符號`);
    } catch (error) {
      console.log('📋 沒有找到現有 metadata，將創建新的');
    }
    
    // 檢查缺失的符號
    const existingSymbols = existingMetadata.items.map(item => item.symbol);
    const missingSymbols = symbols.filter(symbol => !existingSymbols.includes(symbol));
    
    console.log(`🔍 缺失的符號 (${missingSymbols.length}): ${missingSymbols.join(', ')}`);
    
    // 為缺失的符號創建基本 metadata
    const newItems = missingSymbols.map(symbol => ({
      symbol: symbol,
      sector: getDefaultSector(symbol),
      industry: getDefaultIndustry(symbol),
      confidence: 0.8,
      sources: ["manual_fallback"],
      last_verified_at: new Date().toISOString(),
      market_cap_category: "unknown",
      exchange: getDefaultExchange(symbol),
      country: "United States",
      website: null,
      employee_count: null,
      business_summary: `${symbol} company information to be updated.`,
      market_cap: null,
      api_source: "manual_fallback"
    }));
    
    // 合併現有和新的 metadata
    const updatedMetadata = {
      ttl_days: 7,
      as_of: new Date().toISOString(),
      next_refresh: new Date().toISOString(),
      items: [...existingMetadata.items, ...newItems]
    };
    
    // 寫入更新的 metadata
    fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf8');
    
    console.log(`✅ Metadata 更新完成！`);
    console.log(`📊 總符號數: ${updatedMetadata.items.length}`);
    console.log(`🆕 新增符號數: ${newItems.length}`);
    
    // 驗證 RR 是否包含
    const rrMetadata = updatedMetadata.items.find(item => item.symbol === 'RR');
    if (rrMetadata) {
      console.log(`✅ RR metadata 已添加: Sector=${rrMetadata.sector}, Industry=${rrMetadata.industry}`);
    } else {
      console.log(`❌ RR metadata 仍然缺失`);
    }
    
  } catch (error) {
    console.error('❌ 更新 metadata 失敗:', error);
  }
}

function getDefaultSector(symbol) {
  const sectorMap = {
    'RR': 'Technology',
    'VST': 'Utilities',
    'KTOS': 'Industrials',
    'MELI': 'Consumer Cyclical',
    'SOFI': 'Financial Services',
    'EOSE': 'Energy',
    'CEG': 'Utilities',
    'TMDX': 'Healthcare',
    'GRAB': 'Technology',
    'RBLX': 'Communication Services',
    'IREN': 'Technology',
    'INTR': 'Technology',
    'KSPI': 'Technology',
    'LUNR': 'Industrials',
    'HOOD': 'Financial Services',
    'APP': 'Technology',
    'CHYM': 'Healthcare',
    'COIN': 'Financial Services',
    'IBKR': 'Financial Services',
    'CCJ': 'Energy',
    'MSFT': 'Technology',
    'ADBE': 'Technology',
    'PANW': 'Technology',
    'CRWD': 'Technology',
    'DDOG': 'Technology',
    'DUOL': 'Consumer Cyclical',
    'AXON': 'Industrials',
    'ALAB': 'Healthcare',
    'LRCX': 'Technology',
    'BWXT': 'Energy',
    'RBRK': 'Technology',
    'OKLO': 'Energy',
    'PATH': 'Technology',
    'SE': 'Consumer Cyclical',
    'NU': 'Financial Services',
    'CRCL': 'Healthcare',
    'VRT': 'Technology',
    'ETN': 'Industrials',
    'FIG': 'Financial Services',
    'ZETA': 'Technology',
    'MP': 'Basic Materials',
    'UUUU': 'Energy',
    'UMAC': 'Technology'
  };
  
  return sectorMap[symbol] || 'Technology';
}

function getDefaultIndustry(symbol) {
  const industryMap = {
    'RR': 'Software - Application',
    'VST': 'Utilities - Regulated Electric',
    'KTOS': 'Aerospace & Defense',
    'MELI': 'Internet Retail',
    'SOFI': 'Credit Services',
    'EOSE': 'Solar',
    'CEG': 'Utilities - Regulated Electric',
    'TMDX': 'Medical Devices',
    'GRAB': 'Software - Application',
    'RBLX': 'Electronic Gaming & Multimedia',
    'IREN': 'Software - Infrastructure',
    'INTR': 'Software - Application',
    'KSPI': 'Software - Application',
    'LUNR': 'Aerospace & Defense',
    'HOOD': 'Capital Markets',
    'APP': 'Software - Application',
    'CHYM': 'Biotechnology',
    'COIN': 'Financial Data & Stock Exchanges',
    'IBKR': 'Capital Markets',
    'CCJ': 'Uranium',
    'MSFT': 'Software - Infrastructure',
    'ADBE': 'Software - Application',
    'PANW': 'Software - Infrastructure',
    'CRWD': 'Software - Infrastructure',
    'DDOG': 'Software - Infrastructure',
    'DUOL': 'Education & Training Services',
    'AXON': 'Aerospace & Defense',
    'ALAB': 'Medical Devices',
    'LRCX': 'Semiconductor Equipment & Materials',
    'BWXT': 'Specialty Industrial Machinery',
    'RBRK': 'Software - Infrastructure',
    'OKLO': 'Utilities - Independent Power Producers',
    'PATH': 'Software - Application',
    'SE': 'Internet Retail',
    'NU': 'Banks - Regional',
    'CRCL': 'Medical Care Facilities',
    'VRT': 'Software - Application',
    'ETN': 'Specialty Industrial Machinery',
    'FIG': 'Asset Management',
    'ZETA': 'Software - Application',
    'MP': 'Other Industrial Metals & Mining',
    'UUUU': 'Uranium',
    'UMAC': 'Software - Application'
  };
  
  return industryMap[symbol] || 'Software - Application';
}

function getDefaultExchange(symbol) {
  const exchangeMap = {
    'UUUU': 'AMEX',
    'UMAC': 'AMEX'
  };
  
  return exchangeMap[symbol] || 'NASDAQ';
}

// 執行更新
updateMetadata();