import { SvgXml } from 'react-native-svg';

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 402 260" preserveAspectRatio="xMidYMid slice">
  <rect width="402" height="260" fill="#EFEAE0"/>
  <g fill="#FCFAF4" stroke="#E5DFD0" stroke-width=".7">
    <rect x="20" y="40" width="80" height="60" rx="2"/>
    <rect x="120" y="30" width="90" height="70" rx="2"/>
    <rect x="230" y="50" width="70" height="50" rx="2"/>
    <rect x="20" y="160" width="100" height="60" rx="2"/>
    <rect x="140" y="155" width="120" height="70" rx="2"/>
    <rect x="285" y="160" width="100" height="65" rx="2"/>
  </g>
  <g stroke="#fff" fill="none" stroke-linecap="round">
    <path d="M0 130 L 402 130" stroke-width="9"/>
    <path d="M210 0 L 215 260" stroke-width="7"/>
    <path d="M0 70 L 402 70" stroke-width="3"/>
    <path d="M0 200 L 402 205" stroke-width="3"/>
    <path d="M80 0 L 82 260" stroke-width="3"/>
    <path d="M320 0 L 322 260" stroke-width="3"/>
  </g>
  <path d="M70 110 Q 90 90 130 100 Q 145 125 110 135 Q 80 130 70 110 Z" fill="#D8E4C9"/>
</svg>
`;

export function PinDetailMapSvg() {
  return <SvgXml xml={SVG} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />;
}
