// public/js/search.js
(() => {
  const openBtn  = document.getElementById('open-add-card-modal');
  const modal    = document.getElementById('add-card-modal');
  const closeBtn = document.getElementById('add-card-close');
  const input    = document.getElementById('add-card-search-input');
  const results  = document.getElementById('add-card-results');

  if (!modal) return;

  function open(){ modal.classList.add('active'); input?.focus(); }
  function close(){ modal.classList.remove('active'); }

  openBtn?.addEventListener('click', e=>{ e.preventDefault(); open(); });
  closeBtn?.addEventListener('click', close);
  modal?.addEventListener('click', e=>{ if (e.target === modal) close(); });

  // busca
  let timer;
  input?.addEventListener('input', ()=>{
    clearTimeout(timer);
    const q = input.value.trim();
    timer = setTimeout(async ()=>{
      if (!q){ results.innerHTML=''; return; }
      const res = await fetch(`/api/cards/search-available?q=${encodeURIComponent(q)}`);
      const cards = res.ok ? await res.json() : [];
      results.innerHTML = '';
      cards.forEach(card=>{
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

  results?.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.add-from-modal-btn'); if (!btn) return;
    const cardId = btn.dataset.cardid;
    const res = await fetch('/api/list/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cardId, quantity:1})});
    if (res.ok) location.reload(); else alert('Não foi possível adicionar a carta.');
  });
})();
