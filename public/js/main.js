/* ========================================================================
   Helpers DOM — definidos uma única vez
========================================================================= */
(function () {
  if (!window.__domHelpers__) {
    window.__domHelpers__ = true;
    window.qs  = (sel, root = document) => root.querySelector(sel);
    window.qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  }
})();
const qs  = window.qs;
const qsa = window.qsa;
const money = (n) => 'R$ ' + Number(n || 0).toFixed(2);

/* ========================================================================
   UI GLOBAL
========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Dropdown do usuário
  const userDropdown = qs('.user-dropdown');
  if (userDropdown) {
    const toggle = userDropdown.querySelector('.dropdown-toggle');
    toggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('active');
    });
  }

  // Fecha dropdown quando clica fora
  window.addEventListener('click', (e) => {
    const dd = qs('.user-dropdown.active');
    if (dd && !dd.contains(e.target)) dd.classList.remove('active');
  });

  // + Lista (em cards) e qty +/- genéricos
  document.body.addEventListener('click', (event) => {
    // qty +/- em qualquer .quantity-selector
    if (event.target.classList.contains('quantity-btn')) {
      const btn = event.target;
      const wrap = btn.closest('.quantity-selector');
      const input = wrap?.querySelector('.quantity-input');
      if (!input) return;
      let val = parseInt(input.value || '1', 10);
      if (btn.classList.contains('plus'))  val = val + 1;
      if (btn.classList.contains('minus')) val = Math.max(1, val - 1);
      input.value = String(val);
    }

    // + Lista (opcional fora da página /lista)
    if (event.target.classList.contains('add-to-list-btn')) {
      event.stopPropagation();
      const btn = event.target;
      const cardItem = btn.closest('.card-item');
      const input = cardItem?.querySelector('.quantity-input');
      const cardId = btn.dataset.cardid;
      const quantity = input ? input.value : 1;

      fetch('/api/list/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, quantity }),
      })
        .then(res => res.json())
        .then(data => {
          if (data?.success) {
            const badge = qs('#floating-list-button .list-item-count');
            if (badge) {
              badge.textContent = data.totalItems;
              badge.classList.toggle('hidden', !data.totalItems || data.totalItems === 0);
            }
            const t = btn.textContent;
            btn.textContent = 'Adicionado!';
            btn.style.backgroundColor = '#28a745';
            setTimeout(() => { btn.textContent = t || '+ Lista'; btn.style.backgroundColor = ''; }, 1200);
          }
        })
        .catch(err => console.error('Erro ao adicionar à lista:', err));
    }
  });
});

/* ========================================================================
   CARRINHO — Modal lateral (abre pelo botão flutuante)
========================================================================= */
(() => {
  if (window.__cartBound) return;
  window.__cartBound = true;

  const fab      = qs('#floating-cart-button');
  const modal    = qs('#cart-modal');
  const backdrop = qs('#cart-backdrop');
  const content  = qs('#cart-content');
  const totalEl  = qs('#cart-total');
  const closeBtn = qs('#cart-close-btn');
  const clearBtn = qs('#cart-clear-btn');

  if (!modal || !backdrop) return; // página sem modal, ignore

  let lastFocus;

  async function loadCart() {
    if (!content || !totalEl) return;
    try {
      const res  = await fetch('/cart/json', { headers: { 'Accept': 'application/json' } });
      const cart = res.ok ? await res.json() : { items: [], totalQty: 0, totalPrice: 0 };

      if (!cart.items?.length) {
        content.innerHTML = `
          <div class="cart-empty">
            <p>Seu carrinho está vazio.</p>
            <a href="/cards" class="btn btn-primary">Explorar cartas</a>
          </div>`;
        totalEl.textContent = money(0);
      } else {
        content.innerHTML = cart.items.map(it => {
          const img  = it?.meta?.imageUrl ? `<img src="${it.meta.imageUrl}" class="cart-thumb" alt="">` : '';
          const name = (it?.meta?.cardName || '').trim() || 'Carta';

          // oculta ids tipo ObjectId quando faltar meta de vendedor
          const vendRaw = (it?.meta?.sellerName || it.vendorId || '').trim();
          const vend = /^[a-f0-9]{24}$/i.test(vendRaw) ? '' : vendRaw;

          const cond = it?.meta?.condition ? ` • ${it.meta.condition}` : '';
          const line = (it.qty * it.price).toFixed(2);
          return `
            <div class="cart-row" data-key="${it.key}">
              <div class="cart-left">
                ${img}
                <div class="cart-info">
                  <div class="cart-title">${name}</div>
                  <div class="cart-sub">${vend ? `Vendedor: ${vend}` : ''}${cond}</div>
                </div>
              </div>
              <div class="cart-right">
                <div class="cart-price">R$ ${Number(it.price || 0).toFixed(2)}</div>
                <div class="qty-box">
                  <button class="qty-btn minus" type="button">−</button>
                  <input class="qty-input" type="number" min="1" value="${it.qty}">
                  <button class="qty-btn plus" type="button">+</button>
                </div>
                <div class="cart-line-total">R$ ${line}</div>
                <button class="btn icon-only cart-remove" title="Remover">✕</button>
              </div>
            </div>`;
        }).join('');
        totalEl.textContent = money(cart.totalPrice);
      }

      // badge no FAB
      const badge = qs('#floating-cart-button .badge');
      if (badge) {
        const c = Number(cart.totalQty || 0);
        badge.textContent = String(c);
        badge.classList.toggle('hidden', c <= 0);
      }
    } catch (err) {
      console.error('[cart] loadCart error:', err);
      if (content) content.innerHTML = '<div class="cart-empty"><p>Não foi possível carregar o carrinho.</p></div>';
      if (totalEl) totalEl.textContent = money(0);
    }
  }

  function openCart(e) {
    e?.preventDefault?.();
    lastFocus = document.activeElement;

    modal.removeAttribute('hidden');
    backdrop.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    (qs('#cart-close-btn', modal) || modal).focus?.();
    loadCart();
  }

  function closeCart() {
    if (modal.contains(document.activeElement)) document.activeElement.blur();

    modal.setAttribute('hidden', '');
    backdrop.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    lastFocus?.focus?.();
  }

  fab?.setAttribute('href', '#');
  fab?.addEventListener('click', openCart);
  backdrop?.addEventListener('click', closeCart);
  closeBtn?.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });

  clearBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/cart/clear', { method:'POST' });
    loadCart();
  });

  content?.addEventListener('click', async (ev) => {
    const row = ev.target.closest('.cart-row'); if (!row) return;
    const key = row.dataset.key;

    if (ev.target.closest('.qty-btn.minus') || ev.target.closest('.qty-btn.plus')) {
      const input = row.querySelector('.qty-input'); if (!input) return;
      let val = parseInt(input.value || '1', 10);
      if (ev.target.closest('.qty-btn.minus')) val = Math.max(1, val - 1);
      if (ev.target.closest('.qty-btn.plus'))  val = Math.max(1, val + 1);
      input.value = String(val);
      await fetch('/cart/update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, qty: val }) });
      loadCart();
    }

    if (ev.target.closest('.cart-remove')) {
      await fetch('/cart/remove', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key }) });
      loadCart();
    }
  });

  content?.addEventListener('change', async (ev) => {
    const input = ev.target.closest('.qty-input'); if (!input) return;
    const row = ev.target.closest('.cart-row');   if (!row) return;
    const key = row.dataset.key;
    const val = Math.max(1, parseInt(input.value || '1', 10));
    input.value = String(val);
    await fetch('/cart/update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key, qty: val }) });
    loadCart();
  });

  // expõe compat
  window.refreshCartIfOpen = () => { if (!modal.hasAttribute('hidden')) loadCart(); };
})();

/* ========================================================================
   LISTA — Toggle "Ver vendedores" por delegation (robusto)
========================================================================= */
(function () {
  // limite à página da lista
  const root = document.querySelector('.want-list-container') || document;

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-sellers-btn, [data-toggle="sellers"]');
    if (!btn || !root.contains(btn)) return;

    e.preventDefault();
    e.stopPropagation();

    // 1) tenta via aria-controls / data-target
    let id = btn.getAttribute('aria-controls') || btn.dataset.target;
    let panel = id ? document.getElementById(id) : null;

    // 2) fallback: painel dentro do mesmo card
    if (!panel) {
      const card = btn.closest('.want-list-item, .card-row, .card-item, .list-card') || root;
      panel = card.querySelector(':scope > .sellers-panel') || card.querySelector('.sellers-panel');
    }
    if (!panel) {
      console.warn('[sellers] painel não encontrado para o botão:', btn);
      return;
    }

    // 3) estado atual
    const isHiddenAttr = panel.hasAttribute('hidden');
    const isHiddenCss  = getComputedStyle(panel).display === 'none' || panel.classList.contains('hidden');
    const willOpen = isHiddenAttr || isHiddenCss;

    if (willOpen) {
      panel.removeAttribute('hidden');
      panel.style.display = 'block';
      panel.classList.add('open');
      btn.innerHTML = 'Ocultar vendedores ▴';
      // injeta controles
      window.enhanceVendorRows?.(panel);
    } else {
      panel.setAttribute('hidden', '');
      panel.style.display = 'none';
      panel.classList.remove('open');
      btn.innerHTML = 'Ver vendedores ▾';
    }
  });
})();

/* ========================================================================
   LISTA — Injeta [−][qty][+] + Adicionar em cada .vendor-row
   (agora envia 'meta' junto ao /cart/add)
========================================================================= */
(function () {
  window.enhanceVendorRows = function enhanceVendorRows(scope = document) {
    const rows = Array.from(scope.querySelectorAll('.vendor-row'));
    if (!rows.length) return;

    rows.forEach(row => {
      if (row.__enhanced) return;

      // dados
      const cardId   = row.dataset.cardid   || '';
      const vendorId = row.dataset.vendorid || '';
      let   price    = Number(row.dataset.price || 0);
      const max      = Math.max(1, Number(row.dataset.available || 99));

      // fallback de preço pelo texto
      if (!price) {
        const priceCell = row.querySelector('.js-price-cell, .price');
        if (priceCell) {
          const txt = priceCell.textContent.replace(/[^\d,.,-]/g, '').replace('.', '').replace(',', '.');
          const n = parseFloat(txt);
          if (!Number.isNaN(n)) price = n;
        }
      }

      // destino: .action-cell (ou cria)
      let actionCell = row.querySelector('.action-cell');
      if (!actionCell) {
        actionCell = document.createElement('span');
        actionCell.className = 'right action-cell';
        row.appendChild(actionCell);
      }

      if (actionCell.querySelector('.vendor-actions')) {
        row.__enhanced = true;
        return;
      }

      // UI
      const wrap = document.createElement('div');
      wrap.className = 'vendor-actions';

      const qtyBox = document.createElement('div');
      qtyBox.className = 'qty-box';

      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'qty-btn minus';
      minus.textContent = '−';

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'qty-input';
      input.min = '1';
      input.max = String(max);
      input.value = '1';

      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'qty-btn plus';
      plus.textContent = '+';

      qtyBox.append(minus, input, plus);

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn btn-primary add-cart';
      addBtn.textContent = 'Adicionar';

      wrap.append(qtyBox, addBtn);
      actionCell.appendChild(wrap);

      // qty
      minus.addEventListener('click', () => {
        input.value = String(Math.max(1, (parseInt(input.value || '1', 10) - 1)));
      });
      plus.addEventListener('click', () => {
        input.value = String(Math.min(max, (parseInt(input.value || '1', 10) + 1)));
      });

      // ===== add to cart (com META) =====
      addBtn.addEventListener('click', async () => {
        const qty = Math.max(1, Math.min(max, parseInt(input.value || '1', 10)));

        // Puxa infos do DOM para preencher meta
        const cardEl   = row.closest('.list-card, .want-list-item, .card-item');
        const cardName = cardEl?.querySelector('.card-title')?.textContent?.trim()
                      || cardEl?.querySelector('.summary-info h3')?.textContent?.trim()
                      || '';
        const imageUrl = cardEl?.querySelector('.card-thumb, .summary-img, img')?.src || '';

        // Em nossa tabela: 1º span = vendedor, 2º = condição, 3º = idioma, 4º = disp.
        const sellerName = row.querySelector('.seller-name')?.childNodes?.[0]?.textContent?.trim()
                        || row.querySelector('.seller-name')?.textContent?.trim()
                        || '';
        const conditionLabel = (row.children?.[1]?.textContent || '').trim();
        const languageLabel  = (row.children?.[2]?.textContent || '').trim();
        const availableLabel = (row.children?.[3]?.textContent || '').trim();

        const body = {
          cardId,
          vendorId,
          price,
          qty,
          meta: {
            cardName,
            imageUrl,
            sellerName,
            condition: conditionLabel,
            language: languageLabel,
            available: availableLabel
          }
        };

        const old = addBtn.textContent;
        addBtn.disabled = true;
        addBtn.textContent = 'Adicionando…';
        try {
          const res  = await fetch('/cart/add', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify(body)
          });
          const data = res.ok ? await res.json() : { count:0 };

          const badge = qs('#floating-cart-button .badge');
          if (badge) {
            const c = Number(data.count || 0);
            badge.textContent = String(c);
            badge.classList.toggle('hidden', c <= 0);
          }

          // se o modal estiver aberto, recarrega
          window.refreshCartIfOpen?.();

          addBtn.textContent = 'Adicionado ✓';
          setTimeout(() => { addBtn.textContent = old; addBtn.disabled = false; }, 900);
        } catch (err) {
          console.error('[cart/add] erro:', err);
          addBtn.textContent = 'Falhou';
          setTimeout(() => { addBtn.textContent = old; addBtn.disabled = false; }, 900);
        }
      });

      row.__enhanced = true;
    });
  };

  // chama para painéis abertos por SSR
  qsa('.sellers-panel:not([hidden])').forEach(p => window.enhanceVendorRows(p));

  // observa abertura de gavetas
  const obs = new MutationObserver(muts => {
    muts.forEach(m => {
      const el = m.target;
      if (!(el instanceof Element)) return;
      if (!el.classList?.contains('sellers-panel')) return;
      const isOpen = !el.hasAttribute('hidden') || el.classList.contains('open');
      if (isOpen) window.enhanceVendorRows(el);
    });
  });
  qsa('.sellers-panel').forEach(p => obs.observe(p, { attributes:true, attributeFilter:['hidden','class'] }));
})();

/* ========================================================================
   LISTA — Remover item + Filtros (recarrega vendedores)
========================================================================= */
(() => {
  const root = qs('.want-list-container') || document;

  // remover item
  root.addEventListener('click', (event) => {
    if (!event.target.classList.contains('remove-from-list-btn') && !event.target.closest('.remove-item')) return;
    const btn = event.target.closest('.remove-from-list-btn, .remove-item');
    const cardId = btn?.dataset.cardid || btn?.dataset.remove;
    const row = btn?.closest('.want-list-item, .list-card');
    if (!cardId || !row) return;

    if (confirm('Tem certeza que deseja remover esta carta da lista?')) {
      fetch('/api/list/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId })
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.message || 'Falha ao remover');
          row.remove();
        })
        .catch(err => alert(`Erro ao remover item: ${err.message}`));
    }
  });

  // filtros (se sua rota existir)
  root.addEventListener('change', async (event) => {
    if (!event.target.classList.contains('filter-select')) return;

    const panel = event.target.closest('.sellers-panel');
    const listingsContainer = panel?.querySelector('.sellers-body');
    const cardId = panel?.closest('[data-card-id]')?.dataset.cardId;
    if (!panel || !listingsContainer || !cardId) return;

    const filters = {};
    panel.querySelectorAll('.filter-select').forEach(s => {
      if (s.value) filters[s.dataset.filter] = s.value;
    });

    listingsContainer.innerHTML = '<div class="no-sellers">Atualizando…</div>';

    try {
      const response = await fetch('/api/list/filter-sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, filters })
      });
      const listings = await response.json();

      if (Array.isArray(listings) && listings.length) {
        listingsContainer.innerHTML = listings.map(v => {
          const available  = v.availableQty || v.quantity || 0;
          const price      = Number(v.price || 0);
          const vendorId   = v.vendorId || v._id || v.sellerId || v.seller || '';
          const sellerName = v.sellerName || (v.seller && (v.seller.username || v.seller.name)) || v.seller || 'Vendedor';
          const condLabel  = v.conditionLabel || v.condition || '—';
          const langLabel  = v.languageLabel  || v.language  || '—';
          const isShop     = v.seller && v.seller.accountType === 'shop';

          return `
            <div class="seller-row vendor-row"
                 data-cardid="${cardId}"
                 data-vendorid="${vendorId}"
                 data-price="${price}"
                 data-available="${available}">
              <span class="seller-name">${sellerName} ${isShop ? '<span class="shop-badge">LOJA</span>' : ''}</span>
              <span>${condLabel}</span>
              <span>${langLabel}</span>
              <span>${available}</span>
              <span class="right price js-price-cell">R$ ${price.toFixed(2)}</span>
              <span class="right qty-col"></span>
              <span class="right action-cell"></span>
            </div>`;
        }).join('');
        // injeta controles nas novas linhas
        window.enhanceVendorRows?.(panel);
      } else {
        listingsContainer.innerHTML = '<div class="no-sellers">Nenhum anúncio encontrado com estes filtros.</div>';
      }
    } catch (error) {
      console.error('Erro ao atualizar vendedores:', error);
      listingsContainer.innerHTML = '<div class="no-sellers">Erro ao carregar vendedores.</div>';
    }
  });
})();

/* ========================================================================
   MODAL — Adicionar cartas (busca)
========================================================================= */
(() => {
  const openBtn  = qs('#add-more-cards-btn');
  const modal    = qs('#add-card-modal');
  const closeBtn = modal?.querySelector('.modal-close-btn');
  const input    = modal?.querySelector('#modal-search-input');
  const results  = modal?.querySelector('#modal-search-results');
  if (!modal) return;

  function open()  { modal.classList.add('active'); input?.focus(); }
  function close() { modal.classList.remove('active'); }

  openBtn?.addEventListener('click', (e) => { e.preventDefault(); open(); });
  closeBtn?.addEventListener('click', close);
  modal?.addEventListener('click', (e) => { if (e.target === modal) close(); });

  let timer;
  input?.addEventListener('input', () => {
    clearTimeout(timer);
    const q = (input.value || '').trim();
    timer = setTimeout(async () => {
      if (!q) { if (results) results.innerHTML = ''; return; }
      const res   = await fetch(`/api/cards/search-available?q=${encodeURIComponent(q)}`);
      const cards = res.ok ? await res.json() : [];
      if (!results) return;
      results.innerHTML = '';
      cards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'search-result-item';
        el.innerHTML = `
          <img src="${card.image_url}" alt="${card.name}">
          <div><h4>${card.name}</h4><p>${card.set_name || 'N/A'}</p></div>
          <button class="btn-primary add-from-modal-btn" data-cardid="${card._id}">+ Lista</button>`;
        results.appendChild(el);
      });
    }, 300);
  });

  results?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.add-from-modal-btn'); if (!btn) return;
    const cardId = btn.dataset.cardid;
    const res = await fetch('/api/list/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, quantity: 1 })
    });
    if (res.ok) location.reload();
    else alert('Não foi possível adicionar a carta.');
  });
})();
