#!/usr/bin/env node

// 測試自動更新系統
import { autoUpdateScheduler } from '../src/utils/autoUpdateScheduler.js'

console.log('🧪 Testing Auto Update System...')

async function testAutoUpdate() {
  try {
    console.log('📊 Getting scheduler status...')
    const status = autoUpdateScheduler.getStatus()
    console.log('Status:', JSON.stringify(status, null, 2))
    
    console.log('🚀 Starting scheduler...')
    autoUpdateScheduler.start()
    
    console.log('⏳ Waiting 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('📊 Getting updated status...')
    const updatedStatus = autoUpdateScheduler.getStatus()
    console.log('Updated Status:', JSON.stringify(updatedStatus, null, 2))
    
    console.log('🛑 Stopping scheduler...')
    autoUpdateScheduler.stop()
    
    console.log('✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testAutoUpdate()