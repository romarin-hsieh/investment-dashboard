<template>
  <div v-if="isOpen" class="settings-modal-overlay" @click.self="close">
    <div class="settings-modal">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Tabs -->
        <div class="tabs">
          <button 
            v-for="tab in ['Inputs', 'Style']" 
            :key="tab"
            class="tab-btn" 
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            {{ tab }}
          </button>
        </div>

        <!-- Inputs Tab -->
        <div v-show="activeTab === 'Inputs'" class="tab-content">
          <div v-for="field in inputFields" :key="field.key" class="setting-row">
            <label class="setting-label">
              {{ field.label }}
              <span v-if="field.tooltip" class="info-icon" :title="field.tooltip">ⓘ</span>
            </label>
            <div class="setting-input">
              <!-- Boolean (Checkbox) -->
              <input 
                v-if="field.type === 'boolean' || field.type === 'checkbox'" 
                type="checkbox" 
                :checked="localModel[field.key]"
                @change="updateValue(field.key, $event.target.checked)"
              >
              
              <!-- Number -->
              <input 
                v-else-if="field.type === 'number'" 
                type="number" 
                :value="localModel[field.key]"
                :min="field.min"
                :max="field.max"
                :step="field.step || 1"
                @input="updateValue(field.key, Number($event.target.value))"
              >
              
              <!-- Select -->
              <select 
                v-else-if="field.type === 'select'"
                :value="localModel[field.key]"
                @change="updateValue(field.key, $event.target.value)"
              >
                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>

              <!-- Text -->
              <input 
                v-else 
                type="text" 
                :value="localModel[field.key]" 
                @input="updateValue(field.key, $event.target.value)"
              >
            </div>
          </div>
        </div>

        <!-- Style Tab -->
        <div v-show="activeTab === 'Style'" class="tab-content">
          <div v-for="field in styleFields" :key="field.key" class="setting-row">
            <label class="setting-label">{{ field.label }}</label>
            
            <div class="setting-input style-input-group">
                <!-- Select -->
                <select 
                    v-if="field.type === 'select'"
                    :value="localModel[field.key]"
                    @change="updateValue(field.key, $event.target.value)"
                >
                    <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>

                <!-- Color Preview (Only for text inputs that look like color) -->
                <div v-else-if="field.key.toLowerCase().includes('color')" 
                     class="color-preview" 
                     :style="{ backgroundColor: localModel[field.key] }">
                </div>
                
                <!-- Text Input (Default for Style) -->
                <input 
                   v-if="field.type !== 'select'"
                   type="text" 
                   :value="localModel[field.key]" 
                   class="color-input"
                   @change="updateValue(field.key, $event.target.value)"
                >
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="close">Cancel</button>
        <button class="btn-save" @click="save">OK</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GenericSettingsModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Settings'
    },
    schema: {
      type: Array,
      required: true,
      // Example: [{ key: 'len', label: 'Length', type: 'number', group: 'Inputs' }]
    },
    modelValue: {
      type: Object,
      required: true
    }
  },
  emits: ['update:isOpen', 'save'],
  data() {
    return {
      activeTab: 'Inputs',
      localModel: {}
    }
  },
  computed: {
    inputFields() {
      return this.schema.filter(f => !f.group || f.group === 'Inputs');
    },
    styleFields() {
      return this.schema.filter(f => f.group === 'Style');
    }
  },
  watch: {
    isOpen(val) {
      if (val) {
        // Clone modelValue to localModel to avoid mutating parent state directly
        this.localModel = JSON.parse(JSON.stringify(this.modelValue));
      }
    }
  },
  methods: {
    close() {
      this.$emit('update:isOpen', false);
    },
    save() {
      this.$emit('save', this.localModel);
      this.close();
    },
    updateValue(key, value) {
      this.localModel[key] = value;
    }
  }
}
</script>

<style scoped>
.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.settings-modal {
  background: var(--bg-card);
  width: 400px;
  max-width: 90%;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-body {
  padding: 0;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 500;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: var(--bg-card);
}

.tab-content {
  padding: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.setting-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-icon {
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: help;
}

.setting-input input[type="number"],
.setting-input input[type="text"],
.setting-input select {
  padding: 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  width: 100px;
}

.setting-input input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
}

.style-input-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.color-preview {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}

.btn-save {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-save:hover {
  background: var(--primary-color-dark, #2962ff);
}
</style>
