/*
  BloomFocus plant library.
  12 cute, cohesive plant illustrations. Each is an SVG component taking:
    - size (px)
    - animated (bool) — runs the bloom-in / stem-grow animation
    - pot (bool) — show the little pot underneath

  Style rules (to keep them cohesive):
    - All on a 200x240 canvas, plant anchored to bottom-center
    - Soft fills + hand-drawn outline at stroke-width 2, rounded line caps
    - Muted palette pulled from CSS variables when possible, but plant
      accent colors are hard-coded so they stay consistent across themes
    - Gentle sway baseline; bloom-in on render when `animated`
*/

const STEM = "#6FA373";
const STEM_DARK = "#4F7A55";
const POT_CLAY = "#D9A57E";
const POT_CLAY_DARK = "#B07A55";
const POT_RIM = "#E8B895";
const LEAF = "#95C49B";
const LEAF_DARK = "#6FA377";
const SOIL = "#5B463A";

function Pot({ show = true }) {
  if (!show) return null;
  return (
    <g>
      {/* soil */}
      <ellipse cx="100" cy="206" rx="44" ry="5" fill={SOIL} opacity="0.35" />
      {/* pot body */}
      <path d="M62 210 L138 210 L132 238 Q100 244 68 238 Z" fill={POT_CLAY} stroke={POT_CLAY_DARK} strokeWidth="1.8" strokeLinejoin="round"/>
      {/* pot rim */}
      <rect x="58" y="204" width="84" height="10" rx="3" fill={POT_RIM} stroke={POT_CLAY_DARK} strokeWidth="1.8"/>
    </g>
  );
}

function Stem({ d, delay = 0 }) {
  return <path d={d} fill="none" stroke={STEM} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stem-grow" style={{ animationDelay: `${delay}s` }}/>;
}

function Leaf({ cx, cy, rot = 0, size = 1, delay = 0, color = LEAF }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${size})`} className="leaf-unfurl" style={{ animationDelay: `${delay}s` }}>
      <path d="M0 0 Q-10 -14 0 -28 Q10 -14 0 0 Z" fill={color} stroke={LEAF_DARK} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M0 -2 L0 -24" stroke={LEAF_DARK} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </g>
  );
}

// ----- Individual plants -----

function Rose({ animated }) {
  return (
    <g>
      <Stem d="M100 210 Q100 170 100 130" />
      <Leaf cx="100" cy="170" rot={-60} size={0.85} delay={0.4} />
      <Leaf cx="100" cy="150" rot={65} size={0.8} delay={0.5} />
      <g transform="translate(100 105)"><g className={animated ? "bloom-in" : ""} style={{ animationDelay: "0.7s", transformBox: 'fill-box', transformOrigin: 'center' }}>
        {/* rose spiral */}
        <circle r="34" fill="#F9B4C9"/>
        <path d="M-26 0 Q-26 -22 0 -26 Q26 -22 26 0 Q26 22 0 26 Q-26 22 -26 0 Z" fill="#E89AAE"/>
        <path d="M-18 -2 Q-18 -18 0 -20 Q18 -18 18 -2 Q18 14 0 16 Q-18 14 -18 -2 Z" fill="#D97891"/>
        <path d="M-10 -2 Q-10 -12 0 -13 Q10 -12 10 -2 Q10 8 0 9 Q-10 8 -10 -2 Z" fill="#BE5D77"/>
        <circle cx="0" cy="-2" r="3.5" fill="#963F5C"/>
        {/* outer petal curves */}
        <path d="M-34 -4 Q-28 -20 -10 -30" fill="none" stroke="#C97891" strokeWidth="1.5" opacity="0.6"/>
        <path d="M34 -4 Q28 -20 10 -30" fill="none" stroke="#C97891" strokeWidth="1.5" opacity="0.6"/>
      </g></g>
    </g>
  );
}

function Sunflower({ animated }) {
  const petals = Array.from({ length: 12 }, (_, i) => i);
  return (
    <g>
      <Stem d="M100 210 Q100 170 100 130" />
      <Leaf cx="100" cy="175" rot={-55} size={0.95} delay={0.4} color="#A8CC8C"/>
      <Leaf cx="100" cy="150" rot={58} size={0.9} delay={0.5} color="#A8CC8C"/>
      <g transform="translate(100 100)" className={animated ? "bloom-in" : ""} style={{ animationDelay: "0.7s" }}>
        {petals.map(i => (
          <g key={i} transform={`rotate(${i * 30})`}>
            <ellipse cx="0" cy="-32" rx="9" ry="18" fill="#F4CF6B" stroke="#D4A838" strokeWidth="1.3"/>
          </g>
        ))}
        <circle r="18" fill="#6B4A2E"/>
        <circle r="18" fill="url(#sunDot)"/>
        <defs>
          <pattern id="sunDot" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="1" fill="#4A3220" opacity="0.5"/>
          </pattern>
        </defs>
      </g>
    </g>
  );
}

function Tulip({ animated }) {
  return (
    <g>
      <Stem d="M100 210 Q100 170 100 135" />
      <Leaf cx="100" cy="185" rot={-40} size={1.1} delay={0.3} color="#8BBF7F"/>
      <Leaf cx="100" cy="175" rot={45} size={1.0} delay={0.4} color="#8BBF7F"/>
      <g transform="translate(100 112)" className={animated ? "bloom-in" : ""} style={{ animationDelay: "0.7s" }}>
        <path d="M-22 0 Q-22 -30 -8 -40 Q0 -44 8 -40 Q22 -30 22 0 Q14 8 0 8 Q-14 8 -22 0 Z" fill="#E89AAE" stroke="#C97891" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M-8 -42 Q-8 -12 -2 0" fill="none" stroke="#C97891" strokeWidth="1.5" opacity="0.7"/>
        <path d="M8 -42 Q8 -12 2 0" fill="none" stroke="#C97891" strokeWidth="1.5" opacity="0.7"/>
        <path d="M-14 -20 Q0 -28 14 -20" fill="#F9C4D3" opacity="0.6"/>
      </g>
    </g>
  );
}

function Lavender({ animated }) {
  return (
    <g>
      {/* three stems */}
      {[-18, 0, 18].map((off, i) => (
        <g key={i}>
          <Stem d={`M${100+off} 210 Q${100+off*0.7} 170 ${100+off*0.5} 130`} delay={i*0.08}/>
          <g transform={`translate(${100+off*0.5} 130)`} className={animated ? "bloom-in" : ""} style={{ animationDelay: `${0.5 + i*0.12}s` }}>
            {[0,1,2,3,4,5].map(j => (
              <g key={j} transform={`translate(0 ${-j*8})`}>
                <ellipse cx="-3" cy="0" rx="4" ry="5" fill="#C4A8E0"/>
                <ellipse cx="3" cy="-2" rx="4" ry="5" fill="#B39FD6"/>
                <ellipse cx="0" cy="-4" rx="4" ry="5" fill="#A98BC9"/>
              </g>
            ))}
          </g>
        </g>
      ))}
      <Leaf cx="100" cy="190" rot={-45} size={0.7} delay={0.3} color="#9BBFA8"/>
      <Leaf cx="100" cy="185" rot={50} size={0.7} delay={0.35} color="#9BBFA8"/>
    </g>
  );
}

function CherryBlossom({ animated }) {
  return (
    <g>
      {/* branch */}
      <path d="M60 210 Q80 180 90 160 Q95 145 110 130 Q125 120 140 115" fill="none" stroke="#7B5C42" strokeWidth="4" strokeLinecap="round"/>
      <path d="M90 160 Q75 155 65 145" fill="none" stroke="#7B5C42" strokeWidth="3" strokeLinecap="round"/>
      {/* blossoms */}
      {[
        [62, 145, 0.9, 0.5],
        [95, 158, 1.1, 0.7],
        [112, 132, 1.0, 0.8],
        [135, 118, 0.95, 1.0],
        [80, 135, 0.8, 0.9],
        [128, 145, 0.85, 1.1],
      ].map(([x,y,s,d], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`} className={animated ? "bloom-in" : ""} style={{ animationDelay: `${d}s` }}>
          {[0,72,144,216,288].map(ang => (
            <ellipse key={ang} cx="0" cy="-8" rx="6" ry="8" fill="#FBD4E0" stroke="#E8A8BC" strokeWidth="1" transform={`rotate(${ang})`}/>
          ))}
          <circle r="3" fill="#F4CF6B"/>
        </g>
      ))}
    </g>
  );
}

function Daisy({ animated }) {
  return (
    <g>
      <Stem d="M100 210 Q100 170 100 135" />
      <Leaf cx="100" cy="180" rot={-55} size={0.85} delay={0.3} />
      <Leaf cx="100" cy="165" rot={55} size={0.8} delay={0.4} />
      <g transform="translate(100 112)" className={animated ? "bloom-in" : ""} style={{ animationDelay: "0.6s" }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <ellipse key={i} cx="0" cy="-22" rx="7" ry="14" fill="#FFF9F0" stroke="#E8D9C0" strokeWidth="1.2" transform={`rotate(${i*36})`}/>
        ))}
        <circle r="10" fill="#F4CF6B" stroke="#D4A838" strokeWidth="1.5"/>
      </g>
    </g>
  );
}

function Cactus({ animated }) {
  return (
    <g>
      <g className={animated ? "bloom-in" : ""} style={{ animationDelay: "0.4s" }}>
        {/* main body */}
        <rect x="82" y="120" width="36" height="90" rx="18" fill="#9FC48A" stroke="#6B9060" strokeWidth="2"/>
        {/* arm left */}
        <path d="M82 160 Q62 160 62 140 L62 120 Q62 108 74 108 L82 108 Z" fill="#9FC48A" stroke="#6B9060" strokeWidth="2"/>
        {/* arm right */}
        <path d="M118 170 Q138 170 138 150 L138 135 Q138 124 128 124 L118 124 Z" fill="#9FC48A" stroke="#6B9060" strokeWidth="2"/>
        {/* ribs */}
        <path d="M90 130 L90 200" stroke="#6B9060" strokeWidth="1.2" opacity="0.5"/>
        <path d="M100 130 L100 200" stroke="#6B9060" strokeWidth="1.2" opacity="0.5"/>
        <path d="M110 130 L110 200" stroke="#6B9060" strokeWidth="1.2" opacity="0.5"/>
        {/* flower */}
        <g transform="translate(100 118)">
          {[0,60,120,180,240,300].map(a => <ellipse key={a} cx="0" cy="-7" rx="4" ry="6" fill="#F5B7C7" stroke="#E89AAE" strokeWidth="1" transform={`rotate(${a})`}/>)}
          <circle r="2.5" fill="#F4CF6B"/>
        </g>
        {/* spines */}
        {[[90,135],[100,150],[110,140],[95,175],[105,190],[70,130]].map(([x,y],i) => (
          <g key={i}>
            <line x1={x-2} y1={y} x2={x+2} y2={y} stroke="#4A5E3C" strokeWidth="1"/>
            <line x1={x} y1={y-2} x2={x} y2={y+2} stroke="#4A5E3C" strokeWidth="1"/>
          </g>
        ))}
      </g>
    </g>
  );
}

function Orchid({ animated }) {
  return (
    <g>
      <Stem d="M100 210 Q102 180 100 140" />
      <Leaf cx="100" cy="195" rot={-70} size={1.3} delay={0.3} color="#8BBF7F"/>
      <Leaf cx="100" cy="195" rot={70} size={1.3} delay={0.4} color="#8BBF7F"/>
      {/* three blooms cascading */}
      {[[100, 135, 1.0, 0.6], [78, 115, 0.85, 0.8], [122, 98, 0.95, 1.0]].map(([x,y,s,d], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`} className={animated ? "bloom-in" : ""} style={{ animationDelay: `${d}s` }}>
          {/* top two petals */}
          <ellipse cx="-12" cy="-10" rx="10" ry="14" fill="#E8C4F0" stroke="#B98FD4" strokeWidth="1.3" transform="rotate(-30)"/>
          <ellipse cx="12" cy="-10" rx="10" ry="14" fill="#E8C4F0" stroke="#B98FD4" strokeWidth="1.3" transform="rotate(30)"/>
          {/* side petals */}
          <ellipse cx="-16" cy="4" rx="8" ry="12" fill="#D4A8E0" stroke="#B98FD4" strokeWidth="1.3" transform="rotate(-70)"/>
          <ellipse cx="16" cy="4" rx="8" ry="12" fill="#D4A8E0" stroke="#B98FD4" strokeWidth="1.3" transform="rotate(70)"/>
          {/* labellum */}
          <path d="M-8 0 Q0 14 8 0 Q6 10 0 14 Q-6 10 -8 0 Z" fill="#C47FD4" stroke="#8F5AA0" strokeWidth="1.2"/>
          <circle cx="0" cy="0" r="3" fill="#F4CF6B"/>
        </g>
      ))}
    </g>
  );
}

function Peony({ animated }) {
  return (
    <g>
      <Stem d="M100 210 Q100 175 100 140" />
      <Leaf cx="100" cy="180" rot={-55} size={1.0} delay={0.3} />
      <Leaf cx="100" cy="170" rot={55} size={0.95} delay={0.4} />
      <g transform="translate(100 108)" className={animated ? "bloom-in" : ""} style={{ animationDelay: "0.7s" }}>
        {/* outer ruffles */}
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="0" cy="-26" rx="14" ry="18" fill="#F9C4D3" stroke="#DD8FA6" strokeWidth="1.2" transform={`rotate(${a})`} opacity="0.95"/>
        ))}
        {/* middle layer */}
        {[22,67,112,157,202,247,292,337].map(a => (
          <ellipse key={a} cx="0" cy="-18" rx="10" ry="14" fill="#F5B0C4" stroke="#DD8FA6" strokeWidth="1" transform={`rotate(${a})`}/>
        ))}
        {/* center */}
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-8" rx="5" ry="8" fill="#E8899F" transform={`rotate(${a})`}/>
        ))}
        <circle r="5" fill="#F4CF6B"/>
      </g>
    </g>
  );
}

function Succulent({ animated }) {
  return (
    <g>
      <g transform="translate(100 180)" className={animated ? "bloom-in" : ""} style={{ animationDelay: "0.4s" }}>
        {/* outer ring of leaves */}
        {[0,45,90,135,180,225,270,315].map(a => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 0 Q-14 -8 -12 -34 Q0 -40 12 -34 Q14 -8 0 0 Z" fill="#A8D4A0" stroke="#6FA373" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M-8 -10 Q0 -18 8 -10" fill="#C4E0B8" opacity="0.7"/>
          </g>
        ))}
        {/* inner ring */}
        {[22,67,112,157,202,247,292,337].map(a => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 0 Q-8 -6 -7 -22 Q0 -26 7 -22 Q8 -6 0 0 Z" fill="#B8D9A8" stroke="#6FA373" strokeWidth="1.3"/>
          </g>
        ))}
        {/* center tight leaves */}
        {[0,72,144,216,288].map(a => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 0 Q-4 -4 -3 -12 Q0 -14 3 -12 Q4 -4 0 0 Z" fill="#D4E8C4" stroke="#8FBF8F" strokeWidth="1"/>
          </g>
        ))}
        {/* tips blush */}
        <circle r="3" fill="#E89AAE" opacity="0.8"/>
      </g>
    </g>
  );
}

function Fern({ animated }) {
  const frond = (rot, delay) => (
    <g transform={`translate(100 210) rotate(${rot})`}>
      <path d="M0 0 Q-4 -40 -8 -85" fill="none" stroke={STEM_DARK} strokeWidth="2.5" strokeLinecap="round"/>
      {Array.from({ length: 10 }).map((_, i) => {
        const y = -10 - i*8;
        const size = 1 - i*0.07;
        const x = -1 - i*0.7;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cx="-10" cy="0" rx={9*size} ry={4*size} fill="#9FC48A" stroke={LEAF_DARK} strokeWidth="1" transform="rotate(-25)"/>
            <ellipse cx="10" cy="-2" rx={9*size} ry={4*size} fill="#9FC48A" stroke={LEAF_DARK} strokeWidth="1" transform="rotate(25)"/>
          </g>
        );
      })}
      {/* curled tip */}
      <circle cx="-8" cy="-85" r="4" fill="none" stroke={LEAF_DARK} strokeWidth="1.8"/>
    </g>
  );
  return (
    <g>
      {frond(-18, 0.2)}
      {frond(0, 0.35)}
      {frond(18, 0.5)}
    </g>
  );
}

function Lotus({ animated }) {
  return (
    <g>
      {/* water */}
      <ellipse cx="100" cy="218" rx="70" ry="7" fill="#B8D4E8" opacity="0.5"/>
      <ellipse cx="100" cy="220" rx="55" ry="4" fill="#A8C4DC" opacity="0.5"/>
      {/* lily pad */}
      <path d="M30 215 Q60 208 95 212 Q100 214 95 216 Q60 220 30 217 Z" fill="#8FBF8F" stroke="#5F8F60" strokeWidth="1.5"/>
      <path d="M105 213 Q140 209 170 215 Q170 218 140 219 Q105 216 105 213 Z" fill="#8FBF8F" stroke="#5F8F60" strokeWidth="1.5"/>
      {/* lotus flower */}
      <g transform="translate(100 180)" className={animated ? "bloom-in" : ""} style={{ animationDelay: "0.6s" }}>
        {/* back petals */}
        {[-60, -30, 0, 30, 60].map((a, i) => (
          <path key={`b${i}`} transform={`rotate(${a})`} d="M0 0 Q-10 -18 0 -40 Q10 -18 0 0 Z" fill="#F5B7C7" stroke="#DD8FA6" strokeWidth="1.3" strokeLinejoin="round"/>
        ))}
        {/* mid petals */}
        {[-45, -15, 15, 45].map((a, i) => (
          <path key={`m${i}`} transform={`rotate(${a})`} d="M0 0 Q-8 -14 0 -32 Q8 -14 0 0 Z" fill="#F9C9D8" stroke="#DD8FA6" strokeWidth="1.2" strokeLinejoin="round"/>
        ))}
        {/* front petals */}
        {[-25, 0, 25].map((a, i) => (
          <path key={`f${i}`} transform={`rotate(${a})`} d="M0 0 Q-6 -10 0 -24 Q6 -10 0 0 Z" fill="#FDE0E8" stroke="#DD8FA6" strokeWidth="1.2" strokeLinejoin="round"/>
        ))}
        {/* center */}
        <circle r="5" fill="#F4CF6B" stroke="#D4A838" strokeWidth="1.2"/>
      </g>
    </g>
  );
}

// ----- Plant registry -----

const PLANTS = [
  { id: "rose",        name: "Rose",          color: "#E89AAE", Render: Rose,         whisper: "For bold focus" },
  { id: "sunflower",   name: "Sunflower",     color: "#F4CF6B", Render: Sunflower,    whisper: "For sunny work" },
  { id: "tulip",       name: "Tulip",         color: "#E89AAE", Render: Tulip,        whisper: "For tender starts" },
  { id: "lavender",    name: "Lavender",      color: "#B39FD6", Render: Lavender,     whisper: "For calm hours" },
  { id: "cherry",      name: "Cherry Blossom", color: "#F5B7C7", Render: CherryBlossom, whisper: "For fleeting moments" },
  { id: "daisy",       name: "Daisy",         color: "#F4CF6B", Render: Daisy,        whisper: "For simple joys" },
  { id: "cactus",      name: "Cactus",        color: "#9FC48A", Render: Cactus,       whisper: "For stubborn tasks" },
  { id: "orchid",      name: "Orchid",        color: "#C47FD4", Render: Orchid,       whisper: "For delicate work" },
  { id: "peony",       name: "Peony",         color: "#F5B0C4", Render: Peony,        whisper: "For abundance" },
  { id: "succulent",   name: "Succulent",     color: "#A8D4A0", Render: Succulent,    whisper: "For steady days" },
  { id: "fern",        name: "Fern",          color: "#9FC48A", Render: Fern,         whisper: "For quiet thinking" },
  { id: "lotus",       name: "Lotus",         color: "#F9C9D8", Render: Lotus,        whisper: "For reflection" },
];

function PlantSVG({ plantId, size = 200, animated = false, pot = false, bg = null }) {
  const plant = PLANTS.find(p => p.id === plantId) || PLANTS[0];
  const Render = plant.Render;
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} style={{ display: "block" }}>
      {bg && <circle cx="100" cy="120" r="95" fill={bg}/>}
      <Render animated={animated}/>
      <Pot show={pot}/>
    </svg>
  );
}

export { PLANTS, PlantSVG };
window.PLANTS = PLANTS;
window.PlantSVG = PlantSVG;
