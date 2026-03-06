/* ════════════════════════════════════
   ShopBot · Telegram Mini App
   script.js — App logic
   ════════════════════════════════════ */

'use strict';

/* ──────────────────────────────
   1. TELEGRAM WEB APP INIT
────────────────────────────── */
const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
  // Match theme
  document.documentElement.style.setProperty('--tg-safe-top',
    tg.safeAreaInset?.top + 'px' || '0px');
}

/* ──────────────────────────────
   2. DATA — PRODUCTS
────────────────────────────── */
const PRODUCTS = [
  {
    id: 1, cat: 'tech', badge: 'new',
    emoji: '🎧', name: 'Casque Pro Max',
    price: 149, oldPrice: 199,
    desc: 'Son 3D immersif, réduction de bruit active, autonomie 40h. Compatible Bluetooth 5.3 et jack 3.5mm.',
  },
  {
    id: 2, cat: 'mode', badge: 'top',
    emoji: '👟', name: 'Sneakers Urban',
    price: 89, oldPrice: null,
    desc: 'Semelle cushion ultra-confort, tissu respirant mesh. Disponible en 5 coloris.',
  },
  {
    id: 3, cat: 'tech', badge: 'promo',
    emoji: '⌚', name: 'Smartwatch S3',
    price: 79, oldPrice: 129,
    desc: 'Écran AMOLED, suivi santé 24/7, GPS intégré, 7 jours d\'autonomie, IP68.',
  },
  {
    id: 4, cat: 'maison', badge: null,
    emoji: '🪴', name: 'Plante XL Monstera',
    price: 38, oldPrice: null,
    desc: 'Monstera Deliciosa livrée en pot d\'1 an. Parfaite pour les intérieurs lumineux.',
  },
  {
    id: 5, cat: 'mode', badge: null,
    emoji: '🧥', name: 'Veste Oversize',
    price: 65, oldPrice: null,
    desc: 'Coupe oversize tendance, tissu bouclette douce, 3 coloris neutres disponibles.',
  },
  {
    id: 6, cat: 'maison', badge: 'new',
    emoji: '🕯️', name: 'Bougie Luxe Set',
    price: 29, oldPrice: null,
    desc: 'Set de 3 bougies parfumées aux fragrances vanille, cèdre et jasmin. 40h de combustion chacune.',
  },
  {
    id: 7, cat: 'tech', badge: null,
    emoji: '📱', name: 'Support MagSafe',
    price: 25, oldPrice: 35,
    desc: 'Support magnétique rotatif 360°, compatible iPhone 12 et +, finition aluminium brossé.',
  },
  {
    id: 8, cat: 'mode', badge: 'promo',
    emoji: '👜', name: 'Sac Tote Premium',
    price: 44, oldPrice: 59,
    desc: 'Toile canvas épaisse, anse longue et poignée, fermeture zip, poche intérieure zippée.',
  },
];

/* ──────────────────────────────
   3. CART STATE
────────────────────────────── */
let cart = []; // [ { product, qty } ]

/* ──────────────────────────────
   4. NAVIGATION
────────────────────────────── */
let currentTab = 'produits';
let currentFilter = 'tous';

function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;

  // Pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + tab);
  if (page) page.classList.add('active');

  // Tab buttons
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  // If panier tab → render cart
  if (tab === 'panier') renderCart();
}

/* ──────────────────────────────
   5. RENDER PRODUCTS
────────────────────────────── */
function filterProducts(cat) {
  currentFilter = cat;

  // Update filter buttons
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
         style="animation-delay: ${i * 0.04}s"
         onclick="openModal(${p.id})">
      <div class="product-img-wrap">
        <div class="emoji">${p.emoji}</div>
        ${p.badge ? `<span class="product-badge badge-${p.badge}">${badgeLabel(p.badge)}</span>` : ''}
      </div>
      <div class="product-body">
        <p class="product-cat">${catLabel(p.cat)}</p>
        <p class="product-name">${p.name}</p>
        <div class="product-footer">
          <span class="product-price">${p.price} €</span>
          <button class="add-btn no-select"
                  onclick="event.stopPropagation(); addToCart(${p.id})"
                  aria-label="Ajouter au panier">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function badgeLabel(b) {
  return { new: 'Nouveau', promo: 'Promo', top: 'Top vente' }[b] || b;
}

function catLabel(c) {
  return { tech: 'Technologie', mode: 'Mode', maison: 'Maison' }[c] || c;
}

/* ──────────────────────────────
   6. MODAL
────────────────────────────── */
function openModal(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;

  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="modal-emoji">${p.emoji}</div>
    <p class="modal-cat">${catLabel(p.cat)}</p>
    <h2 class="modal-name">${p.name}</h2>
    <p class="modal-desc">${p.desc}</p>
    <div class="modal-footer">
      <span class="modal-price">${p.price} €</span>
      <button class="modal-add-btn" onclick="addToCart(${p.id}); closeModal()">
        Ajouter au panier
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

/* ──────────────────────────────
   7. CART LOGIC
────────────────────────────── */
function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(i => i.product.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ product, qty: 1 });
  }

  updateCartBadge();
  showToast(`${product.emoji} ${product.name} ajouté`);

  // Haptic feedback
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

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }
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

/* ──────────────────────────────
   8. RENDER CART
────────────────────────────── */
function renderCart() {
  const container = document.getElementById('cartContent');

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <h3>Votre panier est vide</h3>
        <p>Découvrez nos produits et ajoutez-en à votre panier.</p>
        <button class="btn-shop" onclick="switchTab('produits')">
          Voir les produits
        </button>
      </div>
    `;
    return;
  }

  const total = cartTotal();
  const count = cartItemCount();
  const livraison = total >= 49 ? 0 : 4.90;

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
            <button class="qty-btn" onclick="changeQty(${p.id}, -1)" aria-label="Moins">−</button>
            <span class="qty-val">${qty}</span>
            <button class="qty-btn" onclick="changeQty(${p.id}, +1)" aria-label="Plus">+</button>
            <button class="qty-btn del" onclick="removeFromCart(${p.id})" aria-label="Supprimer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="cart-summary">
      <div class="summary-row">
        <span>Sous-total (${count} article${count > 1 ? 's' : ''})</span>
        <span>${total.toFixed(2)} €</span>
      </div>
      <div class="summary-row">
        <span>Livraison</span>
        ${livraison === 0
          ? '<span class="free-badge">✓ Offerte</span>'
          : `<span>${livraison.toFixed(2)} €</span>`}
      </div>
      ${livraison > 0 ? `
        <div class="summary-row" style="font-size:.75rem;color:var(--text3)">
          <span>Plus que ${(49 - total).toFixed(2)} € pour la livraison offerte</span>
        </div>
      ` : ''}
      <div class="summary-row total">
        <span>Total</span>
        <span>${(total + livraison).toFixed(2)} €</span>
      </div>
    </div>

    <button class="btn-checkout" onclick="checkout()">
      Commander — ${(total + livraison).toFixed(2)} €
    </button>
  `;
}

/* ──────────────────────────────
   9. CHECKOUT
────────────────────────────── */
function checkout() {
  if (cart.length === 0) return;

  // Build order payload for Telegram
  const order = {
    items: cart.map(({ product: p, qty }) => ({
      id: p.id, name: p.name, qty, price: p.price,
    })),
    total: (cartTotal() + (cartTotal() >= 49 ? 0 : 4.90)).toFixed(2),
  };

  if (tg) {
    tg.HapticFeedback?.notificationOccurred('success');
    tg.sendData(JSON.stringify(order));
  } else {
    // Dev fallback
    showToast('✅ Commande envoyée !');
    cart = [];
    updateCartBadge();
    renderCart();
  }
}

/* ──────────────────────────────
   10. TOAST
────────────────────────────── */
let toastTimer;

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ──────────────────────────────
   11. KEYBOARD / ESC
────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ──────────────────────────────
   12. INIT
────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  updateCartBadge();
});
