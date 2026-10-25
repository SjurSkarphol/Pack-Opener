// Pack opening: rolling rarities, dealing cards and flipping them.

const CARDS_PER_PACK = 5;
const STARTING_GOLD = 500;
const PACK_COST = 100;

let gold = STARTING_GOLD;
let packsOpened = 0;

const goldEl = document.getElementById("gold");
const packsOpenedEl = document.getElementById("packsOpened");
const openBtn = document.getElementById("openBtn");
const revealBtn = document.getElementById("revealBtn");
const pack = document.getElementById("pack");
const cardsEl = document.getElementById("cards");
const hint = document.getElementById("hint");

function rollRarity() {
  const total = RARITIES.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of RARITIES) {
    if (roll < r.weight) return r;
    roll -= r.weight;
  }
  return RARITIES[0];
}

// Draws 5 cards with no duplicates in the same pack.
function drawPack() {
  const drawn = [];
  const used = new Set();
  while (drawn.length < CARDS_PER_PACK) {
    const rarity = rollRarity();
    const options = CARDS[rarity.id].filter(c => !used.has(c.name));
    if (options.length === 0) continue;
    const card = options[Math.floor(Math.random() * options.length)];
    used.add(card.name);
    drawn.push({ ...card, rarity });
  }
  // Show the rarest cards last for suspense
  return drawn.sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity));
}

function setRarityColors(el, rarity) {
  el.style.setProperty("--rarity-color", rarity.color);
  el.style.setProperty("--rarity-glow", rarity.glow);
}

// A card's art: its image file if it has one, otherwise a drawn portrait, otherwise its emoji
function cardArtHtml(card) {
  if (card.image) return `<img src="${card.image}" alt="${card.name}">`;
  if (PORTRAITS[card.name]) return portrait(PORTRAITS[card.name]);
  return `<span>${card.art}</span>`;
}

function cardFrontHtml(card) {
  return `
    <div class="card-face card-front">
      <div class="card-art" style="background: radial-gradient(circle, var(--rarity-glow), transparent 70%), ${card.bg}">
        ${cardArtHtml(card)}
      </div>
      <div class="card-name">${card.name}</div>
      <div class="card-type">${card.type}</div>
      <div class="card-flavor">${card.flavor}</div>
      <div class="card-rarity">${card.rarity.label}</div>
      <div class="stat atk">${card.atk}</div>
      <div class="stat hp">${card.hp}</div>
      <div class="card-value">🪙 ${card.rarity.value}</div>
    </div>`;
}

function createCardEl(card, index) {
  const el = document.createElement("div");
  el.className = `card ${card.rarity.id}`;
  el.card = card;
  el.style.animationDelay = `${index * 0.12}s`;
  setRarityColors(el, card.rarity);
  el.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-back">⚔️</div>
      ${cardFrontHtml(card)}
    </div>`;
  el.addEventListener("click", () => flip(el));
  return el;
}

function flip(el) {
  if (el.classList.contains("flipped")) return;
  el.classList.add("flipped");
  addToInventory(el.card);
  updateState();
}

// ---------- Inventory ----------
// Every card the player has revealed: card name -> { card, count }
const inventory = new Map();
const TOTAL_UNIQUE = Object.values(CARDS).flat().length;

const invGrid = document.getElementById("invGrid");
const invCount = document.getElementById("invCount");
const invMsg = document.getElementById("invMsg");

function addToInventory(card) {
  const entry = inventory.get(card.name);
  if (entry) entry.count++;
  else inventory.set(card.name, { card, count: 1 });
  renderInventory();
}

// Cards picked for selling: card name -> how many copies are selected
const selection = new Map();

// Every card in the game, rarest first, for showing the full collection
const ALL_CARDS = RARITIES.flatMap(rarity => CARDS[rarity.id].map(card => ({ ...card, rarity })))
  .sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.name.localeCompare(b.name));

// Shows the whole collection: owned cards in colour, cards not found yet greyed out
function renderInventory() {
  const totalCards = [...inventory.values()].reduce((sum, e) => sum + e.count, 0);
  invCount.textContent = `${inventory.size} / ${TOTAL_UNIQUE} unique cards · ${totalCards} total`;
  invGrid.innerHTML = "";

  for (const card of ALL_CARDS) {
    const count = inventory.get(card.name)?.count || 0;
    const picked = selection.get(card.name) || 0;
    const el = document.createElement("div");
    el.className = `inv-card ${card.rarity.id}${count ? "" : " locked"}${picked ? " selected" : ""}`;
    setRarityColors(el, card.rarity);
    el.innerHTML = cardFrontHtml(card)
      + (count > 1 ? `<span class="inv-count-badge">×${count}</span>` : "")
      + (picked ? `<span class="sel-badge">✓${count > 1 ? ` ${picked}/${count}` : ""}</span>` : "")
      + (count ? "" : `<span class="locked-label">Not found yet</span>`);
    el.addEventListener("click", () => openCardModal(card));
    invGrid.appendChild(el);
  }
  renderSellBar();
  updateViewBtn();
}

// Each click selects one more copy; once every copy is selected, the next click deselects the card
function toggleSelect(name) {
  const count = inventory.get(name).count;
  const picked = selection.get(name) || 0;
  if (picked >= count) selection.delete(name);
  else selection.set(name, picked + 1);
  renderInventory();
}

function selectionTotals() {
  let cards = 0, value = 0;
  for (const [name, qty] of selection) {
    cards += qty;
    value += qty * inventory.get(name).card.rarity.value;
  }
  return { cards, value };
}

function renderSellBar() {
  const { cards, value } = selectionTotals();
  sellBar.hidden = cards === 0;
  sellSummary.textContent = `${cards} card${cards === 1 ? "" : "s"} selected · 🪙 ${value}`;
  sellBtn.textContent = `Sell for ${value} gold`;
}

// Sells every selected copy and adds the total to the wallet
function sellSelected() {
  const { cards, value } = selectionTotals();
  if (cards === 0) return;

  for (const [name, qty] of selection) {
    const entry = inventory.get(name);
    entry.count -= qty;
    if (entry.count <= 0) inventory.delete(name);
  }
  selection.clear();
  gold += value;

  invMsg.textContent = `Sold ${cards} card${cards === 1 ? "" : "s"} for ${value} gold.`;
  goldEl.parentElement.classList.remove("bump");
  void goldEl.offsetWidth; // restart the animation
  goldEl.parentElement.classList.add("bump");

  renderInventory();
  updateState();
}

// Selects every extra copy, keeping one of each card
function selectDuplicates() {
  selection.clear();
  for (const [name, { count }] of inventory) {
    if (count > 1) selection.set(name, count - 1);
  }
  invMsg.textContent = selection.size ? "" : "You have no duplicates.";
  renderInventory();
}

// Selects every copy of every card
function selectAll() {
  selection.clear();
  for (const [name, { count }] of inventory) selection.set(name, count);
  invMsg.textContent = selection.size ? "" : "Your inventory is empty.";
  renderInventory();
}

const sellBar = document.getElementById("sellBar");
const sellSummary = document.getElementById("sellSummary");
const sellBtn = document.getElementById("sellBtn");
sellBtn.addEventListener("click", sellSelected);
document.getElementById("clearSelBtn").addEventListener("click", () => { selection.clear(); renderInventory(); });
document.getElementById("dupesBtn").addEventListener("click", selectDuplicates);
document.getElementById("selectAllBtn").addEventListener("click", selectAll);

function updateState() {
  const remaining = cardsEl.querySelectorAll(".card:not(.flipped)").length;
  const canAfford = gold >= PACK_COST;

  goldEl.textContent = gold;
  packsOpenedEl.textContent = `${packsOpened} pack${packsOpened === 1 ? "" : "s"}`;
  openBtn.textContent = `${packsOpened > 0 ? "Open Another Pack" : "Open Pack"} (${PACK_COST} 🪙)`;
  revealBtn.hidden = remaining === 0;
  openBtn.disabled = remaining > 0 || !canAfford;

  if (remaining > 0) hint.textContent = "Click a card to flip it";
  else if (!canAfford) hint.textContent = `Not enough gold — a pack costs ${PACK_COST} gold.`;
  else hint.textContent = "";
}

openBtn.addEventListener("click", () => {
  if (gold < PACK_COST) return;
  gold -= PACK_COST;
  packsOpened++;
  goldEl.textContent = gold;
  packsOpenedEl.textContent = `${packsOpened} pack${packsOpened === 1 ? "" : "s"}`;
  openBtn.disabled = true;
  cardsEl.innerHTML = "";
  hint.textContent = "";
  pack.hidden = false;
  pack.className = "pack shake";

  pack.addEventListener("animationend", function onShake() {
    pack.removeEventListener("animationend", onShake);
    pack.className = "pack burst";

    pack.addEventListener("animationend", function onBurst() {
      pack.removeEventListener("animationend", onBurst);
      pack.hidden = true;
      drawPack().forEach((card, i) => cardsEl.appendChild(createCardEl(card, i)));
      updateState();
    });
  });
});

revealBtn.addEventListener("click", () => {
  cardsEl.querySelectorAll(".card:not(.flipped)").forEach((el, i) => {
    setTimeout(() => flip(el), i * 200);
  });
});

// ---------- Switching between the pack view and the inventory ----------
const packView = document.getElementById("packView");
const inventoryView = document.getElementById("inventoryView");
const viewBtn = document.getElementById("viewBtn");

function updateViewBtn() {
  viewBtn.textContent = inventoryView.hidden ? `🎒 Inventory (${inventory.size})` : "⚔️ Back to Packs";
}

viewBtn.addEventListener("click", () => {
  const showInventory = inventoryView.hidden;
  inventoryView.hidden = !showInventory;
  packView.hidden = showInventory;
  updateViewBtn();
  window.scrollTo(0, 0);
});

updateState();
renderInventory();

// ---------- Enlarged card view ----------
const cardModal = document.getElementById("cardModal");
const modalCard = document.getElementById("modalCard");
const modalInfo = document.getElementById("modalInfo");
const modalSelect = document.getElementById("modalSelect");
let modalCardName = null;

function openCardModal(card) {
  const count = inventory.get(card.name)?.count || 0;
  modalCardName = card.name;
  modalCard.className = `big-card ${card.rarity.id}${count ? "" : " locked"}`;
  setRarityColors(modalCard, card.rarity);
  modalCard.innerHTML = cardFrontHtml(card);
  modalInfo.textContent = count
    ? `You own ${count} · sells for ${card.rarity.value} gold each`
    : "Not found yet — keep opening packs!";
  updateModalSelect();
  cardModal.hidden = false;
}

// The select button cycles: select one copy, then more copies, then deselect
function updateModalSelect() {
  const count = inventory.get(modalCardName)?.count || 0;
  const picked = selection.get(modalCardName) || 0;
  modalSelect.hidden = count === 0;
  if (picked === 0) modalSelect.textContent = "Select to sell";
  else if (picked < count) modalSelect.textContent = `Select another copy (${picked}/${count} selected)`;
  else modalSelect.textContent = count > 1 ? `Deselect all (${picked}/${count} selected)` : "Deselect";
}

modalSelect.addEventListener("click", () => {
  toggleSelect(modalCardName);
  updateModalSelect();
});

function closeCardModal() {
  cardModal.hidden = true;
  modalCard.innerHTML = "";
}

// Close by clicking the dimmed background, the Close button, or pressing Escape
cardModal.addEventListener("click", e => { if (e.target === cardModal) closeCardModal(); });
document.getElementById("modalClose").addEventListener("click", closeCardModal);
document.addEventListener("keydown", e => { if (e.key === "Escape" && !cardModal.hidden) closeCardModal(); });
