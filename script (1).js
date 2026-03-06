/* ================================================
   ZK PRO · Grossiste Puff · Telegram Mini App
   script.js — App logic
   ================================================ */

'use strict';

/* ── TELEGRAM INIT ── */
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
}

/* ── PRODUITS ── */
const PRODUCTS = [
  {
    id: 1, cat: 'puff', badge: 'top',
    emoji: '💨', name: 'Elf Bar 600 — Mix Fruits',
    price: 3.50, unit: '/ unité (min. 10)',
    minQty: 10,
    desc: 'Puff 600 bouffées, sans nicotine ou 20mg. Saveur fruits tropicaux. Certifiée TPD.',
    specs: [['Bouffées','600'], ['Nicotine','0 / 20mg'], ['Batterie','550 mAh'], ['Contenance','2 ml']]
  },
  {
    id: 2, cat: 'puff', badge: 'promo',
    emoji: '🍋', name: 'Vozol Star 6000 — Citron',
    price: 5.20, unit: '/ unité (min. 10)',
    minQty: 10,
    desc: 'Puff 6000 bouffées rechargeable. Batterie 500 mAh USB-C. Saveur citron glacé.',
    specs: [['Bouffées','6000'], ['Nicotine','20mg'], ['Batterie','500 mAh'], ['Recharge','USB-C']]
  },
  {
    id: 3, cat: 'puff', badge: 'new',
    emoji: '🍇', name: 'Lost Mary BM600 — Raisin',
    price: 3.80, unit: '/ unité (min. 10)',
    minQty: 10,
    desc: 'Puff Lost Mary 600 bouffées. Design compact et élégant. Saveur raisin glacé intense.',
    specs: [['Bouffées','600'], ['Nicotine','20mg'], ['Batterie','500 mAh'], ['Contenance','2 ml']]
  },
  {
    id: 4, cat: 'puff', badge: null,
    emoji: '🍑', name: 'Tornado 7000 — Pêche',
    price: 6.00, unit: '/ unité (min. 10)',
    minQty: 10,
    desc: 'Puff 7000 bouffées, écran LED batterie. Saveur pêche abricot. Rechargeable USB-C.',
    specs: [['Bouffées','7000'], ['Nicotine','20mg'], ['Batterie','650 mAh'], ['Écran','LED niveau']],
  },
  {
    id: 5, cat: 'puff', badge: 'stock',
    emoji: '🍓', name: 'Elf Bar 1500 — Fraise',
    price: 4.20, unit: '/ unité (min. 10)',
    minQty: 10,
    desc: 'Puff 1500 bouffées format intermédiaire. Saveur fraise classique. Stock limité.',
    specs: [['Bouffées','1500'], ['Nicotine','20mg'], ['Batterie','850 mAh'], ['Contenance','4.8 ml']]
  },
  {
    id: 6, cat: 'puff', badge: null,
    emoji: '🍏', name: 'R&M Tornado — Pomme Froide',
    price: 5.80, unit: '/ unité (min. 10)',
    minQty: 10,
    desc: 'Puff 9000 bouffées. Mesh coil haute performance. Saveur pomme verte glacée.',
    specs: [['Bouffées','9000'], ['Nicotine','20mg'], ['Batterie','700 mAh'], ['Technologie','Mesh']]
  },
  {
    id: 7, cat: 'recharge', badge: 'new',
    emoji: '🔋', name: 'Pack Recharge USB-C ×50',
    price: 18.00, unit: '/ pack de 50',
    minQty: 1,
    desc: 'Pack de 50 câbles USB-C courts pour puffs rechargeables. Compatible toutes marques.',
    specs: [['Quantité','50 pcs'], ['Longueur','20 cm'], ['Ampérage','1A'], ['Compatibilité','USB-C']]
  },
  {
    id: 8, cat: 'recharge', badge: null,
    emoji: '📦', name: 'Carton 100 puffs mixte',
    price: 290.00, unit: '/ carton 100 pcs',
    minQty: 1,
    desc: 'Carton de 100 puffs assortis (10 références). Idéal pour tester la gamme complète.',
    specs: [['Quantité','100 pcs'], ['Références','10 mix'], ['Format','Carton'], ['Livraison','Express']]
  },
  {
    id: 9, cat: 'accessoire', badge: null,
    emoji: '🏷️', name: 'Présentoir de comptoir',
    price: 12.00, unit: '/ unité',
    minQty: 1,
    desc: 'Présentoir acrylique 30 emplacements pour puffs. Idéal pour tabac et épicerie.',
    specs: [['Emplacements','30'], ['Matière','Acrylique'], ['Format','Comptoir'], ['Couleur','Noir']]
  },
  {
    id: 10, cat: 'accessoire', badge: 'promo',
    emoji: '📋', name: 'Lot étiquettes prix ×200',
    price: 5.00, unit: '/ lot 200 étiquettes',
    minQty: 1,
    desc: 'Lot de 200 étiquettes prix autocollantes pour puffs. Format 4×2 cm, repositionnables.',
    specs: [['Quantité','200 pcs'], ['Format','4×2 cm'], ['Type','Autocollant'], ['Repositionnable','Oui']]
  },
];

/* ── CART ── */
let cart = [];

/* ── NAVIGATION ── */
let currentTab = 'produits';
let currentFilter = 'tous';

function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + tab);
  if (page) page.classList.add('active');
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  if (tab === 'panier') renderCart();
}

/* ── PRODUCTS ── */
function filterProducts(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  const list = currentFilter === 'tous'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.cat === currentFilter);

  grid.innerHTML = list.map((p, i) => `
    <div class="product-card no-select"
         style="animation-delay:${i*.04}s"
         onclick="openModal(${p.id})">
      <div class="product-img-wrap">
        <div class="emoji">${p.emoji}</div>
        ${p.badge ? `<span class="product-badge badge-${p.badge}">${badgeLabel(p.badge)}</span>` : ''}
      </div>
      <div class="product-body">
        <p class="product-cat">${catLabel(p.cat)}</p>
        <p class="product-name">${p.name}</p>
        <div class="product-footer">
          <div>
            <span class="product-price">${p.price.toFixed(2)} €</span>
            <span class="product-unit">${p.unit}</span>
          </div>
          <button class="add-btn no-select"
                  onclick="event.stopPropagation(); addToCart(${p.id})"
                  aria-label="Ajouter">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function badgeLabel(b) {
  return { new: 'Nouveau', promo: 'Promo', top: 'Top', stock: 'Stock !' }[b] || b;
}
function catLabel(c) {
  return { puff: 'Puff', recharge: 'Recharge', accessoire: 'Accessoire' }[c] || c;
}

/* ── MODAL ── */
function openModal(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;

  const specsHTML = p.specs
    ? `<div class="modal-specs">${p.specs.map(([k,v]) => `<div class="spec-item"><strong>${v}</strong>${k}</div>`).join('')}</div>`
    : '';

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-emoji">${p.emoji}</div>
    <p class="modal-cat">${catLabel(p.cat)}</p>
    <h2 class="modal-name">${p.name}</h2>
    <p class="modal-desc">${p.desc}</p>
    ${specsHTML}
    <div class="modal-footer">
      <div>
        <span class="modal-price">${p.price.toFixed(2)} €</span>
        <span class="modal-price-unit">${p.unit}</span>
      </div>
      <button class="modal-add-btn" onclick="addToCart(${p.id}); closeModal()">
        AJOUTER AU PANIER
      </button>
    </div>
  `;

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── CART LOGIC ── */
function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(i => i.product.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ product, qty: product.minQty || 1 });
  }

  updateCartBadge();
  showToast(`${product.emoji} ${product.name.split('—')[0].trim()} ajouté`);
  tg?.HapticFeedback?.impactOccurred('light');
}

function removeFromCart(id) {
  cart = cart.filter(i => i.product.id !== id);
  updateCartBadge();
  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.product.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  if (item.qty === 0) { removeFromCart(id); return; }
  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cartCount');
  badge.textContent = total;
  badge.classList.toggle('visible', total > 0);
}

function cartTotal() {
  return cart.reduce((s, i) => s + i.product.price * i.qty, 0);
}
function cartItemCount() {
  return cart.reduce((s, i) => s + i.qty, 0);
}

/* ── RENDER CART ── */
function renderCart() {
  const container = document.getElementById('cartContent');

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">📦</div>
        <h3>Panier vide</h3>
        <p>Ajoutez des produits depuis le catalogue grossiste.</p>
        <button class="btn-shop" onclick="switchTab('produits')">VOIR LE CATALOGUE</button>
      </div>
    `;
    return;
  }

  const total = cartTotal();
  const count = cartItemCount();
  const livraison = total >= 200 ? 0 : 9.90;

  container.innerHTML = `
    <div class="cart-items">
      ${cart.map(({ product: p, qty }) => `
        <div class="cart-item">
          <div class="cart-item-emoji">${p.emoji}</div>
          <div class="cart-item-info">
            <p class="cart-item-name">${p.name}</p>
            <p class="cart-item-price">${(p.price * qty).toFixed(2)} €</p>
          </div>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
            <span class="qty-val">${qty}</span>
            <button class="qty-btn" onclick="changeQty(${p.id}, +1)">+</button>
            <button class="qty-btn del" onclick="removeFromCart(${p.id})">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="cart-summary">
      <div class="summary-row">
        <span>Sous-total (${count} article${count>1?'s':''})</span>
        <span>${total.toFixed(2)} €</span>
      </div>
      <div class="summary-row">
        <span>Livraison</span>
        ${livraison === 0
          ? '<span class="free-badge">✓ OFFERTE</span>'
          : `<span>${livraison.toFixed(2)} €</span>`}
      </div>
      ${livraison > 0 ? `
        <div class="summary-row" style="font-size:.72rem;color:var(--text3)">
          <span>Livraison offerte dès 200 € d'achat</span>
        </div>` : ''}
      <div class="summary-row total">
        <span>TOTAL TTC</span>
        <span>${(total + livraison).toFixed(2)} €</span>
      </div>
    </div>

    <button class="btn-checkout" onclick="checkout()">
      PASSER LA COMMANDE — ${(total + livraison).toFixed(2)} €
    </button>
  `;
}

/* ── CHECKOUT ── */
function checkout() {
  if (!cart.length) return;

  const order = {
    client: tg?.initDataUnsafe?.user?.username || 'inconnu',
    items: cart.map(({ product: p, qty }) => ({
      id: p.id, name: p.name, qty, unitPrice: p.price,
      total: +(p.price * qty).toFixed(2),
    })),
    totalHT: +cartTotal().toFixed(2),
    livraison: cartTotal() >= 200 ? 0 : 9.90,
    totalTTC: +(cartTotal() + (cartTotal() >= 200 ? 0 : 9.90)).toFixed(2),
  };

  if (tg) {
    tg.HapticFeedback?.notificationOccurred('success');
    tg.sendData(JSON.stringify(order));
  } else {
    showToast('✅ Commande envoyée !');
    cart = [];
    updateCartBadge();
    renderCart();
  }
}

/* ── TOAST ── */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ── ESC ── */
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  updateCartBadge();
});
