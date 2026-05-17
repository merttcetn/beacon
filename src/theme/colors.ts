export const colors = {
  bg: {
    primary: '#FFFFFF',
    secondary: '#F4F7F4',
    elevated: '#FFFFFF',
    deep: '#11171F',
  },
  text: {
    primary: '#1A1D24',
    secondary: '#4A5060',
    tertiary: '#8B92A3',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#E4E8E5',
    divider: '#EEF1EE',
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
    primary: '#285943',
    hover: '#36755A',
    pressed: '#1A4030',
    soft: '#8CD790',
  },
  role: {
    visuallyImpaired: '#5E4FA2',
    volunteer: '#2A9D8F',
    company: '#1F3A5F',
  },
  map: {
    land: '#FFFFFF',
    water: '#4A90B8',
    park: '#C8D5C0',
    roadMajor: '#2C2E33',
    roadMinor: '#5C6070',
    roadFoot: '#7A8090',
    building: '#E8E5E0',
  },
} as const;

export type Colors = typeof colors;
