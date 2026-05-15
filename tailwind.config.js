/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // SkillNode.tsx generates these at runtime via elColors.bg.replace('950','600').replace('800','500')
    // Tailwind cannot statically scan string-replace expressions — these 5 classes would be purged otherwise.
    // All other element/tier/state colors appear as string literals in source and are scanned normally.
    'bg-orange-600', // fire  (bg-orange-950 → 600)
    'bg-teal-600',   // wind  (bg-teal-950   → 600)
    'bg-blue-600',   // water (bg-blue-950   → 600)
    'bg-amber-600',  // earth (bg-amber-950  → 600)
    'bg-slate-500',  // physical (bg-slate-800 → 500)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
