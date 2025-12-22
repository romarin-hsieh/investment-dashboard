import { StateManager } from './src/utils/state-manager.js'

const result = StateManager.updateHolding('TEST', -1)
console.log('Error message:', result.error?.message)
console.log('Full error:', result.error)