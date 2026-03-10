// ================================================
// ZK PRO — script.js (version Supabase connectée)
// Remplace l'ancien script.js dans ton repo telegram-shop
// ================================================

// ── CONFIG SUPABASE ──────────────────────────────
const SUPABASE_URL = "https://hyigrnuoojusixzahjvq.supabase.co";
const SUPABASE_KEY = "sb_publishable_zvgnghWMy0byVdyrIxSafA_i52Nn2f9";
const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

// ── API HELPERS ──────────────────────────────────
async function sbGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, { headers });
  if (!res.ok) throw new Error(`GET ${table} failed: ${res.status}`);
  return res.json();
}

async function sbPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, "Prefer": "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${table} failed: ${res.status}`);
}

// ── TELEGRAM ─────────────────────────────────────
const tg = window.Telegram?.WebApp || { ready:()=>{}, expand:()=>{}, enableClosingConfirmation:()=>{}, HapticFeedback:{impactOccurred:()=>{}}, sendData:()=>{}, initDataUnsafe:{user:{username:"demo_user"}} };
tg.ready();
tg.expand();
tg.enableClosingConfirmation();

// ── STATE ─────────────────────────────────────────
let products = [];
let cart = [];
let currentTab = "produits";
let currentFilter = "tous";

// ── INIT ──────────────────────────────────────────
async function init() {
  try {
    // Charger les produits depuis Supabase
    const data = await sbGet("products", "?order=id.asc");
    products = data.map(p => ({
      id: p.id,
      name: p.name,
      cat: p.cat,
      emoji: p.emoji || "💨",
      price: parseFloat(p.price),
      unit: p.unit,
      minQty: p.min_qty,
      badge: p.badge,
      stock: p.stock,
    }));
  } catch (e) {
    console.warn("Supabase non dispo, produits en dur:", e);
    products = FALLBACK_PRODUCTS;
  }

  renderProducts();
  updateCartBadge();
}

// ── NAVIGATION ────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add("active");
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${tab}`)?.classList.add("active");
  if (tab === "panier") renderCart();
}

// ── PRODUCTS ──────────────────────────────────────
function filterProducts(cat) {
  currentFilter = cat;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`[data-filter="${cat}"]`)?.classList.add("active");
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const filtered = currentFilter === "tous"
    ? products
    : products.filter(p => p.cat === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#4a5568">Aucun produit dans cette catégorie</div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => `
    <div class="product-card fade-up" style="animation-delay:${i * 0.05}s" onclick="openModal(${p.id})">
      <div class="product-emoji">${p.emoji}</div>
      <div class="product-info">
        <div class="product-cat">${p.cat}${p.badge ? ` <span class="product-badge badge-${p.badge}">${p.badge}</span>` : ""}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">${p.price.toFixed(2).replace(".", ",")} €<span class="product-unit">${p.unit}</span></div>
        <div class="product-min">Min. ${p.minQty} unités${p.stock < 50 ? ` · <span style="color:#ff9f43">Stock faible : ${p.stock}</span>` : ""}</div>
      </div>
    </div>
  `).join("");
}

// ── MODAL ─────────────────────────────────────────
function openModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const overlay = document.getElementById("modalOverlay");
  const body = document.getElementById("modalBody");

  body.innerHTML = `
    <div class="modal-emoji">${p.emoji}</div>
    <div class="modal-cat">${p.cat}${p.badge ? ` <span class="product-badge badge-${p.badge}">${p.badge}</span>` : ""}</div>
    <div class="modal-name">${p.name}</div>
    <div class="modal-price">${p.price.toFixed(2).replace(".", ",")} € <span class="modal-unit">${p.unit}</span></div>
    <div class="modal-min">Commande minimum : <strong>${p.minQty} unités</strong></div>
    ${p.stock < 50 ? `<div class="modal-stock-warn">⚠️ Stock faible : ${p.stock} restants</div>` : ""}
    <div class="modal-qty-row">
      <button class="qty-btn" onclick="changeModalQty(-${p.minQty})">−</button>
      <input id="modalQty" type="number" value="${p.minQty}" min="${p.minQty}" step="${p.minQty}" class="qty-input" />
      <button class="qty-btn" onclick="changeModalQty(${p.minQty})">+</button>
    </div>
    <button class="modal-add-btn" onclick="addToCartFromModal(${p.id})">Ajouter au panier</button>
  `;

  overlay.classList.add("active");
}

function closeModal() {
  document.getElementById("modalOverlay")?.classList.remove("active");
}

function changeModalQty(delta) {
  const input = document.getElementById("modalQty");
  const val = parseInt(input.value) + delta;
  const p = products.find(x => x.id === parseInt(input.closest(".modal-body, #modalBody") ? null : null));
  input.value = Math.max(1, val);
}

function addToCartFromModal(id) {
  const p = products.find(x => x.id === id);
  const qty = parseInt(document.getElementById("modalQty")?.value || p.minQty);
  addToCart(id, qty);
  closeModal();
}

// ── CART ──────────────────────────────────────────
function addToCart(id, qty) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const existing = cart.find(x => x.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id, name: p.name, emoji: p.emoji, price: p.price, qty });
  }

  tg.HapticFeedback.impactOccurred("light");
  updateCartBadge();
  showToast(`✅ ${p.name} ajouté au panier`);
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCartBadge();
  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderCart();
  updateCartBadge();
}

function updateCartBadge() {
  const count = cart.reduce((s, x) => s + x.qty, 0);
  const badge = document.getElementById("cartBadge");
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  }
}

function getTotal() {
  return cart.reduce((s, x) => s + x.price * x.qty, 0);
}

function getLivraison() {
  return getTotal() >= 200 ? 0 : 9.90;
}

function renderCart() {
  const content = document.getElementById("cartContent");
  if (!content) return;

  if (cart.length === 0) {
    content.innerHTML = `<div class="cart-empty">🛒<br>Votre panier est vide</div>`;
    return;
  }

  const total = getTotal();
  const livraison = getLivraison();

  content.innerHTML = `
    <div class="cart-items">
      ${cart.map(item => `
        <div class="cart-item">
          <div class="cart-item-emoji">${item.emoji}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${item.price.toFixed(2).replace(".", ",")} € × ${item.qty} = <strong>${(item.price * item.qty).toFixed(2).replace(".", ",")} €</strong></div>
          </div>
          <div class="cart-item-controls">
            <button class="qty-btn-sm" onclick="changeQty(${item.id}, -1)">−</button>
            <span>${item.qty}</span>
            <button class="qty-btn-sm" onclick="changeQty(${item.id}, 1)">+</button>
            <button class="remove-btn" onclick="removeFromCart(${item.id})">🗑️</button>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="cart-summary">
      <div class="summary-row"><span>Sous-total HT</span><span>${total.toFixed(2).replace(".", ",")} €</span></div>
      <div class="summary-row"><span>Livraison</span><span style="color:${livraison === 0 ? "#00e676" : "#eef2f7"}">${livraison === 0 ? "OFFERTE ✓" : livraison.toFixed(2).replace(".", ",") + " €"}</span></div>
      ${livraison > 0 ? `<div class="delivery-hint">🚚 Livraison offerte dès 200 € (il vous manque ${(200 - total).toFixed(2)} €)</div>` : ""}
      <div class="summary-row total-row"><span>Total TTC</span><span>${(total + livraison).toFixed(2).replace(".", ",")} €</span></div>
      <button class="checkout-btn" onclick="checkout()">Confirmer la commande →</button>
    </div>
  `;
}

// ── CHECKOUT ──────────────────────────────────────
async function checkout() {
  if (cart.length === 0) return showToast("Votre panier est vide");

  const user = tg.initDataUnsafe?.user;
  const username = user?.username ? `@${user.username}` : user?.first_name || "client_telegram";
  const total = getTotal();
  const livraison = getLivraison();

  const orderId = "CMD-" + Date.now().toString().slice(-6);

  const order = {
    id: orderId,
    telegram_user: username,
    items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
    total: parseFloat(total.toFixed(2)),
    livraison: parseFloat(livraison.toFixed(2)),
    status: "nouveau",
  };

  try {
    await sbPost("orders", order);
    showToast("✅ Commande envoyée ! On vous contacte bientôt.");
    cart = [];
    updateCartBadge();
    renderCart();
    tg.HapticFeedback.impactOccurred("heavy");

    // Envoie aussi les données au bot Telegram
    tg.sendData(JSON.stringify({ orderId, total: total + livraison }));
  } catch (e) {
    console.error("Erreur commande:", e);
    showToast("❌ Erreur, réessayez.");
  }
}

// ── TOAST ─────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// ── FALLBACK PRODUCTS (si Supabase injoignable) ───
const FALLBACK_PRODUCTS = [
  { id:1, cat:"puff",       emoji:"💨", name:"Elf Bar 600 — Mix Fruits",   price:3.50,  unit:"/ unité",  minQty:10, badge:"top",   stock:340 },
  { id:2, cat:"puff",       emoji:"🍋", name:"Vozol Star 6000 — Citron",   price:5.20,  unit:"/ unité",  minQty:10, badge:"promo", stock:210 },
  { id:3, cat:"puff",       emoji:"🍇", name:"Lost Mary BM600 — Raisin",   price:3.80,  unit:"/ unité",  minQty:10, badge:"new",   stock:180 },
  { id:4, cat:"puff",       emoji:"🍑", name:"Tornado 7000 — Pêche",       price:6.00,  unit:"/ unité",  minQty:10, badge:null,    stock:95  },
  { id:5, cat:"puff",       emoji:"🍓", name:"Elf Bar 1500 — Fraise",      price:4.20,  unit:"/ unité",  minQty:10, badge:"stock", stock:42  },
  { id:6, cat:"puff",       emoji:"🍏", name:"R&M Tornado — Pomme Froide", price:5.80,  unit:"/ unité",  minQty:10, badge:null,    stock:130 },
  { id:7, cat:"recharge",   emoji:"🔋", name:"Pack Recharge USB-C ×50",    price:18.00, unit:"/ pack",   minQty:1,  badge:"new",   stock:60  },
  { id:8, cat:"recharge",   emoji:"📦", name:"Carton 100 puffs mixte",     price:290.00,unit:"/ carton", minQty:1,  badge:null,    stock:15  },
  { id:9, cat:"accessoire", emoji:"🏷️", name:"Présentoir de comptoir",     price:12.00, unit:"/ unité",  minQty:1,  badge:null,    stock:28  },
  { id:10,cat:"accessoire", emoji:"📋", name:"Lot étiquettes prix ×200",   price:5.00,  unit:"/ lot",    minQty:1,  badge:"promo", stock:200 },
];

// ── EVENTS ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  init();
  document.getElementById("modalOverlay")?.addEventListener("click", e => {
    if (e.target.id === "modalOverlay") closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
});
