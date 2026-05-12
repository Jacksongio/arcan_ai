export const colors = {
  bg: '#04050A',
  bgElev: '#0E1119',
  bgInput: '#161A24',
  border: '#1F2532',
  text: '#E8EAF0',
  textDim: '#8A93A6',
  accent: '#8A6BFF',
  accentDim: '#5B41CC',
  user: '#1F2A44',
  assistant: '#10131B',
  danger: '#FF5C7A',
  ok: '#3BD16F',
} as const;

/** Liquid-glass tokens — translucent fills + edge highlights to fake iOS 26 glass. */
export const glass = {
  surfaceLow: 'rgba(255, 255, 255, 0.04)',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceHigh: 'rgba(255, 255, 255, 0.09)',
  accentTint: 'rgba(138, 107, 255, 0.14)',
  accentTintStrong: 'rgba(138, 107, 255, 0.22)',
  highlight: 'rgba(255, 255, 255, 0.14)',
  highlightStrong: 'rgba(255, 255, 255, 0.22)',
  edge: 'rgba(255, 255, 255, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.45)',
} as const;

export const radii = { sm: 6, md: 14, lg: 22, xl: 28, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
