// ================================================
// ZK PRO — script.js v2
// Fix modal + système modèle/goûts
// ================================================

const SUPABASE_URL = "https://hyigrnuoojusixzahjvq.supabase.co";
const SUPABASE_KEY = "sb_publishable_zvgnghWMy0byVdyrIxSafA_i52Nn2f9";
const SB_HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

// ── TELEGRAM ──────────────────────────────────────
const tg = window.Telegram?.WebApp || {
  ready:()=>{}, expand:()=>{}, enableClosingConfirmation:()=>{},
  HapticFeedback:{impactOccurred:()=>{}},
  sendData:(d)=>{ console.log("sendData:", d); },
  initDataUnsafe:{ user:{ username:"demo_user" } }
};
tg.ready();
tg.expand();
tg.enableClosingConfirmation();

// ── STATE ─────────────────────────────────────────
let products = [];
let cart = [];
let currentTab = "produits";
let currentFilter = "tous";

// ── SUPABASE FETCH ────────────────────────────────
async function sbGet(table, params = "") {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, { headers: SB_HEADERS });
  if (!r.ok) throw new Error(`Erreur Supabase: ${r.status}`);
  return r.json();
}

async function sbPost(table, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Prefer": "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Erreur Supabase: ${r.status}`);
}

// ── INIT ──────────────────────────────────────────
async function init() {
  try {
    const data = await sbGet("products", "?order=id.asc");
    products = data.map(p => ({
      ...p,
      price: parseFloat(p.price),
      gouts: Array.isArray(p.gouts) ? p.gouts : (p.gouts ? JSON.parse(p.gouts) : []),
    }));
  } catch(e) {
    console.warn("Supabase indispo, données de secours:", e);
    products = FALLBACK_PRODUCTS;
  }

  renderProducts();
  updateCartBadge();
}

// ── NAVIGATION ────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".page").forEach(p => {
    p.classList.toggle("active", p.id === `page-${tab}`);
  });
  if (tab === "panier") renderCart();
}

// ── FILTRES ───────────────────────────────────────
function filterProducts(cat) {
  currentFilter = cat;
  document.querySelectorAll(".filter-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.cat === cat);
  });
  renderProducts();
}

// ── RENDU PRODUITS ────────────────────────────────
function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const filtered = currentFilter === "tous"
    ? products
    : products.filter(p => p.cat === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#4a5568;font-size:14px">Aucun produit disponible</div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => `
    <div class="product-card" style="animation-delay:${i * 0.05}s" onclick="openModal(${p.id})">
      <div class="product-emoji">${p.emoji || "💨"}</div>
      <div class="product-info">
        <div class="product-cat">
          ${p.cat}
          ${p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge}</span>` : ""}
        </div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">
          ${p.price.toFixed(2).replace(".", ",")} €
          <span class="product-unit">${p.unit}</span>
        </div>
        <div class="product-min">
          Min. ${p.min_qty} unités
          ${p.gouts && p.gouts.length > 0 ? `· <span style="color:#00e5ff">${p.gouts.length} goûts</span>` : ""}
          ${p.stock < 50 && p.stock > 0 ? `· <span style="color:#ff9f43">Stock faible</span>` : ""}
          ${p.stock === 0 ? `· <span style="color:#ff4757">Épuisé</span>` : ""}
        </div>
      </div>
    </div>
  `).join("");
}

// ── MODAL ─────────────────────────────────────────
function openModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const overlay = document.getElementById("modalOverlay");
  const modal   = document.getElementById("modal");
  if (!overlay || !modal) return;

  const hasGouts = p.gouts && p.gouts.length > 0;

  modal.innerHTML = `
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div class="modal-emoji">${p.emoji || "💨"}</div>
    <div class="modal-cat">
      ${p.cat}
      ${p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge}</span>` : ""}
    </div>
    <div class="modal-name">${p.name}</div>
    <div class="modal-price">
      ${p.price.toFixed(2).replace(".", ",")} €
      <span class="modal-unit">${p.unit}</span>
    </div>
    <div class="modal-min">Commande minimum : <strong>${p.min_qty} unités</strong></div>

    ${hasGouts ? `
    <div class="modal-field">
      <label class="modal-label">Choisir le goût</label>
      <select id="modalGout" class="modal-select">
        <option value="">— Sélectionner un goût —</option>
        ${p.gouts.map(g => `<option value="${g}">${g}</option>`).join("")}
      </select>
    </div>
    ` : ""}

    <div class="modal-field">
      <label class="modal-label">Quantité</label>
      <div class="modal-qty-row">
        <button class="qty-btn" onclick="changeModalQty(${p.min_qty}, -1)">−</button>
        <input id="modalQty" type="number"
          value="${p.min_qty}" min="${p.min_qty}" step="${p.min_qty}"
          class="qty-input" onchange="clampQty(${p.min_qty})" />
        <button class="qty-btn" onclick="changeModalQty(${p.min_qty}, 1)">+</button>
      </div>
    </div>

    ${p.stock > 0 && p.stock < 100 ? `<div class="modal-stock-warn">⚠️ Stock : ${p.stock} unités restantes</div>` : ""}
    ${p.stock === 0 ? `<div class="modal-stock-warn" style="color:#ff4757">❌ Produit épuisé</div>` : ""}

    <button class="modal-add-btn" onclick="addToCartFromModal(${p.id})" ${p.stock === 0 ? "disabled" : ""}>
      ${p.stock === 0 ? "Épuisé" : "Ajouter au panier"}
    </button>
  `;

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalOverlay")?.classList.remove("active");
  document.body.style.overflow = "";
}

function changeModalQty(step, dir) {
  const input = document.getElementById("modalQty");
  if (!input) return;
  const val = parseInt(input.value) + dir * step;
  input.value = Math.max(step, val);
}

function clampQty(min) {
  const input = document.getElementById("modalQty");
  if (!input) return;
  if (parseInt(input.value) < min) input.value = min;
}

function addToCartFromModal(id) {
  const p = products.find(x => x.id === id);
  if (!p || p.stock === 0) return;

  const hasGouts = p.gouts && p.gouts.length > 0;
  const goutEl = document.getElementById("modalGout");
  const gout = goutEl ? goutEl.value : null;

  if (hasGouts && !gout) {
    goutEl.style.border = "1.5px solid #ff4757";
    goutEl.focus();
    showToast("⚠️ Veuillez choisir un goût");
    return;
  }

  const qty = parseInt(document.getElementById("modalQty")?.value || p.min_qty);
  addToCart(id, qty, gout);
  closeModal();
}

// ── PANIER ────────────────────────────────────────
function addToCart(id, qty, gout = null) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  // Clé unique = produit + goût
  const key = `${id}__${gout || "none"}`;
  const existing = cart.find(x => x.key === key);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ key, id, name: p.name, emoji: p.emoji, price: p.price, qty, gout });
  }

  tg.HapticFeedback.impactOccurred("light");
  updateCartBadge();
  showToast(`✅ ${p.name}${gout ? ` (${gout})` : ""} ajouté`);
}

function removeFromCart(key) {
  cart = cart.filter(x => x.key !== key);
  updateCartBadge();
  renderCart();
}

function changeQty(key, delta) {
  const item = cart.find(x => x.key === key);
  if (!item) return;
  const p = products.find(x => x.id === item.id);
  const step = p?.min_qty || 1;
  item.qty = Math.max(step, item.qty + delta);
  renderCart();
  updateCartBadge();
}

function updateCartBadge() {
  const count = cart.reduce((s, x) => s + x.qty, 0);
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = count;
}

function getTotal()    { return cart.reduce((s, x) => s + x.price * x.qty, 0); }
function getLivraison(){ return getTotal() >= 200 ? 0 : 9.90; }

function renderCart() {
  const content = document.getElementById("cartContent");
  if (!content) return;

  if (cart.length === 0) {
    content.innerHTML = `<div class="cart-empty">🛒<br><br>Votre panier est vide</div>`;
    return;
  }

  const total = getTotal();
  const livraison = getLivraison();
  const ttc = total + livraison;

  content.innerHTML = `
    <div class="cart-items">
      ${cart.map(item => `
        <div class="cart-item">
          <div class="cart-item-emoji">${item.emoji || "💨"}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            ${item.gout ? `<div class="cart-item-gout">🍬 ${item.gout}</div>` : ""}
            <div class="cart-item-price">
              ${item.price.toFixed(2).replace(".", ",")} € × ${item.qty}
              = <strong>${(item.price * item.qty).toFixed(2).replace(".", ",")} €</strong>
            </div>
          </div>
          <div class="cart-item-controls">
            <button class="qty-btn-sm" onclick="changeQty('${item.key}', -1)">−</button>
            <span>${item.qty}</span>
            <button class="qty-btn-sm" onclick="changeQty('${item.key}', 1)">+</button>
            <button class="remove-btn" onclick="removeFromCart('${item.key}')">🗑️</button>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="cart-summary">
      <div class="summary-row">
        <span>Sous-total HT</span>
        <span>${total.toFixed(2).replace(".", ",")} €</span>
      </div>
      <div class="summary-row">
        <span>Livraison</span>
        <span style="color:${livraison === 0 ? "#00e676" : "#eef2f7"}">
          ${livraison === 0 ? "OFFERTE ✓" : livraison.toFixed(2).replace(".", ",") + " €"}
        </span>
      </div>
      ${livraison > 0 ? `
        <div class="delivery-hint">
          🚚 Livraison offerte dès 200 €
          (manque ${(200 - total).toFixed(2)} €)
        </div>
      ` : ""}
      <div class="summary-row total-row">
        <span>Total TTC</span>
        <span>${ttc.toFixed(2).replace(".", ",")} €</span>
      </div>
      <button class="checkout-btn" onclick="checkout()">
        Confirmer la commande →
      </button>
    </div>
  `;
}

// ── CHECKOUT ──────────────────────────────────────
async function checkout() {
  if (cart.length === 0) return showToast("Votre panier est vide");

  const user     = tg.initDataUnsafe?.user;
  const username = user?.username ? `@${user.username}` : (user?.first_name || "client");
  const total    = getTotal();
  const livraison= getLivraison();
  const orderId  = "CMD-" + Date.now().toString().slice(-6);

  const order = {
    id: orderId,
    telegram_user: username,
    items: cart.map(i => ({
      name: i.name,
      gout: i.gout || null,
      qty:  i.qty,
      price:i.price,
    })),
    total:    parseFloat(total.toFixed(2)),
    livraison:parseFloat(livraison.toFixed(2)),
    status:   "nouveau",
  };

  try {
    await sbPost("orders", order);
    showToast("✅ Commande envoyée ! On vous contacte bientôt.");
    cart = [];
    updateCartBadge();
    renderCart();
    tg.HapticFeedback.impactOccurred("heavy");
    tg.sendData(JSON.stringify({ orderId, total: total + livraison }));
  } catch(e) {
    console.error(e);
    showToast("❌ Erreur lors de l'envoi, réessayez.");
  }
}

// ── TOAST ─────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// ── FALLBACK ──────────────────────────────────────
const FALLBACK_PRODUCTS = [
  {id:1,cat:"puff",emoji:"💨",name:"Elf Bar 600",price:3.50,unit:"/ unité",min_qty:10,badge:"top",stock:1200,
   gouts:["Mix Fruits","Fraise Kiwi","Pastèque Glace","Menthe","Mangue","Pêche Glace"]},
  {id:2,cat:"puff",emoji:"🌟",name:"Vozol Star 6000",price:5.20,unit:"/ unité",min_qty:10,badge:"promo",stock:800,
   gouts:["Citron Givré","Mangue Glacée","Pastèque Menthe","Raisin Glace","Fraise"]},
  {id:3,cat:"puff",emoji:"🍇",name:"Lost Mary BM600",price:3.80,unit:"/ unité",min_qty:10,badge:"new",stock:600,
   gouts:["Raisin","Triple Melon","Fraise Kiwi","Myrtille Framboise"]},
  {id:7,cat:"recharge",emoji:"🔋",name:"Pack Recharge USB-C ×50",price:18.00,unit:"/ pack",min_qty:1,badge:"new",stock:200,gouts:[]},
  {id:9,cat:"accessoire",emoji:"🏷️",name:"Présentoir de comptoir",price:12.00,unit:"/ unité",min_qty:1,badge:null,stock:80,gouts:[]},
];

// ── START ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  init();

  document.getElementById("modalOverlay")?.addEventListener("click", function(e) {
    if (e.target === this) closeModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
});
