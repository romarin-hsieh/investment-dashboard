import { ref, watch, onMounted } from 'vue'

const theme = ref('light')

export function useTheme() {
    const toggleTheme = () => {
        theme.value = theme.value === 'light' ? 'dark' : 'light'
        applyTheme()
    }

    const setTheme = (newTheme) => {
        if (['light', 'dark'].includes(newTheme)) {
            theme.value = newTheme
            applyTheme()
        }
    }

    const applyTheme = () => {
        const root = document.documentElement
        if (theme.value === 'dark') {
            root.classList.add('dark-mode')
            root.setAttribute('data-theme', 'dark')
        } else {
            root.classList.remove('dark-mode')
            root.setAttribute('data-theme', 'light')
        }
        localStorage.setItem('theme', theme.value)
    }

    onMounted(() => {
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme) {
            theme.value = savedTheme
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme.value = 'dark'
        }
        applyTheme()
    })

    return {
        theme,
        toggleTheme,
        setTheme
    }
}
