export const Colors = {
  surfacePrimary: '#0A0A0F',
  surfaceSecondary: '#13131A',
  surfaceTertiary: '#1C1C26',
  surfaceOverlay: 'rgba(10, 10, 15, 0.8)', // #0A0A0FCC
  
  textPrimary: '#F5F5F0',
  textSecondary: '#8A8A9A',
  textTertiary: '#4A4A5A',
  
  accent: '#00C2FF',
  accentDim: 'rgba(0, 194, 255, 0.13)', // #00C2FF22
  accentGlow: 'rgba(0, 194, 255, 0.08)', // #00C2FF14

  borderSubtle: 'rgba(255, 255, 255, 0.03)', // #FFFFFF08
  borderActive: 'rgba(255, 255, 255, 0.09)', // #FFFFFF18

  success: '#00D68F',
  warning: '#FFB547',
  destructive: '#FF4757',
};

export const Typography = {
  headingXL: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 32,
    lineHeight: 35.2, // 1.1 * 32
    letterSpacing: -0.5,
    fontWeight: '700' as const,
  },
  headingL: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 24,
    lineHeight: 28.8, // 1.2 * 24
    letterSpacing: -0.3,
    fontWeight: '700' as const,
  },
  headingM: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 18,
    lineHeight: 23.4, // 1.3 * 18
    fontWeight: '700' as const,
  },
  body: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    lineHeight: 22.4, // 1.6 * 14
    fontWeight: '400' as const,
  },
  caption: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    lineHeight: 18, // 1.5 * 12
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
    fontWeight: '500' as const,
  },
  data: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 28,
  }
};
