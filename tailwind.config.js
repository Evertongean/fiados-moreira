const semanticColor = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: semanticColor('background'),
        surface: semanticColor('surface'),
        'surface-secondary': semanticColor('surface-secondary'),
        foreground: semanticColor('foreground'),
        'text-secondary': semanticColor('text-secondary'),
        'text-muted': semanticColor('text-muted'),
        primary: semanticColor('primary'),
        'primary-foreground': semanticColor('primary-foreground'),
        secondary: semanticColor('secondary'),
        accent: semanticColor('accent'),
        border: semanticColor('border'),
        input: semanticColor('input'),
        success: semanticColor('success'),
        warning: semanticColor('warning'),
        destructive: semanticColor('destructive'),
        info: semanticColor('info'),
        disabled: semanticColor('disabled'),
        brand: {
          dark: '#10271F',
          primary: '#184D37',
          accent: '#22C55E',
        },
      },
      borderRadius: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        '2xl': 24,
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
      },
      spacing: {
        0.5: 2,
        1: 4,
        2: 8,
        3: 12,
        4: 16,
        5: 20,
        6: 24,
        8: 32,
        10: 40,
        12: 48,
        16: 64,
      },
    },
  },
  plugins: [],
};
