// public/js/cart.js
(() => {
  const modal    = $('#cart-modal');
  const backdrop = $('#cart-backdrop');
  const content  = $('#cart-content');
  const totalEl  = $('#cart-total');

  if (!modal || !backdrop) return; // página sem modal

  async function loadCart() {
    if (!content || !totalEl) return;
    const res  = await fetch('/cart/json');
    const cart = res.ok ? await res.json() : { items:[], totalQty:0, totalPrice:0 };

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
        const name = it?.meta?.cardName || it.cardId;
        const vend = it?.meta?.sellerName || it.vendorId;
        const cond = it?.meta?.condition ? ` • ${it.meta.condition}` : '';
        const line = (it.qty * it.price).toFixed(2);
        return `
          <div class="cart-row" data-key="${it.key}">
            <div class="cart-left">
              ${img}
              <div class="cart-info">
                <div class="cart-title">${name}</div>
                <div class="cart-sub">Vendedor: ${vend}${cond}</div>
              </div>
            </div>
            <div class="cart-right">
              <div class="cart-price">R$ ${it.price.toFixed(2)}</div>
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

    setCartBadge(cart.totalQty);
  }

  function openCart(){
    modal.removeAttribute('hidden');
    backdrop.removeAttribute('hidden');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    loadCart();
  }
  function closeCart(){
    modal.setAttribute('hidden','');
    backdrop.setAttribute('hidden','');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  // binds
  $('#floating-cart-button')?.addEventListener('click', e => { e.preventDefault(); openCart(); });
  $('#cart-close-btn')?.addEventListener('click', closeCart);
  backdrop.addEventListener('click', closeCart);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

  $('#cart-clear-btn')?.addEventListener('click', async e => {
    e.preventDefault(); await fetch('/cart/clear',{method:'POST'}); loadCart();
  });

  content?.addEventListener('click', async ev => {
    const row = ev.target.closest('.cart-row'); if (!row) return;
    const key = row.dataset.key;

    if (ev.target.closest('.qty-btn.minus') || ev.target.closest('.qty-btn.plus')) {
      const input = row.querySelector('.qty-input');
      let val = parseInt(input.value||'1',10);
      if (ev.target.closest('.qty-btn.minus')) val = Math.max(1, val-1);
      if (ev.target.closest('.qty-btn.plus'))  val = Math.max(1, val+1);
      input.value = String(val);
      await fetch('/cart/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,qty:val})});
      loadCart();
    }
    if (ev.target.closest('.cart-remove')) {
      await fetch('/cart/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});
      loadCart();
    }
  });

  content?.addEventListener('change', async ev => {
    const input = ev.target.closest('.qty-input'); if (!input) return;
    const row = ev.target.closest('.cart-row');  const key = row?.dataset?.key;
    const val = Math.max(1, parseInt(input.value||'1',10));
    input.value = String(val);
    if (key) {
      await fetch('/cart/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,qty:val})});
      loadCart();
    }
  });

  // expõe para outros arquivos poderem “recarregar se aberto”
  window.refreshCartIfOpen = () => {
    if (!modal.hasAttribute('hidden')) loadCart();
  };
})();
