import React from 'react';

/**
 * Het netwerkhoofd van het hoofdscherm. Eigen tekening: een profiel opgebouwd
 * uit knooppunten en verbindingen, gegenereerd en daarna vastgelegd zodat hij
 * er elke keer hetzelfde uitziet.
 */
export function NetwerkHoofd() {
  return (
    <svg className="hero-net" viewBox="0 0 420 560" aria-hidden="true">
      <path className="net-outline" d="M267.4 95.3 L294.0 124.0 L314.0 170.0 L318.0 206.0 L306.0 224.0 L352.0 272.0 L314.0 286.0 L322.0 300.0 L308.0 312.0 L326.0 336.0 L302.0 358.0 L268.0 372.0 L240.0 376.0 L234.0 394.0 L274.0 416.0 C290.3 423.2 323.0 430.5 338.0 440.0 C350.7 448.1 371.6 468.3 378.0 482.0 C386.3 499.8 388.5 536.7 392.0 556.0 C392.2 557.0 393.0 560.0 392.0 560.0 L28.0 560.0 L26.0 556.0 L40.0 482.0 C46.7 468.1 68.9 448.2 82.0 440.0 C97.1 430.6 129.7 423.2 146.0 416.0 C156.9 411.2 179.7 404.0 186.0 394.0 C190.5 386.8 181.8 370.3 180.0 362.0 C175.3 340.5 169.2 299.9 161.1 279.5 C159.3 274.9 148.2 274.0 144.0 271.5 C139.8 269.1 132.3 263.9 128.6 260.7 C124.8 257.6 118.4 251.2 115.3 247.4 C112.1 243.7 106.9 236.2 104.5 232.0 C102.0 227.8 98.2 219.5 96.5 214.9 C94.8 210.3 92.5 201.6 91.6 196.8 C90.8 191.9 90.0 182.9 90.0 178.0 C90.0 173.1 90.8 164.1 91.6 159.2 C92.5 154.4 94.8 145.7 96.5 141.1 C98.2 136.5 102.0 128.2 104.5 124.0 C106.9 119.8 112.1 112.3 115.3 108.6 C118.4 104.8 124.8 98.4 128.6 95.3 C132.3 92.1 139.8 86.9 144.0 84.5 C148.2 82.0 156.5 78.2 161.1 76.5 C165.7 74.8 174.4 72.5 179.2 71.6 C184.1 70.8 193.1 70.0 198.0 70.0 C202.9 70.0 211.9 70.8 216.8 71.6 C221.6 72.5 230.3 74.8 234.9 76.5 C239.5 78.2 247.8 82.0 252.0 84.5 C256.2 86.9 263.4 92.5 267.4 95.3 C267.4 95.3 267.4 95.3 267.4 95.3 Z"/>
      <g className="net-links">
      <line x1="155" y1="184" x2="120" y2="203"/>
      <line x1="155" y1="184" x2="144" y2="148"/>
      <line x1="155" y1="184" x2="188" y2="226"/>
      <line x1="155" y1="184" x2="104" y2="169"/>
      <line x1="87" y1="511" x2="138" y2="516"/>
      <line x1="87" y1="511" x2="96" y2="458"/>
      <line x1="87" y1="511" x2="55" y2="473"/>
      <line x1="87" y1="511" x2="45" y2="526"/>
      <line x1="218" y1="404" x2="265" y2="424"/>
      <line x1="218" y1="404" x2="231" y2="365"/>
      <line x1="218" y1="404" x2="180" y2="422"/>
      <line x1="218" y1="404" x2="185" y2="359"/>
      <line x1="210" y1="257" x2="242" y2="228"/>
      <line x1="210" y1="257" x2="175" y2="288"/>
      <line x1="210" y1="257" x2="188" y2="226"/>
      <line x1="267" y1="350" x2="231" y2="365"/>
      <line x1="267" y1="350" x2="253" y2="308"/>
      <line x1="267" y1="350" x2="309" y2="331"/>
      <line x1="301" y1="284" x2="253" y2="308"/>
      <line x1="301" y1="284" x2="273" y2="252"/>
      <line x1="301" y1="284" x2="309" y2="331"/>
      <line x1="264" y1="154" x2="301" y2="177"/>
      <line x1="264" y1="154" x2="246" y2="105"/>
      <line x1="264" y1="154" x2="223" y2="185"/>
      <line x1="264" y1="154" x2="261" y2="195"/>
      <line x1="301" y1="177" x2="302" y2="217"/>
      <line x1="301" y1="177" x2="261" y2="195"/>
      <line x1="265" y1="424" x2="312" y2="433"/>
      <line x1="265" y1="424" x2="237" y2="459"/>
      <line x1="231" y1="365" x2="185" y2="359"/>
      <line x1="180" y1="422" x2="128" y2="433"/>
      <line x1="180" y1="422" x2="198" y2="457"/>
      <line x1="206" y1="495" x2="251" y2="515"/>
      <line x1="206" y1="495" x2="164" y2="474"/>
      <line x1="206" y1="495" x2="237" y2="459"/>
      <line x1="206" y1="495" x2="198" y2="457"/>
      <line x1="206" y1="495" x2="176" y2="523"/>
      <line x1="242" y1="228" x2="223" y2="185"/>
      <line x1="242" y1="228" x2="273" y2="252"/>
      <line x1="242" y1="228" x2="261" y2="195"/>
      <line x1="312" y1="433" x2="289" y2="482"/>
      <line x1="312" y1="433" x2="350" y2="460"/>
      <line x1="138" y1="516" x2="164" y2="474"/>
      <line x1="138" y1="516" x2="176" y2="523"/>
      <line x1="246" y1="105" x2="197" y2="145"/>
      <line x1="246" y1="105" x2="204" y2="100"/>
      <line x1="210" y1="312" x2="253" y2="308"/>
      <line x1="210" y1="312" x2="175" y2="288"/>
      <line x1="210" y1="312" x2="185" y2="359"/>
      <line x1="343" y1="501" x2="289" y2="482"/>
      <line x1="343" y1="501" x2="307" y2="526"/>
      <line x1="343" y1="501" x2="350" y2="460"/>
      <line x1="251" y1="515" x2="289" y2="482"/>
      <line x1="251" y1="515" x2="307" y2="526"/>
      <line x1="251" y1="515" x2="237" y2="459"/>
      <line x1="223" y1="185" x2="197" y2="145"/>
      <line x1="223" y1="185" x2="188" y2="226"/>
      <line x1="223" y1="185" x2="261" y2="195"/>
      <line x1="96" y1="458" x2="55" y2="473"/>
      <line x1="96" y1="458" x2="128" y2="433"/>
      <line x1="96" y1="458" x2="45" y2="526"/>
      <line x1="137" y1="249" x2="120" y2="203"/>
      <line x1="137" y1="249" x2="175" y2="288"/>
      <line x1="137" y1="249" x2="188" y2="226"/>
      <line x1="197" y1="145" x2="162" y2="101"/>
      <line x1="197" y1="145" x2="144" y2="148"/>
      <line x1="197" y1="145" x2="204" y2="100"/>
      <line x1="253" y1="308" x2="309" y2="331"/>
      <line x1="289" y1="482" x2="307" y2="526"/>
      <line x1="289" y1="482" x2="350" y2="460"/>
      <line x1="55" y1="473" x2="45" y2="526"/>
      <line x1="273" y1="252" x2="302" y2="217"/>
      <line x1="120" y1="203" x2="104" y2="169"/>
      <line x1="164" y1="474" x2="128" y2="433"/>
      <line x1="164" y1="474" x2="198" y2="457"/>
      <line x1="164" y1="474" x2="176" y2="523"/>
      <line x1="162" y1="101" x2="144" y2="148"/>
      <line x1="162" y1="101" x2="204" y2="100"/>
      <line x1="237" y1="459" x2="198" y2="457"/>
      <line x1="144" y1="148" x2="104" y2="169"/>
      <line x1="302" y1="217" x2="261" y2="195"/>
      </g>
      <g className="net-nodes">
      <circle cx="155" cy="184" r="2.0" style={{ ['--d' as string]: '0ms' } as React.CSSProperties}/>
      <circle cx="87" cy="511" r="3.4" style={{ ['--d' as string]: '137ms' } as React.CSSProperties}/>
      <circle cx="218" cy="404" r="4.8" style={{ ['--d' as string]: '274ms' } as React.CSSProperties}/>
      <circle cx="210" cy="257" r="2.7" style={{ ['--d' as string]: '411ms' } as React.CSSProperties}/>
      <circle cx="267" cy="350" r="4.1" style={{ ['--d' as string]: '548ms' } as React.CSSProperties}/>
      <circle cx="301" cy="284" r="2.0" style={{ ['--d' as string]: '685ms' } as React.CSSProperties}/>
      <circle cx="264" cy="154" r="3.4" style={{ ['--d' as string]: '822ms' } as React.CSSProperties}/>
      <circle cx="301" cy="177" r="4.8" style={{ ['--d' as string]: '959ms' } as React.CSSProperties}/>
      <circle cx="265" cy="424" r="2.7" style={{ ['--d' as string]: '1096ms' } as React.CSSProperties}/>
      <circle cx="231" cy="365" r="4.1" style={{ ['--d' as string]: '1233ms' } as React.CSSProperties}/>
      <circle cx="180" cy="422" r="2.0" style={{ ['--d' as string]: '1370ms' } as React.CSSProperties}/>
      <circle cx="206" cy="495" r="3.4" style={{ ['--d' as string]: '1507ms' } as React.CSSProperties}/>
      <circle cx="242" cy="228" r="4.8" style={{ ['--d' as string]: '1644ms' } as React.CSSProperties}/>
      <circle cx="312" cy="433" r="2.7" style={{ ['--d' as string]: '1781ms' } as React.CSSProperties}/>
      <circle cx="138" cy="516" r="4.1" style={{ ['--d' as string]: '1918ms' } as React.CSSProperties}/>
      <circle cx="246" cy="105" r="2.0" style={{ ['--d' as string]: '2055ms' } as React.CSSProperties}/>
      <circle cx="210" cy="312" r="3.4" style={{ ['--d' as string]: '2192ms' } as React.CSSProperties}/>
      <circle cx="343" cy="501" r="4.8" style={{ ['--d' as string]: '2329ms' } as React.CSSProperties}/>
      <circle cx="251" cy="515" r="2.7" style={{ ['--d' as string]: '2466ms' } as React.CSSProperties}/>
      <circle cx="223" cy="185" r="4.1" style={{ ['--d' as string]: '3ms' } as React.CSSProperties}/>
      <circle cx="96" cy="458" r="2.0" style={{ ['--d' as string]: '140ms' } as React.CSSProperties}/>
      <circle cx="137" cy="249" r="3.4" style={{ ['--d' as string]: '277ms' } as React.CSSProperties}/>
      <circle cx="197" cy="145" r="4.8" style={{ ['--d' as string]: '414ms' } as React.CSSProperties}/>
      <circle cx="253" cy="308" r="2.7" style={{ ['--d' as string]: '551ms' } as React.CSSProperties}/>
      <circle cx="289" cy="482" r="4.1" style={{ ['--d' as string]: '688ms' } as React.CSSProperties}/>
      <circle cx="55" cy="473" r="2.0" style={{ ['--d' as string]: '825ms' } as React.CSSProperties}/>
      <circle cx="273" cy="252" r="3.4" style={{ ['--d' as string]: '962ms' } as React.CSSProperties}/>
      <circle cx="309" cy="331" r="4.8" style={{ ['--d' as string]: '1099ms' } as React.CSSProperties}/>
      <circle cx="120" cy="203" r="2.7" style={{ ['--d' as string]: '1236ms' } as React.CSSProperties}/>
      <circle cx="307" cy="526" r="4.1" style={{ ['--d' as string]: '1373ms' } as React.CSSProperties}/>
      <circle cx="164" cy="474" r="2.0" style={{ ['--d' as string]: '1510ms' } as React.CSSProperties}/>
      <circle cx="162" cy="101" r="3.4" style={{ ['--d' as string]: '1647ms' } as React.CSSProperties}/>
      <circle cx="175" cy="288" r="4.8" style={{ ['--d' as string]: '1784ms' } as React.CSSProperties}/>
      <circle cx="185" cy="359" r="2.7" style={{ ['--d' as string]: '1921ms' } as React.CSSProperties}/>
      <circle cx="237" cy="459" r="4.1" style={{ ['--d' as string]: '2058ms' } as React.CSSProperties}/>
      <circle cx="144" cy="148" r="2.0" style={{ ['--d' as string]: '2195ms' } as React.CSSProperties}/>
      <circle cx="302" cy="217" r="3.4" style={{ ['--d' as string]: '2332ms' } as React.CSSProperties}/>
      <circle cx="128" cy="433" r="4.8" style={{ ['--d' as string]: '2469ms' } as React.CSSProperties}/>
      <circle cx="188" cy="226" r="2.7" style={{ ['--d' as string]: '6ms' } as React.CSSProperties}/>
      <circle cx="350" cy="460" r="4.1" style={{ ['--d' as string]: '143ms' } as React.CSSProperties}/>
      <circle cx="45" cy="526" r="2.0" style={{ ['--d' as string]: '280ms' } as React.CSSProperties}/>
      <circle cx="204" cy="100" r="3.4" style={{ ['--d' as string]: '417ms' } as React.CSSProperties}/>
      <circle cx="198" cy="457" r="4.8" style={{ ['--d' as string]: '554ms' } as React.CSSProperties}/>
      <circle cx="176" cy="523" r="2.7" style={{ ['--d' as string]: '691ms' } as React.CSSProperties}/>
      <circle cx="104" cy="169" r="4.1" style={{ ['--d' as string]: '828ms' } as React.CSSProperties}/>
      <circle cx="261" cy="195" r="2.0" style={{ ['--d' as string]: '965ms' } as React.CSSProperties}/>
      </g>
    </svg>
  );
}
