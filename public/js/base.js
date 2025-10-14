// public/js/base.js
window.$  = (sel, root=document) => root.querySelector(sel);
window.$$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

window.money = n => 'R$ ' + Number(n||0).toFixed(2);

// Atualiza badge do carrinho (use de qualquer arquivo)
window.setCartBadge = (count=0) => {
  const badge = $('#floating-cart-button .badge');
  if (!badge) return;
  const c = Number(count||0);
  badge.textContent = String(c);
  badge.classList.toggle('hidden', c <= 0);
};
