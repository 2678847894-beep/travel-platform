/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        sidebar: '#1e293b',
        bg: '#f8fafc',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // 关闭 Tailwind 的默认重置，避免与 Ant Design 冲突
  },
}
