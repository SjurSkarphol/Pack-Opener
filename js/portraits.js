// Draws painted-style card art as SVG from the traits in PORTRAITS (js/cards.js).
// Each portrait is built in layers:
//   1. a scene (sky, landscape, light source)
//   2. the character, with a rim light in the scene's light colour to separate it from the background
//   3. atmosphere on top: particles, a vignette and a canvas-grain texture
// Coordinates use a 100 x 80 box. Scenes bleed past the sides so the art always fills its frame.

let portraitCount = 0;

// Lighten (amt > 0) or darken (amt < 0) a hex colour
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Draws the shape on the left side and its mirror image on the right
const pair = svg => svg + `<g transform="translate(100 0) scale(-1 1)">${svg}</g>`;
const mirror = svg => `<g transform="translate(100 0) scale(-1 1)">${svg}</g>`;

// Seeded random numbers, so a card's scene looks the same every time it is drawn
function seededRandom(text) {
  let s = 7;
  for (const ch of text) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ---------- Shared paint: gradients and filters ----------

function paintDefs(u, p, light, lightX) {
  const lin = (id, base, hi = 0.16, lo = -0.22) => base ? `
    <linearGradient id="${u}${id}" x1="0" y1="0" x2=".5" y2="1">
      <stop offset="0" stop-color="${shade(base, hi)}"/><stop offset=".55" stop-color="${base}"/>
      <stop offset="1" stop-color="${shade(base, lo)}"/></linearGradient>` : "";
  const rad = (id, base) => base ? `
    <radialGradient id="${u}${id}" cx=".38" cy=".32" r=".8">
      <stop offset="0" stop-color="${shade(base, 0.18)}"/><stop offset=".5" stop-color="${base}"/>
      <stop offset="1" stop-color="${shade(base, -0.28)}"/></radialGradient>` : "";
  const rimDx = lightX < 45 ? -0.5 : lightX > 55 ? 0.5 : 0;

  return `
    <filter id="${u}glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${u}soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${u}haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.5"/></filter>
    <filter id="${u}rim" x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius=".9" result="d"/>
      <feFlood flood-color="${light}" flood-opacity=".9"/>
      <feComposite in2="d" operator="in"/>
      <feOffset dx="${rimDx}" dy="-.4"/>
      <feGaussianBlur stdDeviation=".7"/></filter>
    <filter id="${u}paint">
      <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3"/>
      <feDisplacementMap in="SourceGraphic" scale=".8" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="${u}grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="3" seed="7"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 .75"/></filter>
    <radialGradient id="${u}vig" cx=".5" cy=".45" r=".75">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
    ${lin("skin", p.skin)}${rad("skinR", p.skin)}${lin("hair", p.hair || "#2a1a10")}
    ${lin("armor", p.armor)}${lin("trim", p.trim)}${lin("metal", p.metal || "#9aa2aa", 0.3, -0.3)}
    ${lin("hood", p.hood)}${lin("cape", p.cape)}${lin("wing", p.wing)}${lin("horn", p.horn, 0.2, -0.3)}
    ${lin("steel", "#b8c0c8", 0.35, -0.35)}${lin("gold", "#d0b050", 0.3, -0.3)}`;
}

// ---------- Scene building blocks ----------

const skyRect = (u, top, bottom) => `
  <linearGradient id="${u}sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
  <rect x="-30" y="-10" width="160" height="100" fill="url(#${u}sky)"/>`;

const softGlow = (u, x, y, r, color, op = 0.6) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${op}" filter="url(#${u}soft)"/>`;

function stars(r, n, y1 = 35, x0 = -10, x1 = 110) {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += `<circle cx="${x0 + r() * (x1 - x0)}" cy="${r() * y1}" r="${0.2 + r() * 0.4}" fill="#fff" opacity="${0.3 + r() * 0.6}"/>`;
  }
  return s;
}

// A row of pine-tree silhouettes standing on the line y = base
function pines(r, color, base, count, hMin, hMax, x0 = -25, x1 = 125) {
  let s = "";
  for (let i = 0; i < count; i++) {
    const x = x0 + (x1 - x0) * (i + r() * 0.6) / count, h = hMin + r() * (hMax - hMin), w = h * 0.45;
    s += `<path d="M${x} ${base - h} L${x + w * .3} ${base - h * .6} L${x + w * .15} ${base - h * .6}
      L${x + w * .45} ${base - h * .25} L${x + w * .25} ${base - h * .25} L${x + w * .55} ${base}
      L${x - w * .55} ${base} L${x - w * .25} ${base - h * .25} L${x - w * .45} ${base - h * .25}
      L${x - w * .15} ${base - h * .6} L${x - w * .3} ${base - h * .6}Z"/>`;
  }
  return `<g fill="${color}">${s}</g>`;
}

// Round-canopied trees
function trees(r, color, base, count, x0 = -25, x1 = 125) {
  let s = "";
  for (let i = 0; i < count; i++) {
    const x = x0 + (x1 - x0) * (i + r() * 0.6) / count, h = 10 + r() * 12, w = 5 + r() * 5;
    s += `<rect x="${x - 0.8}" y="${base - h}" width="1.6" height="${h}"/>
      <ellipse cx="${x}" cy="${base - h}" rx="${w}" ry="${w * 0.7}"/>
      <ellipse cx="${x - w * .6}" cy="${base - h + 2}" rx="${w * .6}" ry="${w * .45}"/>
      <ellipse cx="${x + w * .6}" cy="${base - h + 2}" rx="${w * .6}" ry="${w * .45}"/>`;
  }
  return `<g fill="${color}">${s}</g>`;
}

// Jagged mountain ridge
function ridge(r, color, base, amp, step = 8) {
  let d = `M-30 90 L-30 ${base}`;
  for (let x = -30; x <= 130; x += step) d += ` L${x} ${base - r() * amp}`;
  return `<path d="${d} L130 90Z" fill="${color}"/>`;
}

// Gentle rolling hills
const hills = (color, base, amp) =>
  `<path d="M-30 90 L-30 ${base} Q0 ${base - amp} 25 ${base} T75 ${base} T125 ${base} L130 ${base} L130 90Z" fill="${color}"/>`;

function gear(cx, cy, R, teeth, color, hole) {
  const dash = (2 * Math.PI * R) / (teeth * 2);
  return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${color}" stroke-width="${R * .35}" stroke-dasharray="${dash} ${dash}"/>
    <circle cx="${cx}" cy="${cy}" r="${R * .88}" fill="${color}"/>
    <circle cx="${cx}" cy="${cy}" r="${R * .35}" fill="${hole}"/>`;
}

const frond = (x, y, angle, len, color) =>
  `<path d="M0 0 Q${len / 2} -7 ${len} 0 Q${len / 2} 2.5 0 0Z" transform="translate(${x} ${y}) rotate(${angle})" fill="${color}"/>`;

// ---------- Scenes ----------
// Each returns the scene SVG, its light colour and position, and which particles float in the air.

function forestScene(u, r, c) {
  return {
    light: c.light, lx: 78, ly: 14, fx: c.fx,
    svg: skyRect(u, c.top, c.bottom) + stars(r, 16)
      + softGlow(u, 78, 14, 12, c.moon, 0.55) + `<circle cx="78" cy="14" r="5.5" fill="${c.moon}"/>`
      + ridge(r, c.ridge, 50, 10)
      + pines(r, c.far, 64, 16, 16, 30)
      + `<ellipse cx="50" cy="64" rx="70" ry="6" fill="${c.mist}" opacity=".15" filter="url(#${u}haze)"/>`
      + pines(r, c.near, 86, 3, 46, 62, -25, 14) + pines(r, c.near, 86, 3, 46, 62, 86, 125)
      + `<rect x="-30" y="72" width="160" height="20" fill="${c.near}"/>`,
  };
}

const SCENES = {
  forest: (u, r) => forestScene(u, r, {
    top: "#0d1428", bottom: "#34486a", ridge: "#2a3a58", far: "#1c283e", near: "#0a101c",
    moon: "#e8f0ff", mist: "#c8d8ff", light: "#a8c4ff", fx: "fireflies" }),

  moonforest: (u, r) => forestScene(u, r, {
    top: "#140c30", bottom: "#4a3a80", ridge: "#30285a", far: "#211a44", near: "#0c0a1e",
    moon: "#f0e8ff", mist: "#d8c8ff", light: "#c8b8ff", fx: "motes" }),

  swamp: (u, r) => {
    let reeds = "", ripples = "", pads = "";
    for (const x of [-12, -8, -4, 0, 4, 8, 92, 96, 100, 104, 108]) {
      const top = 52 + r() * 10, tip = x + r() * 4 - 2;
      reeds += `<path d="M${x} 82 Q${x + 1} 68 ${tip} ${top}" stroke="#0c1c14" stroke-width="1.1" fill="none"/>
        <ellipse cx="${tip}" cy="${top + 2}" rx=".9" ry="2.4" fill="#3a2414"/>`;
    }
    for (let i = 0; i < 9; i++) ripples += `<path d="M${-10 + r() * 110} ${61 + r() * 16} h${3 + r() * 8}" stroke="#9ad0b0" stroke-opacity=".35" stroke-width=".5"/>`;
    for (let i = 0; i < 4; i++) pads += `<ellipse cx="${-5 + r() * 25 + (i % 2) * 70}" cy="${66 + r() * 10}" rx="3.5" ry="1.2" fill="#3a6a32"/>`;
    return {
      light: "#d8f0a0", lx: 28, ly: 22, fx: "fireflies",
      svg: skyRect(u, "#132a26", "#6a8a58") + softGlow(u, 28, 22, 16, "#e8f0b0", 0.55)
        + hills("#2a4a3a", 52, 6) + trees(r, "#1a3328", 60, 7)
        + `<rect x="-30" y="58" width="160" height="30" fill="#14362e"/>
           <rect x="-30" y="58" width="160" height="4" fill="#cfe8b0" opacity=".12"/>`
        + ripples + pads + reeds,
    };
  },

  barrens: (u, r) => ({
    light: "#ffc070", lx: 22, ly: 44, fx: "dust",
    svg: skyRect(u, "#4a2040", "#f2a050") + softGlow(u, 22, 44, 20, "#ffd080", 0.8)
      + `<circle cx="22" cy="44" r="7" fill="#ffe4a8"/>
         <path d="M-30 62 L-14 62 L-10 46 L14 46 L18 62 L58 62 L62 50 L86 50 L90 62 L130 62 L130 90 L-30 90Z" fill="#8a4a32"/>
         <path d="M-10 46 L14 46 L13 50 L-9 50Z M62 50 L86 50 L85 53 L63 53Z" fill="#b0663e"/>`
      + hills("#6a3a22", 70, 4)
      + `<path d="M86 74 Q97 54 110 74Z" fill="#7a5a3a" stroke="#3a2010" stroke-width=".6"/>
         <path d="M96 74 Q98.5 66 101 74Z" fill="#2a1408"/>
         <path d="M90 66 L83 59 M106 66 L113 59" stroke="#e8dcc0" stroke-width="1.3" stroke-linecap="round"/>
         <path d="M-20 74 L-8 64 L-6 74Z" fill="#5a2e1a"/>`,
  }),

  mine: (u, r) => ({
    light: "#ffb050", lx: 12, ly: 24, fx: "dust",
    svg: skyRect(u, "#1a110a", "#3a2818") + softGlow(u, 50, 44, 22, "#ff9a40", 0.25)
      + `<path d="M-30 -10 L130 -10 L130 12 L110 18 L96 8 L80 16 L64 6 L50 12 L36 5 L22 15 L8 7 L-10 16 L-30 10Z" fill="#0e0804"/>
         <path d="M-30 90 L-30 20 L-12 26 L-16 44 L-8 60 L-14 90Z M130 90 L130 20 L112 28 L116 46 L108 62 L114 90Z" fill="#140c06"/>
         <rect x="2" y="12" width="5" height="70" fill="#5a3a1a"/><rect x="93" y="12" width="5" height="70" fill="#5a3a1a"/>
         <rect x="-2" y="10" width="104" height="5" fill="#6a4422"/>
         <rect x="2" y="12" width="1.2" height="70" fill="#8a6a3a" opacity=".5"/><rect x="93" y="12" width="1.2" height="70" fill="#8a6a3a" opacity=".5"/>
         <path d="M12 15 V22" stroke="#222" stroke-width=".5"/>`
      + softGlow(u, 12, 25, 10, "#ffb050", 0.8)
      + `<rect x="10" y="22" width="4" height="5" rx="1" fill="#ffd27a" stroke="#3a2a10" stroke-width=".6"/>
         <path d="M-6 82 L-2 64 L2 82Z M2 82 L6 68 L9 82Z M98 82 L101 70 L104 82Z" fill="#6ad0ff" opacity=".9" filter="url(#${u}glow)"/>
         <rect x="-30" y="76" width="160" height="14" fill="#1a100a"/>`,
  }),

  forge: (u, r) => ({
    light: "#ff9a40", lx: 12, ly: 60, fx: "embers",
    svg: skyRect(u, "#1c1614", "#3a2c26")
      + `<path d="M-30 90 L-30 4 L130 4 L130 90 L104 90 L104 32 Q104 14 86 14 Q70 14 70 32 L70 90 L30 90 L30 32 Q30 14 14 14 Q-4 14 -4 32 L-4 90Z" fill="#3e3430"/>
         <path d="M-30 24 H-4 M-30 44 H-4 M30 24 H70 M30 44 H70 M30 64 H70 M104 24 H130 M104 44 H130 M50 4 V24 M40 24 V44 M60 24 V44 M50 44 V64" stroke="#2a2220" stroke-width=".7"/>`
      + softGlow(u, 13, 64, 16, "#ff7a20", 0.9)
      + `<path d="M6 76 Q8 62 12 68 Q13 56 16 66 Q19 60 20 76Z" fill="#ffb040" filter="url(#${u}glow)"/>
         <path d="M9 76 Q11 68 13 71 Q15 64 17 76Z" fill="#fff0a0"/>
         <path d="M80 16 L92 16 L92 46 L86 41 L80 46Z" fill="#8a1a1a" stroke="#d0a030" stroke-width=".7"/>
         <path d="M84 24 h4 v3 h-1.2 v8 h-1.6 v-8 h-1.2Z" fill="#d0a030"/>
         <rect x="-30" y="76" width="160" height="14" fill="#1e1816"/>`,
  }),

  jungle: (u, r) => ({
    light: "#ffe0a0", lx: 62, ly: 16, fx: "motes",
    svg: skyRect(u, "#163626", "#8ab870") + softGlow(u, 62, 16, 22, "#fff0b0", 0.55)
      + `<path d="M18 66 L22 58 L28 58 L31 50 L38 50 L41 42 L59 42 L62 50 L69 50 L72 58 L78 58 L82 66Z" fill="#3a5a40"/>
         <rect x="45" y="35" width="10" height="7" fill="#3a5a40"/><rect x="48" y="37" width="4" height="5" fill="#16281a"/>`
      + hills("#24442e", 62, 7) + trees(r, "#18321f", 70, 8)
      + frond(-10, -4, 30, 34, "#0c1e10") + frond(-6, 4, 55, 30, "#122a16") + frond(-14, 18, 10, 30, "#0c1e10")
      + frond(110, -4, 150, 34, "#0c1e10") + frond(106, 4, 125, 30, "#122a16") + frond(114, 18, 170, 30, "#0c1e10")
      + `<path d="M6 -2 Q11 14 5 30 M94 -2 Q89 18 96 34" stroke="#1a3a20" stroke-width="1" fill="none"/>`,
  }),

  storm: (u, r) => {
    let clouds = "";
    for (let i = 0; i < 9; i++) clouds += `<ellipse cx="${-20 + r() * 140}" cy="${r() * 22}" rx="${12 + r() * 14}" ry="${5 + r() * 4}" fill="#24244a" opacity=".85"/>`;
    return {
      light: "#a8dcff", lx: 70, ly: 16, fx: "rain",
      svg: skyRect(u, "#12122a", "#5a5a86") + `<g filter="url(#${u}haze)">${clouds}</g>`
        + softGlow(u, 70, 16, 14, "#a0d8ff", 0.7)
        + `<path d="M74 0 L68 14 L73 14 L64 32 L78 12 L72 12 L78 0Z" fill="#e8f6ff" filter="url(#${u}glow)"/>`
        + hills("#2c3a2c", 60, 6) + hills("#1a2618", 70, 5)
        + `<path d="M-14 70 L-2 46 L10 70Z" fill="#6a4a2a"/><path d="M-4 44 L-2 46 M-2 46 L0 42" stroke="#3a2a10" stroke-width=".8"/>
           <path d="M-5 70 L-2 62 L1 70Z" fill="#2a1a0a"/>
           <rect x="94" y="48" width="5" height="24" fill="#7a5a3a"/><path d="M88 52 L94 50 L94 54Z M105 52 L99 50 L99 54Z" fill="#c04030"/>
           <circle cx="96.5" cy="46" r="3" fill="#d0a060"/>`,
    };
  },

  workshop: (u, r) => {
    let grid = "";
    for (let x = -20; x <= 120; x += 10) grid += `<path d="M${x} 0 V80" stroke="#8ac0f0" stroke-opacity=".08"/>`;
    for (let y = 0; y <= 80; y += 10) grid += `<path d="M-30 ${y} H130" stroke="#8ac0f0" stroke-opacity=".08"/>`;
    return {
      light: "#ffd070", lx: 30, ly: 30, fx: "sparks",
      svg: skyRect(u, "#142438", "#2e4c6c") + grid
        + gear(6, 18, 12, 10, "#34506e", "#142438") + gear(98, 58, 14, 12, "#34506e", "#203a56")
        + gear(88, 12, 7, 8, "#b08428", "#3a2a10") + gear(12, 66, 8, 8, "#b08428", "#3a2a10")
        + `<path d="M-12 40 H18 Q24 40 24 34 V-5" stroke="#8a6a3a" stroke-width="3" fill="none"/>
           <path d="M-12 40 H18 Q24 40 24 34 V-5" stroke="#d0a860" stroke-width=".8" fill="none" opacity=".6"/>
           <rect x="21.5" y="20" width="5" height="3" fill="#6a4a20"/>`
        + softGlow(u, 30, 30, 14, "#ffd070", 0.3)
        + `<rect x="-30" y="76" width="160" height="14" fill="#1a2a3a"/>`,
    };
  },

  arcane: (u, r) => {
    let books = "";
    const bookColors = ["#6a2a2a", "#2a4a6a", "#5a4a1a", "#3a2a5a", "#2a5a3a"];
    for (const [x0, x1] of [[-30, 20], [80, 130]]) {
      for (const y of [14, 32, 50, 68]) {
        for (let x = x0 + 2; x < x1 - 2; x += 2.6 + r() * 1.5) {
          const h = 9 + r() * 5;
          books += `<rect x="${x}" y="${y - h}" width="2.2" height="${h}" fill="${bookColors[Math.floor(r() * 5)]}"/>`;
        }
        books += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="2" fill="#3a2414"/>`;
      }
    }
    return {
      light: "#d0a0ff", lx: 50, ly: 28, fx: "motes",
      svg: skyRect(u, "#120a2a", "#3a2a78")
        + `<rect x="-30" y="0" width="50" height="80" fill="#1e1430"/><rect x="80" y="0" width="50" height="80" fill="#1e1430"/>` + books
        + `<path d="M24 80 L24 30 Q24 4 50 4 Q76 4 76 30 L76 80Z" fill="#0a0824" stroke="#6a5aaa" stroke-width="2"/>`
        + stars(r, 26, 60, 27, 73)
        + `<path d="M50 4 V80 M24 40 H76" stroke="#6a5aaa" stroke-width="1"/>
           <circle cx="50" cy="34" r="25" fill="none" stroke="#c080ff" stroke-width=".8" opacity=".75" filter="url(#${u}glow)"/>
           <circle cx="50" cy="34" r="22" fill="none" stroke="#e0b0ff" stroke-width="1.6" stroke-dasharray="1 3" opacity=".7"/>`,
    };
  },

  graveyard: (u, r) => {
    let stones = "";
    for (const [x, h, w] of [[-14, 9, 7], [6, 7, 6], [78, 8, 6], [104, 10, 7], [92, 6, 5]]) {
      stones += `<path d="M${x} 74 v-${h} q${w / 2} -${w / 1.6} ${w} 0 v${h}Z" fill="#2c3628" stroke="#121810" stroke-width=".6"/>`;
    }
    return {
      light: "#c8ff70", lx: 22, ly: 16, fx: "spores",
      svg: skyRect(u, "#0e1a10", "#4a5a2a") + stars(r, 10, 25)
        + softGlow(u, 22, 16, 14, "#d8ffa0", 0.55) + `<circle cx="22" cy="16" r="6" fill="#e8ffc8"/>`
        + hills("#1e2a16", 64, 4)
        + `<path d="M98 80 L95 40" stroke="#0c120a" stroke-width="4"/>
           <path d="M95 46 Q92 30 84 24 M95 46 Q101 36 110 32 M94.5 38 Q97 26 94 14 M88 27 Q82 22 77 24" stroke="#0c120a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
           <path d="M-26 74 v-12 M-29 66 h6 M120 74 v-11 M117 67 h6" stroke="#2c3628" stroke-width="2"/>`
        + stones
        + `<ellipse cx="10" cy="72" rx="30" ry="5" fill="#b0e070" opacity=".18" filter="url(#${u}haze)"/>
           <ellipse cx="92" cy="74" rx="28" ry="5" fill="#b0e070" opacity=".18" filter="url(#${u}haze)"/>
           <rect x="-30" y="74" width="160" height="16" fill="#121a0e"/>`,
    };
  },

  cathedral: (u, r) => ({
    light: "#fff0b0", lx: 50, ly: 8, fx: "motes",
    svg: skyRect(u, "#24180a", "#7a5a2a")
      + `<path d="M34 72 L34 24 Q34 6 50 2 Q66 6 66 24 L66 72Z" fill="#f8e8b0" opacity=".85"/>
         <path d="M35 24 Q35 8 50 4 L50 30Z" fill="#4a7ad0" opacity=".45"/>
         <path d="M65 24 Q65 8 50 4 L50 30Z" fill="#d04a4a" opacity=".45"/>
         <path d="M35 30 H65 V50 H35Z" fill="#e0b040" opacity=".35"/>
         <path d="M50 2 V72 M34 30 H66 M34 50 H66" stroke="#3a2a10" stroke-width="1"/>
         <path d="M34 72 L34 24 Q34 6 50 2 Q66 6 66 24 L66 72" fill="none" stroke="#5a4020" stroke-width="2"/>
         <rect x="-2" y="0" width="12" height="80" fill="#5a4426"/><rect x="90" y="0" width="12" height="80" fill="#5a4426"/>
         <rect x="-2" y="0" width="3" height="80" fill="#8a6a3a" opacity=".6"/><rect x="90" y="0" width="3" height="80" fill="#8a6a3a" opacity=".6"/>
         <path d="M38 2 L62 2 L94 82 L6 82Z" fill="#fff4c0" opacity=".12" filter="url(#${u}haze)"/>
         <rect x="-30" y="74" width="160" height="16" fill="#3a2a14"/>`,
  }),

  fel: (u, r) => ({
    light: "#80ff50", lx: 50, ly: 34, fx: "felEmbers",
    svg: skyRect(u, "#0a0510", "#2a1430")
      + softGlow(u, 50, 34, 26, "#40c020", 0.45)
      + `<circle cx="50" cy="34" r="29" fill="#0e2a08" opacity=".7"/>
         <circle cx="50" cy="34" r="29" fill="none" stroke="#70ff40" stroke-width="2.2" opacity=".9" filter="url(#${u}glow)"/>
         <circle cx="50" cy="34" r="33" fill="none" stroke="#50d030" stroke-width="1.6" stroke-dasharray="2 2.5" opacity=".6"/>
         <path d="M28 34 Q40 20 50 34 T72 34" stroke="#60ff40" stroke-width=".7" fill="none" opacity=".5"/>
         <path d="M-30 90 L-30 30 L-22 26 L-18 32 L-12 28 L-12 90Z M112 90 L112 22 L118 18 L122 26 L130 22 L130 90Z" fill="#1c1424"/>
         <path d="M4 18 L14 16 L12 22 L6 23Z M86 10 L96 12 L92 18 L86 16Z" fill="#2a1e30"/>
         <path d="M5 23 L12 22 M87 16 L92 18" stroke="#70ff40" stroke-width=".8" filter="url(#${u}glow)"/>
         <rect x="-30" y="74" width="160" height="16" fill="#140c18"/>
         <path d="M-10 78 L4 75 L10 79 M80 77 L92 75 L104 78" stroke="#60ff40" stroke-width=".6" fill="none" filter="url(#${u}glow)"/>`,
  }),

  frost: (u, r) => ({
    light: "#a8ecff", lx: 50, ly: 10, fx: "snow",
    svg: skyRect(u, "#081428", "#3a6a96") + stars(r, 18, 30)
      + `<path d="M-30 20 Q10 4 40 18 T130 10" stroke="#60ffc0" stroke-width="8" fill="none" opacity=".25" filter="url(#${u}haze)"/>
         <path d="M-30 30 Q20 16 60 28 T130 22" stroke="#a080ff" stroke-width="5" fill="none" opacity=".18" filter="url(#${u}haze)"/>`
      + ridge(r, "#6a8aaa", 52, 20, 12) + ridge(r, "#2a4460", 64, 10)
      + hills("#c8dcec", 74, 3),
  }),

  citadel: (u, r) => {
    const base = SCENES.frost(u, r);
    base.svg += `<path d="M6 66 L10 28 L14 66Z M16 66 L21 16 L26 66Z M74 66 L79 18 L84 66Z M86 66 L89 32 L92 66Z" fill="#141e2e"/>
      <rect x="2" y="56" width="96" height="12" fill="#141e2e"/>
      <path d="M20.5 34 v3 M78.5 36 v3 M10 44 v2 M89 46 v2" stroke="#7ae8ff" stroke-width="1" filter="url(#${u}glow)"/>`
      + hills("#c8dcec", 76, 3);
    return base;
  },

  warcamp: (u, r) => {
    let fence = "";
    for (let x = -30; x < 130; x += 6) {
      fence += `<path d="M${x} 82 L${x} ${62 + r() * 4} L${x + 3} ${55 + r() * 4} L${x + 6} ${62 + r() * 4} L${x + 6} 82Z" fill="#3a1e0e" stroke="#1a0a04" stroke-width=".5"/>`;
    }
    return {
      light: "#ff8a40", lx: 50, ly: 50, fx: "embers",
      svg: skyRect(u, "#2a0606", "#d0602a")
        + `<g filter="url(#${u}haze)"><ellipse cx="10" cy="20" rx="30" ry="8" fill="#1a0a08" opacity=".5"/>
           <ellipse cx="86" cy="12" rx="34" ry="7" fill="#1a0a08" opacity=".45"/></g>`
        + softGlow(u, 50, 56, 22, "#ff9a40", 0.6)
        + fence
        + `<path d="M8 82 V18 M92 82 V18" stroke="#2a1408" stroke-width="1.5"/>
           <path d="M8 18 L20 20 L18 28 L20 36 L8 34Z M92 18 L80 20 L82 28 L80 36 L92 34Z" fill="#9a1a10" stroke="#3a0a04" stroke-width=".5"/>
           <circle cx="13.5" cy="26" r="2.5" fill="#1a0a04"/><circle cx="86.5" cy="26" r="2.5" fill="#1a0a04"/>`
        + softGlow(u, -8, 58, 8, "#ffb040", 0.8) + softGlow(u, 108, 58, 8, "#ffb040", 0.8),
    };
  },

  volcano: (u, r) => ({
    light: "#ff7020", lx: 50, ly: 26, fx: "embers",
    svg: skyRect(u, "#140404", "#7a1c0a")
      + `<g filter="url(#${u}haze)"><ellipse cx="50" cy="8" rx="40" ry="10" fill="#2a0a06" opacity=".7"/></g>`
      + `<path d="M-14 72 L28 30 L38 25 L62 25 L72 30 L114 72Z" fill="#1a0c0a"/>`
      + softGlow(u, 50, 24, 14, "#ff6a10", 0.95)
      + `<path d="M40 25 Q44 14 50 4 Q54 14 60 25Z" fill="#ff8a30" opacity=".5" filter="url(#${u}haze)"/>
         <path d="M44 27 Q40 44 30 60 M56 27 Q62 46 72 62 M50 27 Q51 40 47 52" stroke="#ff7a20" stroke-width="1.4" fill="none" filter="url(#${u}glow)"/>
         <rect x="-30" y="72" width="160" height="18" fill="#2a0804"/>
         <path d="M-20 76 L-4 74 L8 78 M90 75 L104 77 L118 74" stroke="#ff9a30" stroke-width=".8" fill="none" filter="url(#${u}glow)"/>`,
  }),

  dream: (u, r) => ({
    light: "#c8ffe8", lx: 50, ly: 18, fx: "motes",
    svg: skyRect(u, "#062c28", "#5ab89a") + softGlow(u, 50, 18, 24, "#e0fff0", 0.6)
      + `<path d="M-6 82 Q-2 50 -8 30 L4 30 Q2 50 6 82Z M100 82 Q98 50 104 26 L114 26 Q108 50 110 82Z" fill="#0c3a30"/>
         <ellipse cx="-2" cy="22" rx="22" ry="14" fill="#0e4a3a"/><ellipse cx="108" cy="18" rx="24" ry="15" fill="#0e4a3a"/>
         <ellipse cx="-2" cy="22" rx="22" ry="14" fill="none" stroke="#9affd0" stroke-width=".6" opacity=".5"/>
         <ellipse cx="108" cy="18" rx="24" ry="15" fill="none" stroke="#9affd0" stroke-width=".6" opacity=".5"/>
         <path d="M66 34 h16 l-3 5 l-5 4 l-5 -4Z M18 46 h12 l-2 4 l-4 3 l-4 -3Z" fill="#1a5a44"/>`
      + hills("#145a46", 70, 5)
      + `<ellipse cx="50" cy="74" rx="70" ry="8" fill="#e0fff0" opacity=".22" filter="url(#${u}haze)"/>`,
  }),
};

// Floating particles in front of everything
function particles(type, r, u, light) {
  const n = { snow: 40, embers: 26, felEmbers: 24, fireflies: 14, motes: 22, rain: 40, dust: 18, sparks: 14, spores: 16 }[type] || 0;
  const glow = `filter="url(#${u}glow)"`;
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = -8 + r() * 116, y = r() * 80, sz = 0.3 + r() * 0.7;
    if (type === "snow") s += `<circle cx="${x}" cy="${y}" r="${sz}" fill="#fff" opacity="${0.5 + r() * 0.5}"/>`;
    else if (type === "rain") s += `<path d="M${x} ${y} l-2 6" stroke="#cfe6ff" stroke-width=".35" opacity=".45"/>`;
    else if (type === "sparks") s += `<path d="M${x} ${y} l${r() * 3 - 1.5} ${r() * 3 - 1.5}" stroke="#ffe080" stroke-width=".5" ${glow}/>`;
    else if (type === "dust") s += `<circle cx="${x}" cy="${y}" r="${sz * 0.6}" fill="#f0d0a0" opacity=".35"/>`;
    else {
      const color = { embers: r() > 0.5 ? "#ffb040" : "#ff6a20", felEmbers: "#90ff60", fireflies: "#e8ff80",
                      spores: "#c8ff70", motes: light }[type];
      s += `<circle cx="${x}" cy="${y}" r="${sz * 0.7}" fill="${color}" opacity="${0.6 + r() * 0.4}" ${glow}/>`;
    }
  }
  return s;
}

// ---------- Weapons, hands and spells ----------

// Where the character's hand grips each weapon
const GRIPS = { axe: [79, 61], hammer: [79.8, 62], runeblade: [79.4, 71], bow: [90.5, 41],
                staff: [81.8, 60], totem: [81.8, 60], wrench: [80.1, 62] };

function weapon(type, p, g, u) {
  const wood = "#5a3a1a", glow = `filter="url(#${u}glow)"`;
  return {
    axe: `<line x1="76" y1="80" x2="86" y2="10" stroke="${wood}" stroke-width="3"/>
          <path d="M85 11 Q100 13 97 31 Q90 24 83 25Z" fill="${g("steel")}" stroke="#333" stroke-width=".8"/>
          <path d="M97 30 Q99.5 15 86 12" stroke="#fff" stroke-width=".7" fill="none" opacity=".6"/>`,
    hammer: `<line x1="78" y1="80" x2="84" y2="16" stroke="${wood}" stroke-width="3"/>
          <rect x="74" y="7" width="20" height="13" rx="2" fill="${g("gold")}" stroke="#5a4010" transform="rotate(6 84 13)"/>
          <path d="M76 9.5 H92" stroke="#fff" stroke-width=".7" opacity=".5" transform="rotate(6 84 13)"/>`,
    runeblade: `<path d="M79 64 L87 6 L91 3 L90.5 8 L83 65Z" fill="#9ad8ff" stroke="#2a5a7a" stroke-width=".6" ${glow}/>
          <path d="M83 50 l1 -2 M84 40 l1 -2 M85.5 30 l1 -2 M86.5 20 l1 -2" stroke="#e8ffff" stroke-width=".8" ${glow}/>
          <line x1="80" y1="66" x2="78.8" y2="77" stroke="#2a2a3a" stroke-width="2.6"/>
          <line x1="74" y1="61" x2="89" y2="66" stroke="${g("metal")}" stroke-width="3.5"/>`,
    bow: `<path d="M82 80 Q99 40 82 2" fill="none" stroke="#6a4a2a" stroke-width="3"/>
          <path d="M82 80 Q99 40 82 2" fill="none" stroke="#b08a5a" stroke-width=".8" opacity=".6"/>
          <line x1="82" y1="2" x2="82" y2="80" stroke="#ddd" stroke-width=".6"/>`,
    staff: `<line x1="80" y1="80" x2="86" y2="14" stroke="#6a4a2a" stroke-width="3"/>
          <path d="M82 16 Q86 4 90 16" fill="none" stroke="#d0a030" stroke-width="1.5"/>
          <circle cx="86" cy="10" r="5" fill="${p.orb}" ${glow}/><circle cx="84.5" cy="8.5" r="1.5" fill="#fff" opacity=".7"/>`,
    totem: `<line x1="80" y1="80" x2="86" y2="14" stroke="${wood}" stroke-width="3.5"/>
          <rect x="81" y="10" width="10" height="9" rx="2" fill="#a07040" stroke="#3a2a10"/>
          <path d="M83 13 h2 M87 13 h2 M84 16 h4" stroke="#2a1a08" stroke-width=".8"/>
          <path d="M80 12 L74 8 L80 15Z M92 12 L98 8 L92 15Z" fill="#e8e0d0"/>`,
    wrench: `<line x1="78" y1="80" x2="85" y2="20" stroke="${g("steel")}" stroke-width="3.5"/>
          <circle cx="85" cy="15" r="6.5" fill="${g("steel")}" stroke="#444"/>
          <rect x="83" y="7" width="4" height="7" fill="#1a2a3a"/>`,
  }[type] || "";
}

function hand([x, y], g, dark) {
  return `<circle cx="${x}" cy="${y}" r="3.2" fill="${g("skin")}" stroke="${dark}" stroke-width=".5"/>
    <path d="M${x - 2.3} ${y - .4} h4.6 M${x - 2.1} ${y + 1} h4.2" stroke="${dark}" stroke-width=".35" opacity=".6"/>`;
}

// A raised left arm holding a spell
function castArm(p, g, dark) {
  return `<path d="M33 70 Q14 70 12.5 52 L13.5 49 L21.5 48.5 L22 52 Q22 61 34 62Z" fill="${g("armor")}" stroke="${shade(p.armor, -0.4)}" stroke-width=".6"/>
    <path d="M30 63.5 Q21 62 20 53" fill="none" stroke="#fff" stroke-width=".7" opacity=".25"/>
    <path d="M12.8 51 Q17.5 53.5 22 51 L21.5 48.3 Q17.5 50.5 13.4 48.6Z" fill="${g("trim")}" stroke="${shade(p.trim, -0.4)}" stroke-width=".4"/>
    <circle cx="17.5" cy="45.5" r="3.4" fill="${g("skin")}" stroke="${dark}" stroke-width=".5"/>`;
}

function castEffect(type, u) {
  const glow = `filter="url(#${u}glow)"`;
  switch (type) {
    case "fel": return `<path d="M17.5 44 Q8 36 13 25 Q15 31 18 28 Q16 20 22 14 Q22 25 25 29 Q27 38 17.5 44Z" fill="#60ff40" opacity=".9" ${glow}/>
      <path d="M17.5 43 Q13 37 16 31 Q18 34 19.5 32 Q20 37 21.5 38 Q21 42 17.5 43Z" fill="#e0ffb0"/>`;
    case "frost": return `<circle cx="17.5" cy="38" r="5.5" fill="#bff4ff" opacity=".85" ${glow}/>
      <path d="M17.5 31 V45 M11 38 H24 M13 33.5 L22 42.5 M22 33.5 L13 42.5" stroke="#fff" stroke-width=".7"/>`;
    case "arcane": return `<circle cx="17.5" cy="38" r="5" fill="#d080ff" ${glow}/>
      <circle cx="17.5" cy="38" r="2.2" fill="#fff" opacity=".8"/>
      <ellipse cx="17.5" cy="38" rx="9" ry="3" fill="none" stroke="#f0c0ff" stroke-width=".6" transform="rotate(-20 17.5 38)"/>`;
    case "lightning": return `<circle cx="17.5" cy="39" r="4" fill="#dff6ff" ${glow}/>
      <path d="M17 36 L12 28 L14 28 L9 20 M19 36 L23 30 L21 30 L26 22 M14 40 L8 42 L9 44 L3 46" stroke="#bfefff" stroke-width=".9" fill="none" ${glow}/>`;
    case "claw": return `<path d="M15 43 L12 35 M17.5 42 L17 33 M20 43 L22.5 35" stroke="#e8e0c0" stroke-width="1.1" stroke-linecap="round"/>`;
    default: return "";
  }
}

// ---------- Characters ----------
// Each returns { behind, body, front }: body gets the rim light, behind/front do not.

function outfit(p, g) {
  const T = p.trim, line = shade(T, -0.35);
  const pauldron = `<path d="M11 66 Q12 55 26 55 Q38 56 39 64 Q30 70 11 66Z" fill="${g("trim")}" stroke="${line}" stroke-width=".7"/>
    <path d="M14 61 Q22 56.5 34 58.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>
    <circle cx="19" cy="62" r=".8" fill="#fff" opacity=".55"/><circle cx="31" cy="60" r=".8" fill="#fff" opacity=".55"/>`;
  switch (p.outfit) {
    case "robe": return `<path d="M33 56 Q50 66 67 56 L69 63 Q50 73 31 63Z" fill="${g("trim")}" stroke="${line}" stroke-width=".6"/>
      <path d="M50 67 L50 80" stroke="${T}" stroke-width="5"/>
      <path d="M50 69 v2 M50 74 v2 M50 78.5 v1.5" stroke="${shade(T, 0.3)}" stroke-width="1.6"/>
      ${pair(`<path d="M15 72 Q24 64 34 64" fill="none" stroke="${T}" stroke-width="1"/>`)}`;
    case "leather": return `<path d="M42 58 L50 68 L58 58Z" fill="${shade(p.armor, -0.25)}"/>
      <path d="M27 60 L62 80 L56 80 L24 62Z" fill="${shade(T, -0.1)}"/>
      <rect x="41" y="68" width="5" height="4" fill="#d0b060" transform="rotate(30 43.5 70)"/>
      ${pair(`<path d="M15 66 Q18 58 30 57 Q36 58 37 63 Q28 67 15 66Z" fill="${g("trim")}" stroke="${line}" stroke-width=".6"/>`)}`;
    case "fur": return `<path d="M42 58 L50 68 L58 58Z" fill="${shade(p.armor, -0.25)}"/>
      ${pair(`<path d="M9 71 L12 63 L15 66 L17 58 L21 63 L24 55 L28 61 L32 54 L35 60 L40 56 L41 64 Q28 70 9 71Z" fill="${g("trim")}" stroke="${line}" stroke-width=".5"/>`)}
      <circle cx="50" cy="61" r="2.4" fill="#e8dcc0" stroke="#6a5a3a" stroke-width=".5"/>`;
    case "rags": return `<path d="M42 58 L50 66 L58 58Z" fill="${shade(p.armor, -0.25)}"/>
      <path d="M20 80 L22 70 L26 74 L28 66 L33 72 L36 64 L40 70 L42 62 M80 80 L78 72 L74 75 L72 67 L67 72" fill="none" stroke="${shade(p.armor, -0.3)}" stroke-width=".8"/>
      <rect x="58" y="66" width="7" height="6" fill="${shade(p.armor, 0.12)}" stroke="${shade(p.armor, -0.3)}" stroke-width=".4" stroke-dasharray="1 .8" transform="rotate(-8 61 69)"/>`;
    default: // plate
      return `<path d="M42 58 L50 68 L58 58Z" fill="${shade(p.armor, -0.25)}"/>
        <path d="M38 63 Q50 58 62 63 L60 80 L40 80Z" fill="${g("armor")}" stroke="${shade(p.armor, -0.4)}" stroke-width=".5"/>
        <path d="M40 64.5 Q50 60.5 60 64.5" stroke="#fff" stroke-width=".7" fill="none" opacity=".4"/>
        <circle cx="50" cy="72" r="3" fill="${g("trim")}" stroke="${line}" stroke-width=".5"/>
        ${pair(pauldron)}`;
  }
}

function humanoid(p, g, u) {
  const skin = p.skin, dark = shade(skin, -0.3);
  const hair = p.hair || "#2a1a10", hairDark = shade(hair, -0.15);
  const glow = `filter="url(#${u}glow)"`;
  const b = [];
  let behind = "", front = "";

  if (p.halo) behind += `<circle cx="50" cy="32" r="24" fill="#fff3a0" opacity=".35" filter="url(#${u}soft)"/>
    <circle cx="50" cy="32" r="21" fill="none" stroke="#ffe680" stroke-width="1.4" opacity=".9" ${glow}/>`;

  if (p.cape) b.push(`<path d="M5 80 Q9 58 30 53 L70 53 Q91 58 95 80Z" fill="${g("cape")}" stroke="${shade(p.cape, -0.35)}" stroke-width=".6"/>`);

  // Weapons sit behind the body, over the shoulder
  if (p.weapon) b.push(weapon(p.weapon, p, g, u));
  if (p.weapon2) b.push(mirror(weapon(p.weapon2, p, g, u)));

  // Body and outfit
  b.push(`<path d="M12 80 Q14 62 32 58 L68 58 Q86 62 88 80Z" fill="${g("armor")}" stroke="${shade(p.armor, -0.35)}" stroke-width=".7"/>`);
  if (p.spikes) b.push(pair(`<path d="M17 59 L12 45 L23 57Z" fill="${g("steel")}" stroke="#444" stroke-width=".5"/>`));
  b.push(outfit(p, g));

  if (p.style === "long") b.push(pair(`<path d="M37 28 Q33 54 27 66 L42 62 Q40 44 43 28Z" fill="${g("hair")}"/>`));

  // Neck, with a shadow under the chin
  b.push(`<path d="M44 44 L44 60 L56 60 L56 44Z" fill="${shade(skin, -0.12)}"/>
    <path d="M44 47 Q50 52 56 47 L56 50 Q50 55 44 50Z" fill="${dark}" opacity=".45"/>`);

  // Ears (drawn after the hood if wearing one, so they poke out)
  const ear = {
    elf:   `<path d="M38 33 L19 19 L37.5 41Z" fill="${g("skin")}" stroke="${dark}" stroke-width=".8"/><path d="M36 34 L24 24 L36 38Z" fill="${dark}" opacity=".3"/>`,
    orc:   `<path d="M37.5 33 L28 26 L37.5 41Z" fill="${g("skin")}" stroke="${dark}" stroke-width=".8"/>`,
    troll: `<path d="M37.5 32 L15 27 L37.5 41Z" fill="${g("skin")}" stroke="${dark}" stroke-width=".8"/><path d="M36 34 L21 29.5 L36 38Z" fill="${dark}" opacity=".3"/>`,
    gnome: `<path d="M38 31 L24 22 Q24 37 38 41Z" fill="${g("skin")}" stroke="${dark}" stroke-width=".8"/>`,
    round: `<ellipse cx="37" cy="36" rx="2.6" ry="4" fill="${g("skin")}" stroke="${dark}" stroke-width=".8"/>`,
    rat:   `<circle cx="38" cy="22" r="6.5" fill="${g("skin")}" stroke="${dark}" stroke-width=".8"/><circle cx="38" cy="22" r="3.8" fill="#d89090"/>`,
    bull:  `<ellipse cx="33" cy="32" rx="6" ry="2.8" fill="${g("skin")}" stroke="${dark}" stroke-width=".8" transform="rotate(-20 33 32)"/>`,
  }[p.ears];
  if (ear && p.head !== "hood") b.push(pair(ear));

  // Head, with a heavier jaw for orcs
  b.push(`<ellipse cx="50" cy="35" rx="13.5" ry="15" fill="${g("skinR")}" stroke="${dark}" stroke-width=".8"/>`);
  if (p.jaw) b.push(`<path d="M36.6 38 Q36 49.5 50 51 Q64 49.5 63.4 38 Q58 46 50 46.5 Q42 46 36.6 38Z" fill="${shade(skin, -0.06)}" stroke="${dark}" stroke-width=".6"/>`);

  // Face shading: cheeks, eye sockets, forehead highlight
  b.push(pair(`<ellipse cx="41" cy="41" rx="3.2" ry="2.2" fill="${dark}" opacity=".18"/>`));
  b.push(pair(`<ellipse cx="44.5" cy="33.8" rx="3.8" ry="2.3" fill="${dark}" opacity=".35"/>`));
  b.push(`<ellipse cx="46" cy="26.5" rx="4.5" ry="2.4" fill="#fff" opacity=".13"/>`);

  // Eyes and brows
  b.push(p.glow
    ? pair(`<ellipse cx="44.5" cy="34" rx="2.8" ry="1.3" fill="${p.glow}" ${glow}/>`)
    : pair(`<ellipse cx="44.5" cy="34" rx="2.4" ry="1.6" fill="#f4f0e8"/><circle cx="44.8" cy="34" r="1.15" fill="${p.eye || "#2a1a10"}"/>
            <circle cx="44.3" cy="33.6" r=".35" fill="#fff"/><path d="M42 33 Q44.5 31.8 47 33" stroke="${dark}" stroke-width=".5" fill="none"/>`));
  b.push(pair(`<path d="M40.5 30.2 L47.8 32.2 L47.4 33.1 L40.8 31.5Z" fill="${p.style === "bald" && !p.beard ? dark : hairDark}"/>`));

  // Nose / snout
  if (p.snout === "rat") b.push(`<ellipse cx="50" cy="42" rx="7" ry="5.5" fill="${shade(skin, 0.12)}"/>
    <ellipse cx="50" cy="39.5" rx="2.4" ry="1.6" fill="#2a1a1a"/><path d="M47 44 Q50 46 53 44" stroke="${dark}" stroke-width=".6" fill="none"/>`);
  else if (p.snout === "bull") b.push(`<ellipse cx="50" cy="43" rx="9" ry="6.5" fill="${shade(skin, 0.15)}" stroke="${dark}" stroke-width=".5"/>
    ${pair(`<ellipse cx="46.5" cy="42" rx="1.3" ry="1.9" fill="#2a1a10"/>`)}
    <path d="M47 45.5 A3 3 0 0 0 53 45.5" fill="none" stroke="#f0c040" stroke-width="1.2"/>`);
  else b.push(`<path d="M50 35 L48.3 40.5 Q50 41.8 51.7 40.5" fill="none" stroke="${dark}" stroke-width=".8"/>
    <path d="M50.6 35.5 L51.4 39.6" stroke="#fff" stroke-width=".5" opacity=".25"/>`);

  // Mouth
  if (p.mouth === "grin") b.push(`<path d="M45 44 Q50 49 55 44 Q50 46 45 44Z" fill="#3a1010"/>
    <path d="M45.8 44.6 Q50 46.4 54.2 44.6" stroke="#fff" stroke-width=".8" fill="none"/>`);
  else if (p.mouth === "teeth") b.push(`<path d="M44 44 L56 44 L55 48.5 L45 48.5Z" fill="#2a1010"/>
    <path d="M44.5 44 L46 46.5 L47.5 44 L49 46.5 L50.5 44 L52 46.5 L53.5 44 L55 46.5 L55.5 44Z" fill="#e0e0c0"/>`);
  else if (!p.snout) b.push(`<path d="M46.5 45 Q50 46.2 53.5 45" fill="none" stroke="${dark}" stroke-width=".9"/>
    <path d="M47.5 46.6 Q50 47.4 52.5 46.6" fill="none" stroke="${dark}" stroke-width=".4" opacity=".5"/>`);

  // Face markings
  if (p.mark === "elf") b.push(pair(`<path d="M41.5 37 Q42.5 41 40.5 45" stroke="#3ad0a0" stroke-width="1" fill="none"/>`));
  if (p.mark === "scar") b.push(`<path d="M54 27 L58.5 40" stroke="${shade(skin, -0.4)}" stroke-width=".9"/>`);
  if (p.mark === "paint") b.push(pair(`<path d="M39 37 L46 38 M39.5 40 L45.5 40.5" stroke="#f0f0f0" stroke-width="1" opacity=".8"/>`));
  if (p.mark === "stitch") b.push(`<path d="M42 25 L46 41 M41 29 L44.5 28.2 M42 33 L45.5 32.2 M43 37 L46.5 36.2" stroke="#2a2a1a" stroke-width=".6" fill="none"/>`);

  // Tusks
  if (p.tusks === "small") b.push(pair(`<path d="M45.5 46 L44.2 40.5 L47.4 45.2Z" fill="#f0e8d0" stroke="#a09070" stroke-width=".4"/>`));
  if (p.tusks === "big") b.push(pair(`<path d="M45 46 Q37.5 42 40 31.5 Q41.5 40 47.5 45Z" fill="#f0e8d0" stroke="#a09070" stroke-width=".5"/>`));

  // Beard
  if (p.beard === "big") b.push(`<path d="M36 38 Q35 63 50 67 Q65 63 64 38 Q60 47.5 50 47.5 Q40 47.5 36 38Z" fill="${g("hair")}" stroke="${hairDark}" stroke-width=".6"/>
    <path d="M42 52 Q44 58 43 63 M50 52 V65 M58 52 Q56 58 57 63" stroke="${hairDark}" stroke-width=".6" fill="none"/>
    ${pair(`<path d="M50 43.5 Q43 41.5 40 47 Q45 45 50 45.5Z" fill="${hairDark}"/>`)}`);
  if (p.beard === "short") b.push(`<path d="M37 40 Q38 55 50 57 Q62 55 63 40 Q59 47.5 50 47.5 Q41 47.5 37 40Z" fill="${g("hair")}"/>`);

  // Hair on top of the head
  const cap = `<path d="M36.5 33 Q36 19 50 19 Q64 19 63.5 33 Q60 25 50 25 Q40 25 36.5 33Z" fill="${g("hair")}"/>
    <path d="M41 22 Q50 19.5 58 22" stroke="#fff" stroke-width=".6" fill="none" opacity=".25"/>`;
  if (["long", "short", "topknot", "pigtails"].includes(p.style)) b.push(cap);
  if (p.style === "topknot") b.push(`<circle cx="50" cy="17" r="4.5" fill="${g("hair")}"/>
    <path d="M51 15 Q62 9 59 1" stroke="${hair}" stroke-width="3" fill="none"/>`);
  if (p.style === "pigtails") b.push(pair(`<ellipse cx="32" cy="25" rx="5" ry="7.5" fill="${g("hair")}" transform="rotate(-35 32 25)"/>`));
  if (p.style === "mohawk") b.push(`<path d="M45 28 L41 13 L46.5 18 L50 3 L53.5 18 L59 13 L55 28Z" fill="${g("hair")}" stroke="${hairDark}" stroke-width=".6"/>`);
  if (p.style === "stringy") b.push(`<path d="M41 23 Q37 34 38.5 46 M45 21 Q43 29 42.5 36 M59 23 Q63 33 61.5 44" stroke="${hair}" stroke-width="1.3" fill="none"/>`);

  // Headgear
  const helmet = `<path d="M35.5 31 Q35 15 50 15 Q65 15 64.5 31Z" fill="${g("metal")}" stroke="#333" stroke-width=".7"/>
    <path d="M39 22 Q44 17 52 17" stroke="#fff" stroke-width=".8" fill="none" opacity=".45"/>
    <rect x="34" y="29" width="32" height="4" rx="1" fill="${shade(p.metal || "#9aa2aa", -0.15)}" stroke="#333" stroke-width=".5"/>`;
  switch (p.head) {
    case "helmet": b.push(helmet + `<rect x="48.5" y="29" width="3" height="10" fill="${shade(p.metal || "#9aa2aa", -0.15)}"/>`); break;
    case "hornhelm": b.push(pair(`<path d="M37 24 Q24 22 19 7 Q28 18 39 19Z" fill="#e8dcc0" stroke="#8a7a5a" stroke-width=".6"/>`) + helmet); break;
    case "candle": b.push(helmet + `<rect x="47.5" y="7" width="5" height="9" fill="#f0e8c0"/>
      <path d="M50 0 Q54 4.5 50 7 Q46 4.5 50 0Z" fill="#ffcc40" ${glow}/>`); break;
    case "crown": b.push(`<path d="M35 28 L33 9 L40 19 L44 3 L50 16 L56 3 L60 19 L67 9 L65 28Z" fill="${g("metal")}" stroke="#101820" stroke-width=".8"/>
      <circle cx="50" cy="23.5" r="2.2" fill="${p.glow}" ${glow}/>`); break;
    case "circlet": b.push(`<path d="M36.6 28 Q50 22 63.4 28" stroke="#e0b040" stroke-width="1.6" fill="none"/>
      <path d="M50 21.5 L52 24.5 L50 27.5 L48 24.5Z" fill="#40c0ff" ${glow}/>`); break;
    case "goggles": b.push(`<path d="M36.5 27 Q50 23 63.5 27" stroke="#5a3a20" stroke-width="2.5" fill="none"/>
      ${pair(`<circle cx="44" cy="24.5" r="4.5" fill="#9adfff" stroke="#c09030" stroke-width="1.5"/><circle cx="42.6" cy="23.2" r="1.2" fill="#fff" opacity=".8"/>`)}`); break;
    case "horns": b.push(pair(`<path d="M38 27 Q21 26 15 11 Q26 20 40 22Z" fill="#efe4cc" stroke="#8a7a5a" stroke-width=".6"/>
      <path d="M33 24 L31 22.5 M27 21 L25.5 19" stroke="#8a7a5a" stroke-width=".6"/>`)); break;
    case "hood":
      b.push(`<path d="M26 72 Q24 30 50 11 Q76 30 74 72 L64 66 Q66 38 50 25 Q34 38 36 66Z" fill="${g("hood")}" stroke="${shade(p.hood, -0.3)}"/>
        <path d="M36.5 41 Q36 25 50 25 Q64 25 63.5 41 Q58 31 50 31 Q42 31 36.5 41Z" fill="#000" opacity=".5"/>`);
      if (ear) b.push(pair(ear));
      break;
  }

  // Hands gripping the weapons, and a raised spell hand
  if (p.weapon && GRIPS[p.weapon]) b.push(hand(GRIPS[p.weapon], g, dark));
  if (p.weapon2 && GRIPS[p.weapon2]) b.push(mirror(hand(GRIPS[p.weapon2], g, dark)));
  if (p.cast) {
    b.push(castArm(p, g, dark));
    front += castEffect(p.cast, u);
  }

  return { behind, body: b.join(""), front };
}

// A crouching swamp frog-beast with a gaping mouth full of needle teeth
function frog(p, g, u) {
  const skin = p.skin, dark = shade(skin, -0.25), darker = shade(skin, -0.4), belly = p.belly || "#b8b07a";
  const glow = `filter="url(#${u}glow)"`;
  const r = seededRandom("frog" + skin);

  // Points along the upper lip (14,40)-(50,34)-(86,40) and lower jaw (14,40)-(50,82)-(86,40)
  const onCurve = (t, cy) => [(1 - t) ** 2 * 14 + 2 * t * (1 - t) * 50 + t * t * 86, (1 - t) ** 2 * 40 + 2 * t * (1 - t) * cy + t * t * 40];

  let teeth = "", drool = "";
  for (let i = 1; i < 16; i++) {
    const t = i / 16, [x, y] = onCurve(t, 34), len = 3 + r() * 4 + Math.sin(t * Math.PI) * 2, lean = r() * 1.6 - 0.8;
    teeth += `<path d="M${x - 1.3} ${y - .5} L${x + lean} ${y + len} L${x + 1.3} ${y - .5}Z" fill="#efe6c8" stroke="#5a4a30" stroke-width=".3"/>`;
    if (i % 5 === 2) drool += `<path d="M${x + lean} ${y + len} Q${x + lean - .5} ${y + len + 6} ${x + lean + .3} ${y + len + 9 + r() * 4}" stroke="#c8ff90" stroke-width=".7" fill="none" opacity=".55"/>
      <circle cx="${x + lean + .3}" cy="${y + len + 10 + r() * 4}" r=".9" fill="#c8ff90" opacity=".6"/>`;
  }
  for (let i = 2; i < 15; i++) {
    const t = i / 16, [x, y] = onCurve(t, 82), len = 2.5 + r() * 3.5;
    teeth += `<path d="M${x - 1.2} ${y + .5} L${x + r() * 1.4 - .7} ${y - len} L${x + 1.2} ${y + .5}Z" fill="#e4d8b4" stroke="#5a4a30" stroke-width=".3"/>`;
  }

  // Warts and dark blotches scattered over the head and body
  let warts = "";
  for (let i = 0; i < 26; i++) {
    const onHead = i < 14, x = onHead ? 20 + r() * 60 : 12 + r() * 76, y = onHead ? 18 + r() * 16 : 52 + r() * 24;
    warts += `<circle cx="${x}" cy="${y}" r="${0.5 + r() * 1.1}" fill="${shade(skin, 0.1)}" stroke="${darker}" stroke-width=".25"/>`;
    if (i % 3 === 0) warts += `<ellipse cx="${x + 3}" cy="${y + 1}" rx="${2 + r() * 2.5}" ry="${1.2 + r() * 1.5}" fill="${darker}" opacity=".45"/>`;
  }

  return { body: `
    ${pair(`<ellipse cx="22" cy="68" rx="15" ry="10" fill="${g("skin")}" stroke="${darker}" stroke-width=".6"/>`)}
    <path d="M8 82 Q10 54 30 48 Q50 43 70 48 Q90 54 92 82Z" fill="${g("skin")}" stroke="${darker}" stroke-width=".7"/>
    <ellipse cx="50" cy="78" rx="24" ry="10" fill="${belly}" opacity=".9"/>
    <path d="M34 74 Q50 70 66 74 M36 78 Q50 74 64 78" stroke="${shade(belly, -0.25)}" stroke-width=".5" fill="none"/>
    ${pair(`<path d="M24 74 Q21 64 30 58 L36 61 Q31 67 33 75Z" fill="${g("skin")}" stroke="${darker}" stroke-width=".5"/>
      <path d="M24 75 L16 81 M27.5 76 L23 83 M31 76 L31 83" stroke="#2a2418" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M24 75 L16 81 M27.5 76 L23 83 M31 76 L31 83" stroke="#e8dcc0" stroke-width="1" stroke-linecap="round"/>`)}
    ${warts}
    <path d="M12 40 Q22 62 50 66 Q78 62 88 40 Q86 64 50 70 Q14 64 12 40Z" fill="${g("skin")}" stroke="${darker}" stroke-width=".6"/>
    <path d="M14 40 Q50 34 86 40 Q50 82 14 40Z" fill="#1a0406" stroke="${darker}" stroke-width=".6"/>
    <path d="M24 44 Q50 40 76 44 Q50 70 24 44Z" fill="#3a0a10"/>
    <path d="M38 56 Q50 46 62 56 Q56 60 50 59 Q44 60 38 56Z" fill="#8a2030"/>
    <path d="M50 51 V58" stroke="#5a1020" stroke-width=".6"/>
    ${teeth}${drool}
    <path d="M12 42 Q12 20 32 15 Q50 11 68 15 Q88 20 88 42 Q50 32 12 42Z" fill="${g("skinR")}" stroke="${darker}" stroke-width=".7"/>
    <path d="M24 22 Q40 15 58 17" stroke="#fff" stroke-width=".8" fill="none" opacity=".2"/>
    ${pair(`<path d="M45 25 Q46.5 24 47.5 26" stroke="${darker}" stroke-width=".9" fill="none"/>`)}
    ${pair(`<circle cx="33" cy="19" r="8" fill="${g("skin")}" stroke="${darker}" stroke-width=".6"/>
      <circle cx="33" cy="19.5" r="5.6" fill="#ffb020" ${glow}/>
      <circle cx="33" cy="19.5" r="5.6" fill="none" stroke="#7a3a00" stroke-width=".6"/>
      <ellipse cx="33.3" cy="19.5" rx="1.1" ry="4.6" fill="#0a0604"/>
      <circle cx="31.3" cy="17.6" r="1.1" fill="#fff" opacity=".85"/>
      <path d="M24 16 Q31 8.5 43 15 L42 18 Q32 12.5 25 18.5Z" fill="${dark}" stroke="${darker}" stroke-width=".5"/>
      <path d="M27 12.5 L25.5 9 L29.5 11 M33 10.5 L33 6.5 L35.5 10.5 M38.5 11.5 L40.5 8 L41 12.5" fill="${darker}" stroke="${darker}" stroke-width=".6"/>`)}` };
}

function wolf(p, g, u) {
  const fur = p.skin, dark = shade(fur, -0.3);
  return { body: `<path d="M10 80 Q14 58 30 52 L36 46 L40 54 L46 48 L50 56 L54 48 L60 54 L64 46 L70 52 Q86 58 90 80Z" fill="${g("skin")}" stroke="${dark}" stroke-width=".7"/>
    <path d="M24 70 L28 62 L30 68 M70 68 L72 62 L76 70" stroke="${dark}" stroke-width=".6" fill="none"/>
    ${pair(`<path d="M35 28 L31 5 L46 20Z" fill="${g("skin")}" stroke="${dark}" stroke-width=".7"/><path d="M36.5 24 L33.5 11 L43 20Z" fill="#1a1010" opacity=".5"/>`)}
    ${pair(`<path d="M35 32 L27 42 L35 42 L31 49 L41 46Z" fill="${fur}"/>`)}
    <path d="M34 30 Q34 16 50 16 Q66 16 66 30 Q68 44 60 48 L40 48 Q32 44 34 30Z" fill="${g("skinR")}" stroke="${dark}" stroke-width=".7"/>
    <path d="M44 18 L46 24 M50 17 V23 M56 18 L54 24" stroke="${dark}" stroke-width=".6"/>
    <path d="M41 36 Q42 58 50 60 Q58 58 59 36 Q50 32 41 36Z" fill="${shade(fur, 0.15)}"/>
    <path d="M44 40 Q46 36 50 37" stroke="#fff" stroke-width=".6" fill="none" opacity=".3"/>
    <ellipse cx="50" cy="55" rx="4" ry="2.6" fill="#151010"/><ellipse cx="49" cy="54.2" rx="1.2" ry=".6" fill="#fff" opacity=".4"/>
    <path d="M50 57.5 L50 60 M45 59 Q50 62 55 59" stroke="#151010" fill="none" stroke-width=".8"/>
    ${pair(`<path d="M46.5 59.6 L47.5 63 L48.6 59.9Z" fill="#fff"/>`)}
    ${pair(`<path d="M38.5 29.5 L46.5 33 L40 34.5Z" fill="${p.glow}" filter="url(#${u}glow)"/>`)}
    ${pair(`<path d="M37 27.5 L47 31" stroke="${dark}" stroke-width="1"/>`)}` };
}

function dragon(p, g, u) {
  const dark = shade(p.skin, -0.25), glow = `filter="url(#${u}glow)"`;
  const cracks = p.cracks
    ? `<path d="M44 22 L47 30 L45 38 M57 21 L54 28 L58 36 M49 46 L51 52 L48 58" stroke="${p.glow}" stroke-width=".9" fill="none" ${glow}/>`
    : "";
  return {
    behind: pair(`<path d="M44 56 L3 6 L10 26 L0 30 L12 40 L4 50 L34 64Z" fill="${g("wing")}" stroke="${shade(p.wing, -0.3)}" stroke-width=".7"/>
        <path d="M44 56 L3 6 M44 56 L10 26 M44 56 L12 40 M44 56 L4 50" stroke="${shade(p.wing, -0.35)}" stroke-width=".8"/>`),
    body: `<path d="M33 80 Q38 60 42 50 L58 50 Q62 60 67 80Z" fill="${g("skin")}" stroke="${dark}"/>
      <path d="M44 80 Q45 62 47 52 L53 52 Q55 62 56 80Z" fill="${shade(p.skin, 0.15)}"/>
      <path d="M45.5 60 Q50 58 54.5 60 M45 67 Q50 65 55 67 M44.5 74 Q50 72 55.5 74" stroke="${dark}" stroke-width=".6" fill="none"/>
      ${pair(`<path d="M38 24 Q27 14 23 1 Q33 11 43 19Z" fill="${g("horn")}" stroke="${shade(p.horn, -0.4)}" stroke-width=".6"/>`)}
      ${pair(`<path d="M37 44 L28 47 L37.5 49Z M38 38 L31 38 L38 41Z" fill="${g("horn")}"/>`)}
      <path d="M36 20 Q50 12 64 20 Q66 32 62 44 Q58 60 50 62 Q42 60 38 44 Q34 32 36 20Z" fill="${g("skinR")}" stroke="${dark}"/>
      <path d="M45 48 Q50 46 55 48 L54 60 Q50 62 46 60Z" fill="${shade(p.skin, 0.08)}"/>
      <path d="M42 18 Q50 15 58 18" stroke="#fff" stroke-width=".7" fill="none" opacity=".25"/>
      ${cracks}
      ${pair(`<path d="M37 28 L47.5 31 L46.5 33 L38 31Z" fill="${dark}"/>`)}
      ${pair(`<path d="M39 32 L47 34 L41 36.5Z" fill="${p.glow}" ${glow}/>`)}
      ${pair(`<ellipse cx="46.5" cy="56" rx="1.2" ry="1.8" fill="#111"/>`)}
      ${pair(`<path d="M43.5 58.5 L44.5 61.5 L45.5 59Z" fill="#fff"/>`)}`,
  };
}

// ---------- Putting it together ----------

const BUILDS = {
  small:  "translate(50 80) scale(.86) translate(-50 -80)",
  broad:  "translate(50 80) scale(1.1 1.04) translate(-50 -80)",
  slim:   "translate(50 80) scale(.94 1) translate(-50 -80)",
  stocky: "translate(50 80) scale(1.08 .92) translate(-50 -80)",
};

function portrait(p) {
  const u = `pt${++portraitCount}-`;
  const r = seededRandom(JSON.stringify(p));
  const scene = (SCENES[p.scene] || SCENES.forest)(u, r);
  const g = key => `url(#${u}${key})`;
  const ch = ({ frog, wolf, dragon }[p.kind] || humanoid)(p, g, u);
  const build = BUILDS[p.build] || "";

  return `<svg viewBox="0 0 100 80" preserveAspectRatio="xMidYMax meet">
    <defs>
      ${paintDefs(u, p, scene.light, scene.lx)}
      <g id="${u}char" transform="${build}">${ch.body}</g>
    </defs>
    <g filter="url(#${u}paint)">
      ${scene.svg}
      <circle cx="${scene.lx}" cy="${scene.ly}" r="26" fill="${scene.light}" opacity=".3" filter="url(#${u}soft)"/>
      <g transform="${build}">${ch.behind || ""}</g>
      <use href="#${u}char" filter="url(#${u}rim)"/>
      <use href="#${u}char"/>
      <g transform="${build}">${ch.front || ""}</g>
    </g>
    ${particles(scene.fx, r, u, scene.light)}
    <rect x="-10" y="0" width="120" height="80" fill="url(#${u}vig)"/>
    <rect x="-10" y="0" width="120" height="80" filter="url(#${u}grain)" opacity=".18"/>
  </svg>`;
}
