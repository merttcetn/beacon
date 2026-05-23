import { SvgXml } from 'react-native-svg';

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="hot1" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#E63946" stop-opacity=".85"/>
      <stop offset=".4" stop-color="#F4A261" stop-opacity=".55"/>
      <stop offset="1" stop-color="#F4A261" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hot2" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#E63946" stop-opacity=".6"/>
      <stop offset=".5" stop-color="#F4A261" stop-opacity=".35"/>
      <stop offset="1" stop-color="#F4A261" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hot3" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#F4A261" stop-opacity=".55"/>
      <stop offset="1" stop-color="#F4A261" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="402" height="874" fill="#EFEAE0"/>
  <path d="M-10 -10 L 240 -10 Q 250 100 200 160 Q 130 220 50 210 Q 0 215 -10 200 Z" fill="#D8E4C9"/>
  <path d="M260 760 Q 320 750 370 770 Q 400 800 372 830 Q 320 850 280 832 Q 250 810 260 760 Z" fill="#C9DDE3"/>
  <g fill="#FCFAF4" stroke="#E5DFD0" stroke-width=".7">
    <rect x="20" y="100" width="48" height="38" rx="2"/>
    <rect x="80" y="90" width="58" height="42" rx="2"/>
    <rect x="160" y="100" width="64" height="38" rx="2"/>
    <rect x="240" y="90" width="50" height="46" rx="2"/>
    <rect x="305" y="100" width="68" height="38" rx="2"/>
    <rect x="18" y="190" width="70" height="60" rx="2"/>
    <rect x="100" y="200" width="54" height="50" rx="2"/>
    <rect x="172" y="185" width="56" height="60" rx="2"/>
    <rect x="248" y="200" width="50" height="56" rx="2"/>
    <rect x="312" y="200" width="60" height="50" rx="2"/>
    <rect x="18" y="320" width="56" height="50" rx="2"/>
    <rect x="86" y="300" width="62" height="56" rx="2"/>
    <rect x="160" y="320" width="50" height="50" rx="2"/>
    <rect x="225" y="310" width="64" height="52" rx="2"/>
    <rect x="300" y="320" width="72" height="50" rx="2"/>
    <rect x="20" y="430" width="68" height="56" rx="2"/>
    <rect x="102" y="440" width="58" height="50" rx="2"/>
    <rect x="172" y="430" width="60" height="56" rx="2"/>
    <rect x="248" y="430" width="50" height="50" rx="2"/>
    <rect x="312" y="440" width="60" height="44" rx="2"/>
    <rect x="20" y="550" width="60" height="42" rx="2"/>
    <rect x="92" y="560" width="56" height="46" rx="2"/>
    <rect x="160" y="550" width="70" height="50" rx="2"/>
    <rect x="240" y="560" width="60" height="44" rx="2"/>
    <rect x="20" y="640" width="80" height="40" rx="2"/>
    <rect x="112" y="640" width="76" height="42" rx="2"/>
    <rect x="200" y="640" width="80" height="40" rx="2"/>
  </g>
  <g stroke="#fff" fill="none" stroke-linecap="round">
    <path d="M0 165 L 402 168" stroke-width="6"/>
    <path d="M0 280 L 402 285" stroke-width="6"/>
    <path d="M0 400 L 402 405" stroke-width="6"/>
    <path d="M0 520 L 402 522" stroke-width="5"/>
    <path d="M0 615 L 402 618" stroke-width="5"/>
    <path d="M140 0 L 145 700" stroke-width="5"/>
    <path d="M295 0 L 300 700" stroke-width="5"/>
  </g>
  <path d="M310 530 Q 350 510 380 545 Q 385 580 350 590 Q 320 580 310 530 Z" fill="#D8E4C9"/>
  <ellipse cx="80" cy="240" rx="120" ry="80" fill="url(#hot2)"/>
  <ellipse cx="180" cy="340" rx="140" ry="100" fill="url(#hot1)"/>
  <ellipse cx="300" cy="460" rx="130" ry="100" fill="url(#hot2)"/>
  <ellipse cx="120" cy="540" rx="90" ry="70" fill="url(#hot3)"/>
  <ellipse cx="240" cy="640" rx="120" ry="70" fill="url(#hot3)"/>
  <ellipse cx="350" cy="180" rx="70" ry="55" fill="url(#hot3)"/>
  <text x="125" y="82" font-size="9.5" fill="#1A1D24" font-weight="600" opacity=".55" text-anchor="middle">ODTÜ KAMPÜSÜ</text>
  <text x="310" y="152" font-size="9.5" fill="#1A1D24" font-weight="600" opacity=".55" text-anchor="middle">ÜNİVERSİTELER</text>
  <text x="220" y="304" font-size="9.5" fill="#1A1D24" font-weight="600" opacity=".55" text-anchor="middle">TEKNOKENT</text>
  <text x="316" y="494" font-size="9.5" fill="#1A1D24" font-weight="600" opacity=".55" text-anchor="middle">ÜMİTKÖY</text>
  <text x="120" y="600" font-size="9.5" fill="#1A1D24" font-weight="600" opacity=".55" text-anchor="middle">ÇİĞDEM</text>
  <text x="320" y="795" font-size="7.5" fill="#5E8089" font-weight="500" text-anchor="middle">Eymir göleti</text>
</svg>
`;

export function DashboardHeatSvg() {
  return <SvgXml xml={SVG} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />;
}
