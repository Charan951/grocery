import { FestivalCampaign } from '../context/CMSContext';

export interface ResolvedFestivalTheme {
  key: string;
  emoji: string;
  fontPreset: string;
  gStart: string;
  gEnd: string;
  bgGradient: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  btn: string;
  text: string;
}

const PRESETS: Record<string, ResolvedFestivalTheme> = {
  krishna: {
    key: 'krishna',
    emoji: '🦚',
    fontPreset: 'greatVibes',
    gStart: '#E0F2FE',
    gEnd: '#CFFAFE',
    bgGradient: 'linear-gradient(to bottom, #E0F2FE, #CFFAFE)',
    cardBg: '#FFFBEB',
    cardBorder: '#BAE6FD',
    accent: '#F59E0B',
    btn: '#0EA5E9',
    text: '#0C4A6E',
  },
  diwali: {
    key: 'diwali',
    emoji: '🪔',
    fontPreset: 'rozhaOne',
    gStart: '#FFF7ED',
    gEnd: '#FFEDD5',
    bgGradient: 'linear-gradient(to bottom, #FFF7ED, #FFEDD5)',
    cardBg: '#FEF3C7',
    cardBorder: '#FDBA74',
    accent: '#D97706',
    btn: '#B91C1C',
    text: '#78350F',
  },
  onam: {
    key: 'onam',
    emoji: '🌸',
    fontPreset: 'cinzelDecorative',
    gStart: '#F7FEE7',
    gEnd: '#ECFDF5',
    bgGradient: 'linear-gradient(to bottom, #F7FEE7, #ECFDF5)',
    cardBg: '#FAFAF9',
    cardBorder: '#A3E635',
    accent: '#D97706',
    btn: '#15803D',
    text: '#14532D',
  },
  raksha_bandhan: {
    key: 'raksha_bandhan',
    emoji: '🧿',
    fontPreset: 'satisfy',
    gStart: '#FFF1F2',
    gEnd: '#F3E8FF',
    bgGradient: 'linear-gradient(to bottom, #FFF1F2, #F3E8FF)',
    cardBg: '#FFF1F2',
    cardBorder: '#F472B6',
    accent: '#EC4899',
    btn: '#9333EA',
    text: '#701A75',
  },
  ganesh_chaturthi: {
    key: 'ganesh_chaturthi',
    emoji: '🌺',
    fontPreset: 'rozhaOne',
    gStart: '#FEF3C7',
    gEnd: '#FFEDD5',
    bgGradient: 'linear-gradient(to bottom, #FEF3C7, #FFEDD5)',
    cardBg: '#FFFBEB',
    cardBorder: '#FCD34D',
    accent: '#EA580C',
    btn: '#D97706',
    text: '#7C2D12',
  },
  holi: {
    key: 'holi',
    emoji: '🎨',
    fontPreset: 'pacifico',
    gStart: '#FFF1F2',
    gEnd: '#F0FDF4',
    bgGradient: 'linear-gradient(to bottom, #FFF1F2, #F0FDF4)',
    cardBg: '#FFFFFF',
    cardBorder: '#F472B6',
    accent: '#E11D48',
    btn: '#2563EB',
    text: '#1E3A8A',
  },
  navratri: {
    key: 'navratri',
    emoji: '🪷',
    fontPreset: 'cinzelDecorative',
    gStart: '#FEF9C3',
    gEnd: '#FAF5FF',
    bgGradient: 'linear-gradient(to bottom, #FEF9C3, #FAF5FF)',
    cardBg: '#FFFBEB',
    cardBorder: '#E9D5FF',
    accent: '#9333EA',
    btn: '#7E22CE',
    text: '#581C87',
  },
};

export function resolveFestivalTheme(campaign?: FestivalCampaign | null): ResolvedFestivalTheme {
  if (!campaign) {
    return PRESETS.krishna;
  }

  const key = (campaign.themeKey || 'krishna').toLowerCase();
  const preset = PRESETS[key] || PRESETS.krishna;

  let gStart = preset.gStart;
  let gEnd = preset.gEnd;

  const rawBgColor =
    (typeof campaign.theme === 'string' ? campaign.theme : campaign.theme?.backgroundColor || campaign.theme?.themeColor || campaign.theme?.color) ||
    campaign.backgroundColor;

  if (campaign.backgroundType === 'solid' && rawBgColor) {
    gStart = rawBgColor;
    gEnd = rawBgColor;
  } else if (campaign.backgroundType === 'gradient' && campaign.gradientStart) {
    gStart = campaign.gradientStart;
    gEnd = campaign.gradientEnd || campaign.gradientStart;
  } else if (rawBgColor) {
    gStart = rawBgColor;
    gEnd = rawBgColor;
  }

  let direction = 'to bottom';
  if (campaign.gradientDirection) {
    const dir = campaign.gradientDirection.toLowerCase();
    if (dir.includes('diagonal') || dir.includes('top left') || dir.includes('135') || dir.includes('\\')) {
      direction = '135deg';
    } else if (dir.includes('right') || dir.includes('horizontal')) {
      direction = 'to right';
    }
  }

  const bgGradient = gStart === gEnd ? gStart : `linear-gradient(${direction}, ${gStart}, ${gEnd})`;
  const styling = campaign.cardStyling || {};

  return {
    key,
    emoji: preset.emoji,
    fontPreset: preset.fontPreset,
    gStart,
    gEnd,
    bgGradient,
    cardBg: styling.cardBackground || preset.cardBg,
    cardBorder: styling.cardBorder || preset.cardBorder,
    accent: styling.accentColor || preset.accent,
    btn: styling.buttonColor || preset.btn,
    text: styling.textColor || preset.text,
  };
}
