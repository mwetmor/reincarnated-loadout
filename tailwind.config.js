/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Dynamic grid/column classes (skill tree, analytics layouts)
    { pattern: /grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)/ },
    { pattern: /col-span-(1|2|3|4|5|6|7|8|9|10|11|12)/ },
    { pattern: /row-span-(1|2|3|4|5|6)/ },
    // Flex direction + alignment
    { pattern: /flex-(row|col|wrap|nowrap|row-reverse|col-reverse)/ },
    { pattern: /items-(start|center|end|stretch|baseline)/ },
    { pattern: /justify-(start|center|end|between|around|evenly)/ },
    // Spacing (gap/padding/margin) — common scales
    { pattern: /(gap|p|m|px|py|mx|my|pt|pb|pl|pr|mt|mb|ml|mr)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|10|12|14|16|20|24)/ },
    // Sizing
    { pattern: /(w|h|min-w|min-h|max-w|max-h)-(0|1|2|3|4|5|6|8|10|12|14|16|20|24|32|40|48|56|64|72|80|96|full|screen|auto|px)/ },
    // Colors that may be applied dynamically (element themes)
    { pattern: /(bg|text|border)-(amber|blue|emerald|fuchsia|gray|green|indigo|orange|pink|purple|red|rose|sky|slate|stone|teal|violet|yellow|zinc)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    // Border + rounded variants
    { pattern: /border-(0|1|2|4|8)/ },
    { pattern: /rounded(-sm|-md|-lg|-xl|-2xl|-3xl|-full)?/ },
    // Text size and weight
    { pattern: /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/ },
    { pattern: /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/ },
    // Responsive variants for the patterns above
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
