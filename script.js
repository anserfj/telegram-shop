// ================================================
// ZK PRO — script.js v3 (photos + vidéos)
// ================================================

const SUPABASE_URL = "https://hyigrnuoojusixzahjvq.supabase.co";
const SUPABASE_KEY = "sb_publishable_zvgnghWMy0byVdyrIxSafA_i52Nn2f9";
const BOT_TOKEN    = "8700497448:AAG8DKiQ8d43FUIYU1j5d7IoDouq2DRI3-s";
const SB_HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

// ── TELEGRAM ──────────────────────────────────────
const tg = window.Telegram?.WebApp || {
  ready:()=>{}, expand:()=>{}, enableClosingConfirmation:()=>{},
  HapticFeedback:{impactOccurred:()=>{}},
  sendData:(d)=>console.log("sendData:", d),
  initDataUnsafe:{ user:{ username:"demo_user" } }
};
tg.ready(); tg.expand(); tg.enableClosingConfirmation();

// ── STATE ─────────────────────────────────────────
let products = [];
let cart = [];
let currentFilter = "tous";

// ── UTILS ─────────────────────────────────────────
const isVideo = url => url && /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);

// ── PERSISTANCE PANIER ────────────────────────────
function saveCart() {
  try { localStorage.setItem("zkpro_cart", JSON.stringify(cart)); } catch(e) {}
}
function loadCart() {
  try {
    const saved = localStorage.getItem("zkpro_cart");
    if (saved) cart = JSON.parse(saved);
  } catch(e) { cart = []; }
}

// ── TELEGRAM MAIN BUTTON ──────────────────────────
function updateMainButton() {
  if (!tg.MainButton) return;
  const total = cart.reduce((s, x) => s + x.qty, 0);
  if (total > 0) {
    const amount = getTotal() + getLivraison();
    tg.MainButton.setText(`🛒 Commander — ${amount.toFixed(2).replace(".",",")} €`);
    tg.MainButton.show();
    tg.MainButton.onClick(checkout);
  } else {
    tg.MainButton.hide();
  }
}

// ── SUPABASE ──────────────────────────────────────
async function sbGet(table, params = "") {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, { headers: SB_HEADERS });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
}
async function sbPost(table, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Prefer": "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
}

// ── INIT ──────────────────────────────────────────
async function init() {
  loadCart(); // Restaurer le panier sauvegardé

  // Skeleton loader
  const grid = document.getElementById("productGrid");
  if (grid) {
    grid.innerHTML = Array(4).fill(0).map(() => `
      <div style="background:var(--surface);border-radius:14px;border:1px solid var(--border);overflow:hidden;animation:pulse 1.5s ease infinite">
        <div style="aspect-ratio:1/1;background:var(--bg3)"></div>
        <div style="padding:10px">
          <div style="height:8px;background:var(--bg3);border-radius:4px;width:40%;margin-bottom:8px"></div>
          <div style="height:12px;background:var(--bg3);border-radius:4px;width:80%;margin-bottom:8px"></div>
          <div style="height:10px;background:var(--bg3);border-radius:4px;width:50%"></div>
        </div>
      </div>`).join("");
  }
  try {
    const data = await sbGet("products", "?order=id.asc");
    products = data.map(p => ({
      ...p,
      price: parseFloat(p.price),
      gouts: Array.isArray(p.gouts) ? p.gouts : (p.gouts ? JSON.parse(p.gouts) : []),
    }));
  } catch(e) {
    console.warn("Supabase indispo, fallback:", e);
    products = FALLBACK_PRODUCTS;
  }
  renderProducts();
  updateCartBadge();

}

// ── NAVIGATION ────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".tab").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
  document.querySelectorAll(".page").forEach(p =>
    p.classList.toggle("active", p.id === `page-${tab}`)
  );
  window.scrollTo(0, 0);
  if (tab === "panier") renderCart();
}

let currentSearch = "";

function searchProducts(query) {
  currentSearch = query.toLowerCase().trim();
  renderProducts();
}

function filterProducts(cat) {
  currentFilter = cat;
  document.querySelectorAll(".filter-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.cat === cat)
  );
  renderProducts();
}

// ── MEDIA HELPERS ─────────────────────────────────
// Génère le contenu de la vignette produit (photo, vidéo, ou emoji fallback)
function renderCardMedia(p) {
  if (p.video_url && isVideo(p.video_url)) {
    return `<video src="${p.video_url}" autoplay muted loop playsinline
      style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
  }
  if (p.image_url) {
    return `<img src="${p.image_url}" alt="${p.name}"
      style="width:100%;height:100%;object-fit:cover;display:block;"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="emoji" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:3.2rem">${p.emoji||"💨"}</span>`;
  }
  // Fallback emoji
  return `<span class="emoji">${p.emoji||"💨"}</span>`;
}

// Génère le média dans la modale (galerie complète avec navigation)
function renderModalMedia(p) {
  // Construire la liste de tous les médias du produit
  const medias = [];
  if (p.image_url) medias.push({ url: p.image_url, type: "image" });
  if (p.video_url) medias.push({ url: p.video_url, type: "video" });
  const gallery = Array.isArray(p.gallery) ? p.gallery : (p.gallery ? JSON.parse(p.gallery || "[]") : []);
  gallery.forEach(url => {
    if (url && !medias.find(m => m.url === url))
      medias.push({ url, type: isVideo(url) ? "video" : "image" });
  });

  if (medias.length === 0) return `<div class="modal-emoji">${p.emoji || "💨"}</div>`;

  if (medias.length === 1) {
    const m = medias[0];
    if (m.type === "video") return `<video src="${m.url}" controls autoplay muted loop playsinline style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-bottom:14px;background:#000"></video>`;
    return `<img src="${m.url}" alt="${p.name}" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-bottom:14px;" onerror="this.style.display='none'">`;
  }

  // Galerie multiple
  const id = `gallery_${p.id}`;
  const items = medias.map((m, i) => {
    const isVid = m.type === "video";
    return `<div class="gallery-slide" style="min-width:100%;${i > 0 ? "display:none" : ""}">
      ${isVid
        ? `<video src="${m.url}" controls muted loop playsinline style="width:100%;height:180px;object-fit:cover;border-radius:12px;background:#000"></video>`
        : `<img src="${m.url}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;" onerror="this.style.display='none'">`
      }
    </div>`;
  }).join("");
  const dots = medias.length > 1
    ? `<div style="display:flex;justify-content:center;gap:5px;margin-top:7px">
        ${medias.map((_, i) => `<span id="${id}_dot_${i}" onclick="galleryGo('${id}',${i})" style="width:6px;height:6px;border-radius:50%;background:${i === 0 ? "var(--accent)" : "var(--text3)"};cursor:pointer;transition:background .2s"></span>`).join("")}
       </div>`
    : "";
  return `<div id="${id}" style="position:relative;margin-bottom:14px">
    <div style="overflow:hidden;border-radius:12px">${items}</div>
    ${dots}
    ${medias.length > 1 ? `
    <button onclick="galleryGo('${id}',-1,'prev')" style="position:absolute;left:6px;top:50%;transform:translateY(-50%);background:#00000088;border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:14px;cursor:pointer;z-index:2">‹</button>
    <button onclick="galleryGo('${id}',1,'next')" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:#00000088;border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:14px;cursor:pointer;z-index:2">›</button>` : ""}
  </div>`;
}

// Navigation galerie
window._galleryIdx = {};
function galleryGo(id, val, dir) {
  const container = document.getElementById(id);
  if (!container) return;
  const slides = container.querySelectorAll(".gallery-slide");
  const total = slides.length;
  if (!window._galleryIdx[id]) window._galleryIdx[id] = 0;
  let idx = window._galleryIdx[id];
  if (dir === "prev") idx = (idx - 1 + total) % total;
  else if (dir === "next") idx = (idx + 1) % total;
  else idx = val; // dot click
  window._galleryIdx[id] = idx;
  slides.forEach((s, i) => s.style.display = i === idx ? "block" : "none");
  container.querySelectorAll(`[id^="${id}_dot_"]`).forEach((d, i) =>
    d.style.background = i === idx ? "var(--accent)" : "var(--text3)"
  );
}

// ── RENDU PRODUITS ────────────────────────────────
function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const filtered = products.filter(p => {
    if (currentFilter !== "tous" && p.cat !== currentFilter) return false;
    if (currentSearch && !p.name.toLowerCase().includes(currentSearch) &&
        !(p.gouts||[]).some(g => g.toLowerCase().includes(currentSearch))) return false;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3);font-size:14px">${currentSearch ? `Aucun résultat pour "${currentSearch}"` : "Aucun produit disponible"}</div>`;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const gouts = p.gouts || [];
    const epuise = p.stock === 0;
    const seuilFaible = p.low_stock_alert || 50;
    const faible = !epuise && p.stock < seuilFaible;
    const discount = p.compare_price && p.compare_price > p.price
      ? Math.round((1 - p.price / p.compare_price) * 100) : 0;

    // Badge automatique : épuisé > stock faible > badge manuel
    const badgeHtml = epuise
      ? `<span class="product-badge" style="background:#ff4757;color:#fff;position:absolute;top:7px;left:7px;z-index:2;font-size:9px;font-weight:700;letter-spacing:.08em;padding:3px 8px;border-radius:4px;text-transform:uppercase">ÉPUISÉ</span>`
      : faible
        ? `<span class="product-badge" style="background:#ff9f43;color:#000;position:absolute;top:7px;left:7px;z-index:2;font-size:9px;font-weight:700;letter-spacing:.08em;padding:3px 8px;border-radius:4px;text-transform:uppercase">STOCK FAIBLE</span>`
        : p.badge
          ? `<span class="product-badge badge-${p.badge}">${p.badge}</span>`
          : "";

    const discountBadge = discount > 0 && !epuise
      ? `<span style="position:absolute;top:6px;right:6px;background:#ff4757;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;z-index:2">-${discount}%</span>`
      : "";

    const goutsInfo = gouts.length > 0
      ? ` · <span style="color:var(--accent)">${gouts.length} goûts</span>`
      : "";

    return `
      <div class="product-card" style="animation-delay:${i*0.05}s;${epuise?"opacity:.55;filter:grayscale(.4)":""}" onclick="openModal(${p.id})">
        ${badgeHtml}
        <div class="product-img-wrap" style="overflow:hidden;position:relative">
          ${renderCardMedia(p)}
          ${discountBadge}
          ${epuise ? `<div style="position:absolute;inset:0;background:#00000055;display:flex;align-items:center;justify-content:center"><span style="background:#ff4757;color:#fff;font-size:11px;font-weight:700;padding:5px 12px;border-radius:6px;letter-spacing:.06em">ÉPUISÉ</span></div>` : ""}
          ${p.video_url && !epuise ? `<span style="position:absolute;bottom:6px;right:6px;background:#00000099;border-radius:5px;font-size:10px;padding:2px 6px;color:#fff">▶ vidéo</span>` : ""}
        </div>
        <div class="product-body">
          <div class="product-cat">${p.cat}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-price" style="color:${epuise?"var(--text3)":"var(--accent)"}">
            ${p.price.toFixed(2).replace(".", ",")} €
            ${p.compare_price && p.compare_price > p.price ? `<span style="font-size:.7rem;color:var(--text3);text-decoration:line-through;margin-left:4px">${parseFloat(p.compare_price).toFixed(2).replace(".",",")} €</span>` : ""}
            <span class="product-unit">${p.unit}</span>
          </div>
          <div class="product-min" style="font-size:.72rem;color:var(--text3);margin-top:5px">
            ${epuise ? "Produit épuisé" : `Min. ${p.min_qty} unités${goutsInfo}`}
          </div>
        </div>
      </div>`;
  }).join("");
}

// ── MODAL ─────────────────────────────────────────
function openModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const overlay = document.getElementById("modalOverlay");
  const modal   = document.getElementById("modal");
  if (!overlay || !modal) return;

  const gouts    = p.gouts || [];
  const hasGouts = gouts.length > 0;
  const discount = p.compare_price && p.compare_price > p.price
    ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
  const seuilFaible = p.low_stock_alert || 50;

  modal.innerHTML = `
    <button class="modal-close" onclick="closeModal()">✕</button>

    ${renderModalMedia(p)}

    <div class="modal-cat">
      ${p.cat}${p.badge ? `&nbsp;<span class="product-badge badge-${p.badge}">${p.badge}</span>` : ""}
      ${discount > 0 ? `&nbsp;<span style="background:#ff4757;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px">-${discount}%</span>` : ""}
    </div>
    <div class="modal-name">${p.name}</div>
    <div class="modal-price" style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
      <span style="color:var(--accent);font-size:1.4rem;font-weight:700">${p.price.toFixed(2).replace(".", ",")} €</span>
      ${p.compare_price && p.compare_price > p.price
        ? `<span style="color:var(--text3);font-size:.9rem;text-decoration:line-through">${parseFloat(p.compare_price).toFixed(2).replace(".",",")} €</span>`
        : ""}
      <span class="modal-price-unit">${p.unit} · min. ${p.min_qty}</span>
    </div>

    ${hasGouts ? `
    <div style="margin:16px 0 8px">
      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:6px">Choisir le goût</label>
      <select id="modalGout" style="width:100%;background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;padding:11px 14px;outline:none;cursor:pointer;font-family:inherit">
        <option value="">— Sélectionner un goût —</option>
        ${gouts.map(g => `<option value="${g}">${g}</option>`).join("")}
      </select>
    </div>` : ""}

    <div style="margin:14px 0 8px">
      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:6px">Quantité</label>
      <div style="display:flex;align-items:center;gap:10px">
        <button class="qty-btn" onclick="changeModalQty(${p.min_qty}, -1)">−</button>
        <input id="modalQty" type="number"
          value="${p.min_qty}" min="${p.min_qty}" step="${p.min_qty}"
          style="flex:1;text-align:center;background:var(--bg3);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:16px;font-weight:700;padding:9px 8px;outline:none;font-family:inherit"/>
        <button class="qty-btn" onclick="changeModalQty(${p.min_qty}, 1)">+</button>
      </div>
    </div>

    ${p.stock > 0 && p.stock < seuilFaible ? `<p style="font-size:.78rem;color:#ff9f43;margin:8px 0">⚠️ Plus que ${p.stock} unités en stock !</p>` : ""}
    ${p.stock === 0 ? `<p style="font-size:.78rem;color:#ff4757;margin:8px 0">❌ Produit épuisé</p>` : ""}

    <div style="margin-top:18px">
      <button class="modal-add-btn" onclick="addToCartFromModal(${p.id})"
        ${p.stock === 0 ? "disabled style='opacity:.4;cursor:not-allowed'" : ""}>
        ${p.stock === 0 ? "ÉPUISÉ" : "AJOUTER AU PANIER"}
      </button>
    </div>
  `;

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

function changeModalQty(step, dir) {
  const input = document.getElementById("modalQty");
  if (!input) return;
  input.value = Math.max(step, parseInt(input.value) + dir * step);
}

function addToCartFromModal(id) {
  const p = products.find(x => x.id === id);
  if (!p || p.stock === 0) return;

  const goutEl   = document.getElementById("modalGout");
  const gout     = goutEl ? goutEl.value : null;
  const hasGouts = p.gouts && p.gouts.length > 0;

  if (hasGouts && !gout) {
    if (goutEl) goutEl.style.borderColor = "#ff4757";
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

  const key = `${id}__${gout || "none"}`;
  const existing = cart.find(x => x.key === key);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ key, id, name: p.name, emoji: p.emoji, image_url: p.image_url, price: p.price, qty, gout });
  }

  tg.HapticFeedback.impactOccurred("light");
  updateCartBadge();
  showToast(`✅ ${p.name}${gout ? ` · ${gout}` : ""} ajouté`);
}

function removeFromCart(key) {
  cart = cart.filter(x => x.key !== key);
  updateCartBadge();
  renderCart();
}

function changeQty(key, delta) {
  const item = cart.find(x => x.key === key);
  if (!item) return;
  const p    = products.find(x => x.id === item.id);
  const step = p?.min_qty || 1;
  item.qty   = Math.max(step, item.qty + delta);
  renderCart();
  updateCartBadge();
}

function updateCartBadge() {
  const el = document.getElementById("cartCount");
  if (!el) return;
  const total = cart.reduce((s, x) => s + x.qty, 0);
  el.textContent = total;
  el.classList.toggle("visible", total > 0);
  saveCart();        // Persister le panier
  updateMainButton(); // Mettre à jour le bouton Telegram natif
}

function getTotal()    { return cart.reduce((s, x) => s + x.price * x.qty, 0); }
function getLivraison(){ return getTotal() >= 200 ? 0 : 9.90; }

function renderCart() {
  const content = document.getElementById("cartContent");
  if (!content) return;

  if (cart.length === 0) {
    content.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <h3>Panier vide</h3>
        <p>Parcourez le catalogue pour ajouter des produits</p>
        <button class="btn-shop" onclick="switchTab('produits')">Voir le catalogue</button>
      </div>`;
    return;
  }

  const total     = getTotal();
  const livraison = getLivraison();
  const progress  = Math.min(100, Math.round((total / 200) * 100));

  // Miniature panier : photo si dispo, sinon emoji
  const cartThumb = item => item.image_url
    ? `<img src="${item.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.style.display='none'">`
    : (item.emoji || "💨");

  content.innerHTML = `
    ${livraison > 0 ? `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:7px">
        <span style="font-size:11px;font-weight:700;color:var(--text2)">🚚 Livraison offerte dès 200 €</span>
        <span style="font-size:11px;font-weight:700;color:var(--accent)">${total.toFixed(2).replace(".",",'")}&nbsp;/ 200,00 €</span>
      </div>
      <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,var(--accent2),var(--accent));border-radius:3px;transition:width .4s ease"></div>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px">Plus que ${(200-total).toFixed(2).replace(".",",")} € pour la livraison offerte</div>
    </div>` : `
    <div style="background:#00e67610;border:1px solid #00e67630;border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
      <span style="font-size:18px">🎉</span>
      <span style="font-size:13px;font-weight:700;color:#00e676">Livraison offerte !</span>
    </div>`}
    <div class="cart-items">
      ${cart.map(item => `
        <div class="cart-item">
          <div class="cart-item-emoji">${cartThumb(item)}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            ${item.gout ? `<div style="font-size:.74rem;color:var(--accent);margin-bottom:2px">🍬 ${item.gout}</div>` : ""}
            <div class="cart-item-price">
              ${item.price.toFixed(2).replace(".", ",")} € × ${item.qty}
              = ${(item.price * item.qty).toFixed(2).replace(".", ",")} €
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <button class="qty-btn" onclick="changeQty('${item.key}', -1)">−</button>
            <span style="font-size:13px;font-weight:700;min-width:20px;text-align:center">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.key}', 1)">+</button>
            <button class="qty-btn del" onclick="removeFromCart('${item.key}')" style="margin-left:2px">🗑</button>
          </div>
        </div>`).join("")}
    </div>

    <div class="cart-summary">
      <div class="summary-row">
        <span>Sous-total</span>
        <span>${total.toFixed(2).replace(".", ",")} €</span>
      </div>
      <div class="summary-row">
        <span>Livraison</span>
        <span style="color:${livraison === 0 ? "#00e676" : "var(--text)"}">
          ${livraison === 0 ? "OFFERTE ✓" : livraison.toFixed(2).replace(".", ",") + " €"}
        </span>
      </div>
      <div class="summary-row total">
        <span>Total TTC</span>
        <span>${(total + livraison).toFixed(2).replace(".", ",")} €</span>
      </div>
    </div>

    <button class="btn-checkout" onclick="checkout()">CONFIRMER LA COMMANDE →</button>
  `;
}

// ── FORMULAIRE LIVRAISON ──────────────────────────
function showDeliveryForm() {
  // Supprimer une éventuelle modale existante
  document.getElementById("dlvOverlay")?.remove();

  const total     = getTotal();
  const livraison = getLivraison();

  const el = document.createElement("div");
  el.id = "dlvOverlay";
  el.style.cssText = "position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.85);display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(6px)";

  el.innerHTML = `
    <div id="dlvPanel" style="width:100%;max-width:480px;background:var(--bg2,#111418);border-radius:20px 20px 0 0;border:1px solid var(--border,#222830);border-bottom:none;padding:22px 18px 32px;max-height:92vh;overflow-y:auto;box-sizing:border-box;">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:.05em;color:var(--text,#eef2f7)">📦 Informations de livraison</div>
        <button onclick="closeDeliveryForm()" style="background:var(--bg3,#1a1f26);border:1px solid var(--border,#222830);border-radius:8px;color:var(--text2,#8b9ab0);cursor:pointer;font-size:18px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:13px">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3,#4a5568);margin-bottom:6px">Prénom <span style="color:#ff4757">*</span></label>
            <input id="dlv_prenom" placeholder="Jean" style="width:100%;background:var(--bg3,#1a1f26);border:1.5px solid var(--border,#222830);border-radius:10px;color:var(--text,#eef2f7);font-size:14px;padding:10px 13px;outline:none;font-family:inherit;box-sizing:border-box"
              onfocus="this.style.borderColor='var(--accent,#00e5ff)'" onblur="this.style.borderColor='var(--border,#222830)'"/>
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3,#4a5568);margin-bottom:6px">Nom <span style="color:#ff4757">*</span></label>
            <input id="dlv_nom" placeholder="Dupont" style="width:100%;background:var(--bg3,#1a1f26);border:1.5px solid var(--border,#222830);border-radius:10px;color:var(--text,#eef2f7);font-size:14px;padding:10px 13px;outline:none;font-family:inherit;box-sizing:border-box"
              onfocus="this.style.borderColor='var(--accent,#00e5ff)'" onblur="this.style.borderColor='var(--border,#222830)'"/>
          </div>
        </div>

        <div>
          <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3,#4a5568);margin-bottom:6px">Adresse <span style="color:#ff4757">*</span></label>
          <input id="dlv_adresse" placeholder="12 rue de la Paix" style="width:100%;background:var(--bg3,#1a1f26);border:1.5px solid var(--border,#222830);border-radius:10px;color:var(--text,#eef2f7);font-size:14px;padding:10px 13px;outline:none;font-family:inherit;box-sizing:border-box"
            onfocus="this.style.borderColor='var(--accent,#00e5ff)'" onblur="this.style.borderColor='var(--border,#222830)'"/>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:10px">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3,#4a5568);margin-bottom:6px">Code postal <span style="color:#ff4757">*</span></label>
            <input id="dlv_cp" placeholder="75001" maxlength="5" style="width:100%;background:var(--bg3,#1a1f26);border:1.5px solid var(--border,#222830);border-radius:10px;color:var(--text,#eef2f7);font-size:14px;padding:10px 13px;outline:none;font-family:inherit;box-sizing:border-box"
              onfocus="this.style.borderColor='var(--accent,#00e5ff)'" onblur="this.style.borderColor='var(--border,#222830)'"/>
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3,#4a5568);margin-bottom:6px">Ville <span style="color:#ff4757">*</span></label>
            <input id="dlv_ville" placeholder="Paris" style="width:100%;background:var(--bg3,#1a1f26);border:1.5px solid var(--border,#222830);border-radius:10px;color:var(--text,#eef2f7);font-size:14px;padding:10px 13px;outline:none;font-family:inherit;box-sizing:border-box"
              onfocus="this.style.borderColor='var(--accent,#00e5ff)'" onblur="this.style.borderColor='var(--border,#222830)'"/>
          </div>
        </div>

        <div>
          <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3,#4a5568);margin-bottom:6px">Téléphone <span style="color:#ff4757">*</span></label>
          <input id="dlv_tel" type="tel" placeholder="06 12 34 56 78" style="width:100%;background:var(--bg3,#1a1f26);border:1.5px solid var(--border,#222830);border-radius:10px;color:var(--text,#eef2f7);font-size:14px;padding:10px 13px;outline:none;font-family:inherit;box-sizing:border-box"
            onfocus="this.style.borderColor='var(--accent,#00e5ff)'" onblur="this.style.borderColor='var(--border,#222830)'"/>
        </div>

        <div>
          <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3,#4a5568);margin-bottom:6px">Note (optionnel)</label>
          <input id="dlv_note" placeholder="Digicode, instructions particulières..." style="width:100%;background:var(--bg3,#1a1f26);border:1.5px solid var(--border,#222830);border-radius:10px;color:var(--text,#eef2f7);font-size:14px;padding:10px 13px;outline:none;font-family:inherit;box-sizing:border-box"
            onfocus="this.style.borderColor='var(--accent,#00e5ff)'" onblur="this.style.borderColor='var(--border,#222830)'"/>
        </div>

        <!-- Récap -->
        <div style="background:var(--bg3,#1a1f26);border:1px solid var(--border,#222830);border-radius:10px;padding:12px 14px">
          <div style="font-size:11px;color:var(--text3,#4a5568);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em">Récap commande</div>
          ${cart.map(i=>`
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
              <span style="color:var(--text2,#8b9ab0)">${i.name}${i.gout?` · <span style="color:var(--accent,#00e5ff)">${i.gout}</span>`:""} ×${i.qty}</span>
              <span style="font-weight:600;color:var(--text,#eef2f7)">${(i.price*i.qty).toFixed(2).replace(".",",")} €</span>
            </div>`).join("")}
          <div style="border-top:1px solid var(--border,#222830);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;font-weight:700;color:var(--text,#eef2f7)">Total TTC</span>
            <div style="text-align:right">
              <span style="font-size:15px;font-weight:700;color:var(--accent,#00e5ff)">${(total+livraison).toFixed(2).replace(".",",")} €</span>
              ${livraison===0?`<div style="font-size:10px;color:#00e676">🚚 Livraison offerte</div>`:`<div style="font-size:10px;color:var(--text3,#4a5568)">dont ${livraison.toFixed(2).replace(".",",")} € livraison</div>`}
            </div>
          </div>
        </div>

        <button id="dlvSubmitBtn" onclick="submitOrder()" style="width:100%;padding:15px;border-radius:12px;background:var(--accent,#00e5ff);color:#000;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.08em;border:none;cursor:pointer;margin-top:4px;transition:opacity .2s">
          ENVOYER MA COMMANDE SUR TELEGRAM →
        </button>

      </div>
    </div>
  `;

  // Fermer en cliquant sur le fond
  el.addEventListener("click", e => { if(e.target === el) closeDeliveryForm(); });
  document.body.appendChild(el);
  document.body.style.overflow = "hidden";
  // Petite animation slide-up
  const panel = el.querySelector("#dlvPanel");
  panel.style.transform = "translateY(40px)";
  panel.style.transition = "transform .3s cubic-bezier(.175,.885,.32,1.1)";
  requestAnimationFrame(() => { panel.style.transform = "translateY(0)"; });
}

function closeDeliveryForm() {
  document.getElementById("dlvOverlay")?.remove();
  document.body.style.overflow = "";
}

// ── CHECKOUT (validation + envoi) ─────────────────
async function submitOrder() {
  // Validation champs obligatoires
  const prenom  = document.getElementById("dlv_prenom")?.value.trim();
  const nom     = document.getElementById("dlv_nom")?.value.trim();
  const adresse = document.getElementById("dlv_adresse")?.value.trim();
  const cp      = document.getElementById("dlv_cp")?.value.trim();
  const ville   = document.getElementById("dlv_ville")?.value.trim();
  const tel     = document.getElementById("dlv_tel")?.value.trim();
  const note    = document.getElementById("dlv_note")?.value.trim();

  if (!prenom || !nom || !adresse || !cp || !ville || !tel) {
    showToast("⚠️ Veuillez remplir tous les champs obligatoires");
    [["dlv_prenom",prenom],["dlv_nom",nom],["dlv_adresse",adresse],["dlv_cp",cp],["dlv_ville",ville],["dlv_tel",tel]].forEach(([id,val])=>{
      const el = document.getElementById(id);
      if(!val && el){ el.style.borderColor = "#ff4757"; el.style.animation = "none"; el.offsetHeight; el.style.animation = "shake .3s ease"; }
    });
    return;
  }
  // Validation code postal
  if (!/^\d{5}$/.test(cp)) {
    showToast("⚠️ Code postal invalide (5 chiffres)");
    const el = document.getElementById("dlv_cp");
    if (el) { el.style.borderColor = "#ff4757"; el.focus(); }
    return;
  }
  // Validation téléphone (format FR)
  const telClean = tel.replace(/[\s\-\.\(\)]/g, "");
  if (!/^(\+33|0033|0)[1-9]\d{8}$/.test(telClean)) {
    showToast("⚠️ Numéro de téléphone invalide");
    const el = document.getElementById("dlv_tel");
    if (el) { el.style.borderColor = "#ff4757"; el.focus(); }
    return;
  }

  const btn = document.getElementById("dlvSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Envoi en cours..."; btn.style.opacity = ".7"; }

  const user       = tg.initDataUnsafe?.user;
  const username   = user?.username ? `@${user.username}` : (user?.first_name || "client");
  const telegramId = user?.id || null;
  const total      = getTotal();
  const livraison  = getLivraison();
  const orderId    = "CMD-" + Date.now().toString().slice(-6);

  const livraison_info = { prenom, nom, adresse, cp, ville, tel, note: note || null };

  const order = {
    id: orderId,
    telegram_user: username,
    telegram_id: telegramId,
    items:    cart.map(i => ({ name: i.name, gout: i.gout||null, qty: i.qty, price: i.price })),
    total:    parseFloat(total.toFixed(2)),
    livraison:parseFloat(livraison.toFixed(2)),
    status:   "nouveau",
    livraison_info,
  };

  try {
    await sbPost("orders", order);

    // Stock géré dans le dashboard (déduit au statut "payé", remis si "annulé")

    // ── Construire le message pour @Willy ──
    const cartSnapshot = [...cart]; // snapshot avant de vider le panier
    const msg = encodeURIComponent(
`🛒 NOUVELLE COMMANDE — ${orderId}

👤 Client : ${username}
📱 Tél : ${tel}
📦 ${prenom} ${nom}
${adresse}, ${cp} ${ville}${note ? `\n📝 ${note}` : ""}

${cartSnapshot.map(i=>`• ${i.name}${i.gout?` (${i.gout})`:""} ×${i.qty} — ${(i.price*i.qty).toFixed(2).replace(".",",")} €`).join("\n")}

💰 Total : ${(total+livraison).toFixed(2).replace(".",",")} €${livraison===0?" (livraison offerte)":""}
`);

    // ── Envoyer récap au client via le bot EN PREMIER ──
    if (telegramId) {
      const recap =
`✅ *Commande confirmée !*

🧾 *${orderId}*
${cartSnapshot.map(i=>`• ${i.name}${i.gout?` (${i.gout})`:""} ×${i.qty} — ${(i.price*i.qty).toFixed(2).replace(".",",")} €`).join("\n")}

📦 *Livraison :*
${prenom} ${nom}
${adresse}, ${cp} ${ville}${note ? `\n📝 ${note}` : ""}
📱 ${tel}

💰 Total : *${(total+livraison).toFixed(2).replace(".",",")} €*${livraison===0?" _(livraison offerte)_":""}

On vous recontacte très vite pour confirmer l'expédition. Merci ! 🙏`;

      const botR = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramId, text: recap, parse_mode: "Markdown" }),
      });
      const botData = await botR.json();
      const tgMessageId = botData?.result?.message_id || null;

      // Sauvegarder dans bot_messages pour l'afficher dans le dashboard
      await fetch(`${SUPABASE_URL}/rest/v1/bot_messages`, {
        method: "POST",
        headers: { ...SB_HEADERS, "Prefer": "return=minimal" },
        body: JSON.stringify({
          telegram_id: telegramId,
          direction: "out",
          text: `🧾 Récap commande ${orderId}`,
          tg_message_id: tgMessageId,
        }),
      });
    }

    closeDeliveryForm();
    cart = [];
    saveCart(); // Vider le panier sauvegardé
    updateCartBadge();
    renderCart();
    tg.HapticFeedback.impactOccurred("heavy");
    tg.openLink(`https://t.me/wilIIly?text=${msg}`, { try_instant_view: false });

  } catch(e) {
    console.error(e);
    showToast("❌ Erreur lors de l'envoi, réessayez.");
    const btn = document.getElementById("dlvSubmitBtn");
    if (btn) { btn.disabled = false; btn.textContent = "ENVOYER MA COMMANDE SUR TELEGRAM →"; btn.style.opacity = "1"; }
  }
}

function checkout() {
  if (cart.length === 0) return showToast("Votre panier est vide");
  showDeliveryForm();
}

// ── TOAST ─────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// ── FALLBACK (si Supabase indispo) ────────────────
const FALLBACK_PRODUCTS = [
  {id:1,cat:"puff",emoji:"💨",name:"Elf Bar 600",price:3.50,unit:"/ unité",min_qty:10,badge:"top",stock:1200,image_url:"",video_url:"",
   gouts:["Mix Fruits","Fraise Kiwi","Pastèque Glace","Menthe","Mangue","Pêche Glace"]},
  {id:2,cat:"puff",emoji:"🌟",name:"Vozol Star 6000",price:5.20,unit:"/ unité",min_qty:10,badge:"promo",stock:800,image_url:"",video_url:"",
   gouts:["Citron Givré","Mangue Glacée","Pastèque Menthe","Raisin Glace","Fraise"]},
  {id:7,cat:"recharge",emoji:"🔋",name:"Pack Recharge USB-C ×50",price:18.00,unit:"/ pack",min_qty:1,badge:"new",stock:200,image_url:"",video_url:"",gouts:[]},
  {id:9,cat:"accessoire",emoji:"🏷️",name:"Présentoir de comptoir",price:12.00,unit:"/ unité",min_qty:1,badge:null,stock:80,image_url:"",video_url:"",gouts:[]},
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
