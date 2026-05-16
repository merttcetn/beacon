export const colors = {
  bg: {
    primary: '#FAF7F2',
    secondary: '#F0EDE6',
    elevated: '#FFFFFF',
    deep: '#11171F',
  },
  text: {
    primary: '#1A1D24',
    secondary: '#4A5060',
    tertiary: '#8B92A3',
    inverse: '#FAF7F2',
  },
  border: {
    default: '#E2DDD2',
    divider: '#EAE6DC',
    hairline: 'rgba(26,29,36,0.08)',
  },
  status: {
    new: '#E63946',
    partial: '#F4A261',
    verified: '#2A9D8F',
    resolved: '#6C757D',
  },
  severity: {
    low: '#FFF4E0',
    medium: '#FFE4D6',
    high: '#FFD6D6',
  },
  accent: {
    primary: '#1F3A5F',
    hover: '#2A4D7A',
    pressed: '#14283F',
  },
  role: {
    visuallyImpaired: '#5E4FA2',
    volunteer: '#2A9D8F',
    company: '#1F3A5F',
  },
  map: {
    land: '#FAF7F2',
    water: '#4A90B8',
    park: '#C8D5C0',
    roadMajor: '#2C2E33',
    roadMinor: '#5C6070',
    roadFoot: '#7A8090',
    building: '#E8E5E0',
  },
} as const;

export type Colors = typeof colors;
