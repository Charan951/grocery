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
    gStart: '#8DC9F7',
    gEnd: '#D6F0FE',
    bgGradient: 'linear-gradient(to bottom, #8DC9F7, #D6F0FE)',
    cardBg: '#8DC9F7',
    cardBorder: '#BAE6FD',
    accent: '#D97706',
    btn: '#0284C7',
    text: '#0F4C75',
  },
  ganesh_chaturthi: {
    key: 'ganesh_chaturthi',
    emoji: '🌺',
    fontPreset: 'rozhaOne',
    gStart: '#FCDAA8',
    gEnd: '#FEF3E2',
    bgGradient: 'linear-gradient(to bottom, #FCDAA8, #FEF3E2)',
    cardBg: '#FCDAA8',
    cardBorder: '#FDE68A',
    accent: '#D97706',
    btn: '#EA580C',
    text: '#68380D',
  },
  diwali: {
    key: 'diwali',
    emoji: '🪔',
    fontPreset: 'rozhaOne',
    gStart: '#FCD39D',
    gEnd: '#FEF4E6',
    bgGradient: 'linear-gradient(to bottom, #FCD39D, #FEF4E6)',
    cardBg: '#FCD39D',
    cardBorder: '#FDE68A',
    accent: '#D97706',
    btn: '#C2410C',
    text: '#663000',
  },
  onam: {
    key: 'onam',
    emoji: '🌸',
    fontPreset: 'cinzelDecorative',
    gStart: '#BBEB9B',
    gEnd: '#EBFADF',
    bgGradient: 'linear-gradient(to bottom, #BBEB9B, #EBFADF)',
    cardBg: '#BBEB9B',
    cardBorder: '#C0F289',
    accent: '#D97706',
    btn: '#16A34A',
    text: '#1B4D20',
  },
  raksha_bandhan: {
    key: 'raksha_bandhan',
    emoji: '🧿',
    fontPreset: 'satisfy',
    gStart: '#F8A6D2',
    gEnd: '#FCE6F2',
    bgGradient: 'linear-gradient(to bottom, #F8A6D2, #FCE6F2)',
    cardBg: '#F8A6D2',
    cardBorder: '#FBCFE8',
    accent: '#EC4899',
    btn: '#9333EA',
    text: '#701A75',
  },
  holi: {
    key: 'holi',
    emoji: '🎨',
    fontPreset: 'pacifico',
    gStart: '#A5B4FC',
    gEnd: '#E0E7FF',
    bgGradient: 'linear-gradient(to bottom, #A5B4FC, #E0E7FF)',
    cardBg: '#A5B4FC',
    cardBorder: '#C7D2FE',
    accent: '#E11D48',
    btn: '#4F46E5',
    text: '#1E1B4B',
  },
  navratri: {
    key: 'navratri',
    emoji: '🪷',
    fontPreset: 'cinzelDecorative',
    gStart: '#D8B4FE',
    gEnd: '#F3E8FF',
    bgGradient: 'linear-gradient(to bottom, #D8B4FE, #F3E8FF)',
    cardBg: '#D8B4FE',
    cardBorder: '#E9D5FF',
    accent: '#9333EA',
    btn: '#7E22CE',
    text: '#4C1D95',
  },
};

export function resolveFestivalTheme(campaign?: FestivalCampaign | null): ResolvedFestivalTheme {
  if (!campaign) {
    return PRESETS.krishna;
  }

  const key = (campaign.themeKey || 'krishna').toLowerCase();
  const preset = PRESETS[key] || PRESETS.krishna;

  // Resolve Admin Background Colors & Gradient
  const rawBgColor =
    (typeof campaign.theme === 'string'
      ? campaign.theme
      : campaign.theme?.backgroundColor || campaign.theme?.themeColor || campaign.theme?.color) ||
    campaign.backgroundColor;

  let gStart = campaign.gradientStart || rawBgColor || preset.gStart;
  let gEnd = campaign.gradientEnd || campaign.gradientStart || rawBgColor || preset.gEnd;

  if (campaign.backgroundType === 'solid' && (rawBgColor || campaign.gradientStart)) {
    const solidColor = rawBgColor || campaign.gradientStart || preset.gStart;
    gStart = solidColor;
    gEnd = solidColor;
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

  // Resolve Card Styling Tokens (prioritizing Admin input -> top-level -> preset)
  const styling = campaign.cardStyling || {};
  const cardBg = gStart;
  const cardBorder = styling.cardBorder || (campaign as any).cardBorder || preset.cardBorder;
  const accent = styling.accentColor || (campaign as any).accentColor || preset.accent;
  const btn = styling.buttonColor || (campaign as any).buttonColor || preset.btn;
  const text = styling.textColor || (campaign as any).textColor || preset.text;

  return {
    key,
    emoji: preset.emoji,
    fontPreset: preset.fontPreset,
    gStart,
    gEnd,
    bgGradient,
    cardBg,
    cardBorder,
    accent,
    btn,
    text,
  };
}
