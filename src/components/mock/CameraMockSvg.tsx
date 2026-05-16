import { SvgXml } from 'react-native-svg';

// Sokak sahnesi (eksik rampa) — tasarım: project/screen-camera.jsx
const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="cs" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#3B4655"/><stop offset="1" stop-color="#1F2630"/>
    </linearGradient>
    <linearGradient id="cg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#2E3540"/><stop offset="1" stop-color="#161A21"/>
    </linearGradient>
    <radialGradient id="cv" cx="50%" cy="50%" r="75%">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".45"/>
    </radialGradient>
  </defs>
  <rect width="402" height="874" fill="url(#cs)"/>
  <g fill="#28303B">
    <rect x="0" y="180" width="80" height="240"/>
    <rect x="78" y="220" width="120" height="200"/>
    <rect x="198" y="200" width="90" height="220"/>
    <rect x="285" y="250" width="120" height="170"/>
  </g>
  <g fill="#3F4A58" opacity=".7">
    <rect x="10" y="240" width="9" height="14"/><rect x="28" y="240" width="9" height="14"/><rect x="46" y="240" width="9" height="14"/>
    <rect x="10" y="264" width="9" height="14"/><rect x="28" y="264" width="9" height="14"/><rect x="46" y="264" width="9" height="14"/>
    <rect x="200" y="220" width="9" height="14"/><rect x="218" y="220" width="9" height="14"/><rect x="236" y="220" width="9" height="14"/>
    <rect x="200" y="244" width="9" height="14"/><rect x="218" y="244" width="9" height="14"/><rect x="236" y="244" width="9" height="14"/>
    <rect x="305" y="280" width="9" height="14"/><rect x="323" y="280" width="9" height="14"/><rect x="341" y="280" width="9" height="14"/>
  </g>
  <rect y="420" width="402" height="220" fill="#5E6470"/>
  <rect y="418" width="402" height="3" fill="#11171F"/>
  <rect y="640" width="402" height="234" fill="url(#cg)"/>
  <g>
    <rect x="0" y="440" width="402" height="44" fill="#C9A24E" opacity=".55"/>
    <circle cx="20" cy="450" r="3" fill="#A07F2A"/><circle cx="60" cy="450" r="3" fill="#A07F2A"/><circle cx="100" cy="450" r="3" fill="#A07F2A"/>
    <circle cx="140" cy="450" r="3" fill="#A07F2A"/><circle cx="180" cy="450" r="3" fill="#A07F2A"/><circle cx="220" cy="450" r="3" fill="#A07F2A"/>
    <circle cx="260" cy="450" r="3" fill="#A07F2A"/><circle cx="300" cy="450" r="3" fill="#A07F2A"/><circle cx="340" cy="450" r="3" fill="#A07F2A"/>
    <circle cx="380" cy="450" r="3" fill="#A07F2A"/>
    <circle cx="20" cy="464" r="3" fill="#A07F2A"/><circle cx="60" cy="464" r="3" fill="#A07F2A"/><circle cx="100" cy="464" r="3" fill="#A07F2A"/>
    <circle cx="140" cy="464" r="3" fill="#A07F2A"/><circle cx="180" cy="464" r="3" fill="#A07F2A"/><circle cx="220" cy="464" r="3" fill="#A07F2A"/>
    <circle cx="260" cy="464" r="3" fill="#A07F2A"/><circle cx="300" cy="464" r="3" fill="#A07F2A"/><circle cx="340" cy="464" r="3" fill="#A07F2A"/>
    <circle cx="380" cy="464" r="3" fill="#A07F2A"/>
  </g>
  <rect x="240" y="498" width="162" height="22" fill="#1A1D24"/>
  <rect x="240" y="496" width="162" height="3" fill="#FAF7F2" opacity=".6"/>
  <path d="M240 520 L 320 580 L 402 580 L 402 520 Z" fill="#0B1015"/>
  <g stroke="#1A1D24" stroke-width="1" opacity=".4" fill="none">
    <path d="M40 560 L 90 590 L 110 605"/>
    <path d="M180 540 L 220 560 L 240 595"/>
    <path d="M60 700 L 140 740"/>
  </g>
  <rect width="402" height="874" fill="url(#cv)"/>
</svg>
`;

interface Props {
  width?: number | string;
  height?: number | string;
}

export function CameraMockSvg({ width = '100%', height = '100%' }: Props) {
  return <SvgXml xml={SVG} width={width} height={height} preserveAspectRatio="xMidYMid slice" />;
}
