// public/js/list.js
(() => {
  if (!document.querySelector('.list-page')) return; // só carrega nesta página

  function bindSellerToggles(scope=document){
    $$('[data-toggle="sellers"], .toggle-sellers-btn', scope).forEach(btn=>{
      if (btn.__bound) return; btn.__bound = true;
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('aria-controls') || btn.dataset.target;
        const panel = id && document.getElementById(id); if (!panel) return;
        const hidden = panel.hasAttribute('hidden');
        if (hidden){ panel.removeAttribute('hidden'); btn.innerHTML='Ocultar vendedores ▴'; enhanceVendorRows(panel); }
        else { panel.setAttribute('hidden',''); btn.innerHTML='Ver vendedores ▾'; }
      });
    });
  }

  function enhanceVendorRows(scope=document){
    $$('.vendor-row', scope).forEach(row=>{
      if (row.__enhanced) return; row.__enhanced=true;

      const priceCell = $('.js-price-cell', row) || row;
      const price = Number(row.dataset.price||0);
      const max   = Math.max(1, Number(row.dataset.available||99));
      const cardId   = row.dataset.cardid || '';
      const vendorId = row.dataset.vendorid || '';

      const actions = document.createElement('span'); actions.className='vendor-actions';
      const qtyBox  = document.createElement('div');  qtyBox.className='qty-box';
      const minus   = Object.assign(document.createElement('button'),{className:'qty-btn minus',type:'button',textContent:'−'});
      const input   = Object.assign(document.createElement('input'),{className:'qty-input',type:'number',value:'1',min:'1',max:String(max)});
      const plus    = Object.assign(document.createElement('button'),{className:'qty-btn plus',type:'button',textContent:'+'});
      qtyBox.append(minus,input,plus);

      const addBtn  = Object.assign(document.createElement('button'),{className:'btn btn-primary add-cart',textContent:'Adicionar'});
      addBtn.dataset.cardid = cardId; addBtn.dataset.vendorid = vendorId; addBtn.dataset.price = String(price);

      actions.append(qtyBox, addBtn);
      priceCell.after(actions);

      minus.addEventListener('click',()=> input.value = String(Math.max(1, (+input.value||1)-1)));
      plus.addEventListener('click', ()=> input.value = String(Math.min(max, (+input.value||1)+1)));

      addBtn.addEventListener('click', async ()=>{
        const qty = Math.max(1, Math.min(max, parseInt(input.value||'1',10)));
        const res = await fetch('/cart/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          cardId, vendorId, price, qty
        })});
        const data = res.ok ? await res.json() : {count:0};
        setCartBadge(data.count);
        window.refreshCartIfOpen?.();

        const t = addBtn.textContent; addBtn.textContent='Adicionado ✓'; addBtn.disabled=true;
        setTimeout(()=>{addBtn.textContent=t; addBtn.disabled=false;}, 1200);
      });
    });
  }

  function init(){ bindSellerToggles(document); $$('.sellers-panel:not([hidden])').forEach(p=>enhanceVendorRows(p)); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
