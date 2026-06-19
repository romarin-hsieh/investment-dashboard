<template>
  <div
    v-if="isOpen"
    ref="overlay"
    class="settings-modal-overlay"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="close"
    @keydown.tab="handleTab"
    @keydown.escape="close"
  >
    <div class="settings-modal">
      <div class="modal-header">
        <h3 :id="titleId">{{ displayTitle }}</h3>
        <button ref="closeBtn" class="close-btn" @click="close" :aria-label="$t('settingsModal.closeAriaLabel')">&times;</button>
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
            {{ tabLabel(tab) }}
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
        <button class="btn-cancel" @click="close">{{ $t('settingsModal.cancel') }}</button>
        <button class="btn-save" @click="save">{{ $t('settingsModal.save') }}</button>
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
      default: ''
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
      localModel: {},
      // PR-F2: a11y bookkeeping. `previouslyFocused` saves the element that
      // had focus before the modal opened so we can restore it on close.
      // `titleId` is generated once per instance so `aria-labelledby` points
      // at the header `<h3>` regardless of how many modals coexist.
      previouslyFocused: null,
      titleId: `settings-modal-title-${Math.random().toString(36).slice(2, 9)}`
    }
  },
  computed: {
    displayTitle() {
      return this.title || this.$t('settingsModal.defaultTitle');
    },
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
        // PR-F2: save the previously-focused element so we can restore on
        // close, then move focus into the modal (close button is the
        // semantically correct first stop — every modal has it; tab-btns
        // come right after).
        this.previouslyFocused = document.activeElement || document.body;
        this.$nextTick(() => {
          this.$refs.closeBtn?.focus();
        });
      } else {
        // Restore focus to whatever had it before the modal opened.
        const target = this.previouslyFocused;
        this.previouslyFocused = null;
        if (target && typeof target.focus === 'function') {
          target.focus();
        }
      }
    }
  },
  methods: {
    tabLabel(tab) {
      // `tab` is a stable internal key ('Inputs' | 'Style'); only its display
      // text is localized, the comparison/state value stays untranslated.
      const map = { Inputs: 'settingsModal.tabInputs', Style: 'settingsModal.tabStyle' };
      return map[tab] ? this.$t(map[tab]) : tab;
    },
    close() {
      this.$emit('update:isOpen', false);
    },
    save() {
      this.$emit('save', this.localModel);
      this.close();
    },
    updateValue(key, value) {
      this.localModel[key] = value;
    },
    // PR-F2: standard focus-trap cycle. Query all focusables inside the
    // overlay (close, tabs, form inputs, Cancel/Save), wrap focus at
    // boundaries. Unlike the simpler `KeyboardShortcutsOverlay` (1
    // focusable), this modal has many focusables so the cycle is real.
    handleTab(event) {
      const overlay = this.$refs.overlay;
      if (!overlay) return;
      const focusables = overlay.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
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
  border-radius: var(--radius-md); /* align modal corners with the card baseline */
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: var(--space-4);
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
  font-size: var(--text-xl);
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
  padding: var(--space-3) var(--space-6);
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: var(--weight-medium);
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: var(--bg-card);
}

.tab-content {
  padding: var(--space-6);
  max-height: 400px;
  overflow-y: auto;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.setting-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: var(--space-2);
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
  border-radius: var(--radius-xs);
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
    gap: var(--space-2);
}

.color-preview {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border-color);
}

.modal-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.btn-cancel {
  padding: var(--space-2) var(--space-4);
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xs);
  cursor: pointer;
}

.btn-save {
  padding: var(--space-2) var(--space-4);
  background: var(--primary-strong);
  color: white;
  border: none;
  border-radius: var(--radius-xs);
  cursor: pointer;
}

.btn-save:hover {
  background: var(--primary-hover);
}
</style>
