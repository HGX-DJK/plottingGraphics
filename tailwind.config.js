/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#0a0f1d',
          card: '#111827',
          panel: '#151d30',
          border: '#1f2d48',
          accent: '#3b82f6',
          highlight: '#06b6d4',
          warning: '#f59e0b',
          danger: '#ef4444',
          success: '#10b981'
        }
      },
      transitionDuration: {
        // 非默认档位：用于底部抽屉的滑入过渡
        250: '250ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      spacing: {
        // 统一悬浮控件与底栏的安全间距
        'safe-b': 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
      },
      boxShadow: {
        // 悬浮层通用阴影，提升暗色模式下层次感
        float: '0 10px 30px -10px rgba(15, 23, 42, 0.35), 0 2px 8px -4px rgba(15, 23, 42, 0.2)',
        'float-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.7), 0 2px 8px -4px rgba(0, 0, 0, 0.5)',
        panel: '0 -8px 28px -12px rgba(15, 23, 42, 0.28)',
        'panel-dark': '0 -8px 28px -12px rgba(0, 0, 0, 0.65)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    }
  },
  plugins: [],
}
