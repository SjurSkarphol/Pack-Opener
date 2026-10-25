// Card data: rarities, the card list, and the traits used to draw each portrait.

// Rarities, from most to least common. "weight" controls the drop chance,
// "value" is the gold you get for selling a card of that rarity.
// With these numbers an average pack sells for ~110 gold, slightly more than the 100 it costs.
const RARITIES = [
  { id: "common",    label: "Common",    weight: 50, value: 6,   color: "#b0b0b0", glow: "rgba(176,176,176,0.35)" },
  { id: "uncommon",  label: "Uncommon",  weight: 28, value: 12,  color: "#4cd964", glow: "rgba(76,217,100,0.4)" },
  { id: "rare",      label: "Rare",      weight: 14, value: 30,  color: "#3fa9ff", glow: "rgba(63,169,255,0.45)" },
  { id: "epic",      label: "Epic",      weight: 6,  value: 90,  color: "#b84cff", glow: "rgba(184,76,255,0.5)" },
  { id: "legendary", label: "Legendary", weight: 2,  value: 300, color: "#ffb52e", glow: "rgba(255,181,46,0.6)" },
];

// "bg" is the painted backdrop behind the card art.
const CARDS = {
  common: [
    { name: "Grubtusk Laborer", art: "🪓", type: "Orc Laborer", atk: 1, hp: 2,
      flavor: "\"Dig, haul, dig again.\"", bg: "linear-gradient(160deg, #6b4a2b, #2e1f12)" },
    { name: "Bogfen Gulper", art: "🐸", type: "Swamp Beast", atk: 2, hp: 1,
      flavor: "It swallows the unwary whole.", bg: "linear-gradient(160deg, #2f6b5a, #10302a)" },
    { name: "Stonehold Militia", art: "🛡️", type: "Dwarf Footman", atk: 1, hp: 3,
      flavor: "Short of stature, long of beard.", bg: "linear-gradient(160deg, #5a5f6b, #22252c)" },
    { name: "Gloomwood Prowler", art: "🐺", type: "Beast", atk: 2, hp: 2,
      flavor: "The forest has teeth after dark.", bg: "linear-gradient(160deg, #3b3550, #120f1c)" },
    { name: "Kobold Tunneler", art: "🕯️", type: "Kobold", atk: 1, hp: 1, image: "art/kobold.png",
      flavor: "\"Mine! All mine, the shiny!\"", bg: "linear-gradient(160deg, #7a5a1e, #2a1d08)" },
  ],
  uncommon: [
    { name: "Thornspire Huntress", art: "🏹", type: "Wood Elf Ranger", atk: 3, hp: 2,
      flavor: "The moon guides every arrow.", bg: "linear-gradient(160deg, #3a3f8a, #12143a)" },
    { name: "Bloodmane Berserker", art: "⚔️", type: "Troll Warrior", atk: 4, hp: 2,
      flavor: "\"Two axes. No mercy.\"", bg: "linear-gradient(160deg, #8a2d2d, #2c0c0c)" },
    { name: "Stormhammer Shaman", art: "⚡", type: "Bull-kin Shaman", atk: 2, hp: 4,
      flavor: "The sky answers in thunder.", bg: "linear-gradient(160deg, #2d5f8a, #0c1f30)" },
    { name: "Gnomish Tinkerer", art: "⚙️", type: "Gnome Engineer", atk: 2, hp: 3,
      flavor: "Explosions are a feature.", bg: "linear-gradient(160deg, #8a6b2d, #2d220c)" },
  ],
  rare: [
    { name: "Archmage of Silverreach", art: "🔮", type: "High Elf Mage", atk: 4, hp: 4,
      flavor: "Knowledge is the sharpest blade.", bg: "linear-gradient(160deg, #5a3a9a, #1a0f35)" },
    { name: "Plaguewalker Ghoul", art: "💀", type: "Undead", atk: 5, hp: 3,
      flavor: "It hungers. It always hungers.", bg: "linear-gradient(160deg, #4f6b2d, #141f0a)" },
    { name: "Paladin of the Dawn", art: "🔨", type: "Human Paladin", atk: 3, hp: 6,
      flavor: "\"Dawn breaks, and so shall you!\"", bg: "linear-gradient(160deg, #b08a3a, #3a2a0c)" },
  ],
  epic: [
    { name: "Gravefire Warlock", art: "🔥", type: "Shadow Elf Warlock", atk: 6, hp: 5,
      flavor: "Power has a price. Others pay it.", bg: "linear-gradient(160deg, #3a8a2d, #0a2a08)" },
    { name: "Rimebone Drake", art: "❄️", type: "Undead Dragon", atk: 7, hp: 6,
      flavor: "Its breath freezes the very soul.", bg: "linear-gradient(160deg, #4a8ab0, #0c2335)" },
    { name: "Ironjaw Champion", art: "🐗", type: "Orc Warlord", atk: 6, hp: 7,
      flavor: "\"Every battle ends at my axe.\"", bg: "linear-gradient(160deg, #8a4a1e, #2a1205)" },
  ],
  legendary: [
    { name: "Valgrim, the Bone Regent", art: "👑", type: "Undead Lord", atk: 9, hp: 9, image: "art/valgrim.jfif",
      flavor: "\"My throne is carved from winter.\"", bg: "linear-gradient(160deg, #3a6aa0, #05101f)" },
    { name: "Ashmaw, the Cinder Tyrant", art: "🐉", type: "Black Dragon", atk: 10, hp: 10,
      flavor: "The mountains remember its fury.", bg: "linear-gradient(160deg, #a03a1e, #1a0503)" },
    { name: "Thalwyn, the Verdant Mother", art: "🌙", type: "Green Dragon", atk: 8, hp: 12,
      flavor: "She guards the forest's long sleep.", bg: "linear-gradient(160deg, #2da06a, #052015)" },
  ],
};

// Portrait traits for each card, keyed by card name. Drawn by js/portraits.js.
//   scene  – the painted backdrop (see SCENES in js/portraits.js)
//   build  – body shape: broad, slim, small, stocky
//   outfit – plate, leather, robe, fur, rags
//   cast   – a raised spell hand: fel (green fire), frost, arcane, lightning, claw
const PORTRAITS = {
  "Grubtusk Laborer":       { scene: "barrens", build: "broad", outfit: "leather", jaw: true,
                           skin: "#6a9a3a", ears: "orc", tusks: "small", hair: "#1a1a10", style: "bald",
                           armor: "#7a5a3a", trim: "#5a4020", weapon: "axe", mark: "scar" },
  "Bogfen Gulper":       { kind: "frog", scene: "swamp", skin: "#3e5a2a", belly: "#b8b07a" },
  "Stonehold Militia":   { scene: "forge", build: "stocky", outfit: "plate",
                           skin: "#e8a888", ears: "round", hair: "#a0522d", beard: "big", style: "bald",
                           head: "helmet", armor: "#7a808a", trim: "#a0a8b0", weapon: "hammer" },
  "Gloomwood Prowler":    { kind: "wolf", scene: "forest", skin: "#4a4458", glow: "#ffd040" },
  "Kobold Tunneler":  { scene: "mine", build: "small", outfit: "rags",
                           skin: "#8a6a4a", ears: "rat", snout: "rat", style: "bald", head: "candle",
                           metal: "#8a6a3a", armor: "#5a4a3a", trim: "#7a5a3a", weapon: "axe", eye: "#111" },

  "Thornspire Huntress": { scene: "moonforest", build: "slim", outfit: "leather", cape: "#1e3a2a",
                           skin: "#8a7ac0", hair: "#2a9a9a", style: "long", ears: "elf", glow: "#e8f4ff",
                           armor: "#3a5a3a", trim: "#6a4a2a", weapon: "bow", mark: "elf" },
  "Bloodmane Berserker": { scene: "jungle", build: "slim", outfit: "fur",
                           skin: "#4a8aa0", hair: "#c03030", style: "mohawk", ears: "troll", tusks: "big",
                           mouth: "grin", armor: "#6a3a2a", trim: "#c8b090", weapon: "axe", weapon2: "axe", mark: "paint" },
  "Stormhammer Shaman":  { scene: "storm", build: "broad", outfit: "fur", cast: "lightning",
                           skin: "#8a5a3a", hair: "#2a1a10", style: "long", ears: "bull", snout: "bull",
                           head: "horns", armor: "#5a6a3a", trim: "#a08060", weapon: "totem" },
  "Gnomish Tinkerer":    { scene: "workshop", build: "small", outfit: "leather",
                           skin: "#f0c0a0", hair: "#ff6ab0", style: "pigtails", ears: "gnome", head: "goggles",
                           mouth: "grin", armor: "#4a6a8a", trim: "#c09030", weapon: "wrench" },

  "Archmage of Silverreach": { scene: "arcane", build: "slim", outfit: "robe", cast: "arcane",
                           skin: "#f5d0b0", hair: "#f0e0a0", style: "long", ears: "elf", head: "circlet",
                           eye: "#3a6ad0", armor: "#5a3a9a", trim: "#d0a030", weapon: "staff", orb: "#c080ff" },
  "Plaguewalker Ghoul":  { scene: "graveyard", outfit: "rags", cast: "claw",
                           skin: "#8a9a6a", hair: "#3a3a2a", style: "stringy", glow: "#e0ff40", mouth: "teeth",
                           armor: "#4a3a2a", trim: "#3a2a1a", mark: "stitch" },
  "Paladin of the Dawn": { scene: "cathedral", build: "broad", outfit: "plate", cape: "#2a4a9a", halo: true,
                           skin: "#e8b890", hair: "#6a4a2a", style: "short", beard: "short", ears: "round",
                           armor: "#c0a050", trim: "#f0d070", weapon: "hammer" },

  "Gravefire Warlock":     { scene: "fel", outfit: "robe", cast: "fel",
                           skin: "#f0c8a0", ears: "elf", head: "hood", hood: "#3a1a4a", glow: "#60ff40",
                           style: "bald", armor: "#3a1a3a", trim: "#60c030" },
  "Rimebone Drake":      { kind: "dragon", scene: "frost", skin: "#a8cce0", glow: "#40e0ff", wing: "#5a7a9a", horn: "#e8f4ff" },
  "Ironjaw Champion": { scene: "warcamp", build: "broad", outfit: "plate", cape: "#2a1a14", jaw: true,
                           skin: "#5a8a3a", hair: "#111", style: "topknot", ears: "orc", tusks: "small",
                           head: "hornhelm", metal: "#6a6a70", mouth: "grin", armor: "#7a2a1a", trim: "#8a8a90",
                           spikes: true, weapon: "axe", mark: "scar" },

  "Valgrim, the Bone Regent": { scene: "citadel", build: "broad", outfit: "plate", cape: "#16202e", cast: "frost",
                           skin: "#b0c8d8", glow: "#40e0ff", head: "crown", metal: "#3a4a5a", style: "bald",
                           armor: "#2a3a4a", trim: "#8ab0d0", spikes: true, weapon: "runeblade" },
  "Ashmaw, the Cinder Tyrant": { kind: "dragon", scene: "volcano", skin: "#2a2222", glow: "#ff8020", wing: "#4a1a10",
                           horn: "#5a4a40", cracks: true },
  "Thalwyn, the Verdant Mother": { kind: "dragon", scene: "dream", skin: "#3a9a5a", glow: "#c0ffe0", wing: "#2a6a4a", horn: "#e8e0c0" },
};
