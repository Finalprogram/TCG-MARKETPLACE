document.addEventListener('DOMContentLoaded', () => {

    // ========================================================================
    // LÓGICA GERAL DO SITE (Componentes Reutilizáveis)
    // ========================================================================

    // --- Lógica do Menu Dropdown de Usuário ---
    const userDropdown = document.querySelector('.user-dropdown');
    if (userDropdown) {
        const toggle = userDropdown.querySelector('.dropdown-toggle');
        toggle.addEventListener('click', (event) => {
            event.stopPropagation(); // Impede que o clique seja capturado pelo 'window' e feche o menu
            userDropdown.classList.toggle('active');
        });
    }

    // --- Lógica de Eventos Globais de Clique (Botões +, -, +Lista) ---
    document.body.addEventListener('click', function(event) {
        // Botão "+ Lista"
        if (event.target.classList.contains('add-to-list-btn')) {
            event.stopPropagation(); // Impede o clique de "borbulhar" para o link pai
            const button = event.target;
            const cardItem = button.closest('.card-item');
            const quantityInput = cardItem.querySelector('.quantity-input');
            const cardId = button.dataset.cardid;
            const quantity = quantityInput ? quantityInput.value : 1;

            fetch('/api/list/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId, quantity }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateFloatingBadge(data.totalItems);
                    button.textContent = 'Adicionado!';
                    button.style.backgroundColor = '#28a745';
                    setTimeout(() => {
                        button.textContent = '+ Lista';
                        button.style.backgroundColor = '';
                    }, 2000);
                }
            })
            .catch(error => console.error('Erro ao adicionar à lista:', error));
        }

        // Botões de quantidade (+ e -)
        if (event.target.classList.contains('quantity-btn')) {
            const button = event.target;
            const controls = button.closest('.quantity-selector');
            const input = controls.querySelector('.quantity-input');
            let currentValue = parseInt(input.value);
            if (button.classList.contains('plus')) {
                input.value = currentValue + 1;
            } else if (button.classList.contains('minus') && currentValue > 1) {
                input.value = currentValue - 1;
            }
        }
    });

    // Função auxiliar para atualizar o contador do ícone flutuante
    function updateFloatingBadge(totalItems) {
        const badge = document.querySelector('#floating-list-button .list-item-count');
        if (badge) {
            badge.textContent = totalItems;
            badge.classList.toggle('hidden', !totalItems || totalItems === 0);
        }
    }

    // ========================================================================
    // LÓGICA DO BOTÃO FLUTUANTE E MODAL DO CARRINHO
    // ========================================================================

    const draggableButton = document.getElementById('floating-cart-button');
    const cartModal = document.getElementById('cart-modal');

    if (draggableButton && cartModal) {
        let isDragging = false;
        let offsetX, offsetY;
        let clickTimeout;

        draggableButton.addEventListener('mousedown', (e) => {
            isDragging = false;
             // VERIFICA SE O BOTÃO TEM A AÇÃO DE ABRIR O MODAL
        if (draggableButton.dataset.action === 'open-cart-modal') {
            // Se sim, impede a navegação padrão do link e abre o modal
            e.preventDefault();
            openCartModal();
        }
            offsetX = e.clientX - draggableButton.getBoundingClientRect().left;
            offsetY = e.clientY - draggableButton.getBoundingClientRect().top;
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            clickTimeout = setTimeout(() => { isDragging = true; }, 150);
        });

        function onMouseMove(e) {
            if (isDragging) {
                draggableButton.style.left = `${e.clientX - offsetX}px`;
                draggableButton.style.top = `${e.clientY - offsetY}px`;
            }
        }

        function onMouseUp() {
            clearTimeout(clickTimeout);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (isDragging) {
                const buttonRect = draggableButton.getBoundingClientRect();
                if ((buttonRect.left + buttonRect.width / 2) < window.innerWidth / 2) {
                    draggableButton.style.left = '30px';
                    draggableButton.style.right = 'auto';
                } else {
                    draggableButton.style.left = 'auto';
                    draggableButton.style.right = '30px';
                }
            }
        }

        // Ação de clique para abrir o modal
        draggableButton.addEventListener('click', () => {
            if (!isDragging) {
                openCartModal();
            }
        });

        const closeBtn = cartModal.querySelector('.modal-close-btn');
        closeBtn.addEventListener('click', () => cartModal.classList.remove('active'));
    }

    async function openCartModal() {
        if (!cartModal) return;
        const cartItemsContainer = document.getElementById('cart-items-container');
        const cartSubtotal = document.getElementById('cart-subtotal');
        
        cartItemsContainer.innerHTML = '<p>Carregando carrinho...</p>';
        cartModal.classList.add('active');

        try {
            const response = await fetch('/api/cart');
            const cartItems = await response.json();
            cartItemsContainer.innerHTML = '';
            let subtotal = 0;

            if (cartItems.length > 0) {
                cartItems.forEach(item => {
                    if (!item.details) return;
                    const itemElement = document.createElement('div');
                    itemElement.classList.add('cart-item-row');
                    itemElement.innerHTML = `
                        <img src="${item.details.card.image_url}" alt="${item.details.card.name}">
                        <div class="cart-item-info">
                            <strong>${item.details.card.name}</strong>
                            <small>Vendido por: ${item.details.seller.username}</small>
                            <small>Qtd: ${item.quantity} | Preço: R$ ${item.details.price.toFixed(2)}</small>
                        </div>
                        <strong class="cart-item-total">R$ ${(item.quantity * item.details.price).toFixed(2)}</strong>
                    `;
                    cartItemsContainer.appendChild(itemElement);
                    subtotal += item.quantity * item.details.price;
                });
            } else {
                cartItemsContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
            }
            cartSubtotal.textContent = `R$ ${subtotal.toFixed(2)}`;
        } catch (error) {
            console.error("Erro ao carregar o carrinho:", error);
            cartItemsContainer.innerHTML = '<p>Não foi possível carregar o carrinho.</p>';
        }
    }


    // ========================================================================
    // LÓGICA ESPECÍFICA DA PÁGINA DA LISTA (/lista)
    // ========================================================================
   
const wantListContainer = document.querySelector('.want-list-container');
if (wantListContainer) {

    // Usamos um único listener para todos os cliques dentro da lista
    wantListContainer.addEventListener('click', async (event) => {
        
        // --- Lógica para Abrir/Fechar a Gaveta ---
        // --- Lógica para Abrir/Fechar a Gaveta (VERSÃO COM DEBUG) ---
const clickableArea = event.target.closest('.card-summary');
if (clickableArea && !event.target.classList.contains('remove-from-list-btn')) {
    
    console.log("1. Área clicável (.card-summary) encontrada!");

    const toggleButton = clickableArea.querySelector('.toggle-sellers-btn');
    console.log("2. Botão 'Ver Vendedores' encontrado:", toggleButton);

    if (toggleButton) {
        const targetId = toggleButton.dataset.target;
        console.log("3. ID da gaveta alvo:", targetId);

        const drawer = document.getElementById(targetId);
        console.log("4. Elemento da gaveta encontrado:", drawer);
        
        if (drawer) {
            console.log("5. Abrindo/Fechando a gaveta!");
            toggleButton.classList.toggle('active');
            drawer.style.display = drawer.style.display === 'block' ? 'none' : 'block';
        }
    }
}
wantListContainer.addEventListener('change', async (event) => {
        if (event.target.classList.contains('item-filter-select')) {
            const selectElement = event.target;
            const cardId = selectElement.dataset.cardid;
            const drawer = selectElement.closest('.sellers-drawer');
            const listingsContainer = drawer.querySelector('.listings-container');

            // Coleta os valores dos filtros
            const filters = {};
            drawer.querySelectorAll('.item-filter-select').forEach(select => {
                if (select.value) {
                    filters[select.dataset.filter] = select.value;
                }
            });

            listingsContainer.innerHTML = '<p style="text-align: center;">Atualizando...</p>';

            try {
                // Chama a API do back-end para buscar os vendedores filtrados
                const response = await fetch('/api/list/filter-sellers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cardId, filters })
                });
                const listings = await response.json();

                listingsContainer.innerHTML = ''; // Limpa a lista antiga

                // ==================================================================
                // ====== É AQUI QUE O CÓDIGO QUE VOCÊ PROCURA ENTRA! ======
                // ==================================================================
                if (listings.length > 0) {
                    listings.forEach(listing => {
                        const listingRow = document.createElement('div');
                        listingRow.classList.add('listing-row');
                        
                        const conditionMap = { 'NM': 'Near Mint', 'LP': 'Lightly Played', 'MP': 'Moderately Played', 'HP': 'Heavily Played', 'D': 'Damaged' };
                        const fullConditionName = conditionMap[listing.condition] || listing.condition;
                        
                        const shopBadge = listing.seller.accountType === 'shop' ? '<span class="shop-badge">LOJA</span>' : '';
                        const foilStatus = listing.is_foil ? 'Foil' : 'Normal';

                        // Reconstrói o HTML para cada vendedor encontrado
                        listingRow.innerHTML = `
                            <div class="seller-info">
                                <strong>${listing.seller.username}</strong>
                                ${shopBadge}
                            </div>
                            <div class="condition-info">
                                <span>${fullConditionName}</span> |
                                <span>${foilStatus}</span>
                            </div>
                            <div class="price-info">
                                <strong>R$ ${listing.price.toFixed(2)}</strong>
                            </div>
                            <div class="add-to-cart-controls">
                                <input type="number" class="quantity-input form-control" value="1" min="1" max="${listing.quantity}">
                                <button class="btn-primary add-final-cart-btn" data-listingid="${listing._id}">+ Carrinho</button>
                            </div>
                        `;
                        listingsContainer.appendChild(listingRow);
                    });
                } else {
                    listingsContainer.innerHTML = '<p class="no-listings">Nenhum anúncio encontrado com estes filtros.</p>';
                }
            } catch (error) {
                console.error('Erro ao atualizar vendedores:', error);
                listingsContainer.innerHTML = '<p class="no-listings">Erro ao carregar vendedores.</p>';
            }
        }
    });

        // --- Lógica para Remover Item da Lista ---
        if (event.target.classList.contains('remove-from-list-btn')) {
            const button = event.target;
            const cardId = button.dataset.cardid;
            const wantListItem = button.closest('.want-list-item');

            if (confirm('Tem certeza que deseja remover esta carta da lista?')) {
                try {
                    const response = await fetch('/api/list/remove', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cardId })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        wantListItem.remove();
                        // (Opcional: atualizar o ícone flutuante)
                        // updateFloatingBadge(data.totalItems); 
                    } else { throw new Error(data.message); }
                } catch (error) {
                    alert(`Erro ao remover item: ${error.message}`);
                }
            }
        }
    }); 
}

    // ============================================
    // LÓGICA DOS OUTROS MODAIS (Pop-ups)
    // ========================================================================

    // --- Lógica do Modal de Adicionar Cartas (/lista) ---
    const addMoreCardsBtn = document.getElementById('add-more-cards-btn');
    const addCardModal = document.getElementById('add-card-modal');
     if (addMoreCardsBtn && addCardModal) {
        const closeModalBtn = addCardModal.querySelector('.modal-close-btn');
        const searchInput = addCardModal.querySelector('#modal-search-input');
        const searchResults = addCardModal.querySelector('#modal-search-results');
        let debounceTimer;

        // Abrir o modal
        addMoreCardsBtn.addEventListener('click', () => {
            addCardModal.classList.add('active');
            searchInput.focus();
        });

        // Lógica de busca com debounce
        searchInput.addEventListener('input', (event) => {
            clearTimeout(debounceTimer);
            const query = event.target.value;
            if (query.length < 3) {
                searchResults.innerHTML = '';
                return;
            }
            debounceTimer = setTimeout(async () => {
                // Usa a nova rota que busca apenas cartas com anúncios
                const response = await fetch(`/api/cards/search-available?q=${query}`); 
                const cards = await response.json();
                searchResults.innerHTML = '';
                cards.forEach(card => {
                    const cardElement = document.createElement('div');
                    cardElement.classList.add('search-result-item');
                    cardElement.innerHTML = `
                        <img src="${card.image_url}" alt="${card.name}">
                        <div><h4>${card.name}</h4><p>${card.set_name || 'N/A'}</p></div>
                        <button class="btn-primary add-from-modal-btn" data-cardid="${card._id}">+ Lista</button>
                    `;
                    searchResults.appendChild(cardElement);
                });
            }, 300);
        });

        // Lógica para adicionar à lista a partir do modal
        searchResults.addEventListener('click', async (event) => {
            if (event.target.classList.contains('add-from-modal-btn')) {
                const cardId = event.target.dataset.cardid;
                const response = await fetch('/api/list/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cardId, quantity: 1 })
                });

                if (response.ok) {
                    window.location.reload(); // Recarrega a página para mostrar a nova carta
                } else {
                    alert('Não foi possível adicionar a carta.');
                }
            }
        });

        // Fechar o modal
        closeModalBtn.addEventListener('click', () => addCardModal.classList.remove('active'));
    }
});

// --- LÓGICA GLOBAL PARA FECHAR MENUS E MODAIS ---
window.addEventListener('click', (event) => {
    // Fecha dropdown de usuário
    const userDropdown = document.querySelector('.user-dropdown.active');
    if (userDropdown && !userDropdown.contains(event.target)) {
        userDropdown.classList.remove('active');
    }

    // Fecha modais ao clicar no fundo escuro
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal && event.target === activeModal) {
        activeModal.classList.remove('active');
    }
});

/* === TCG List Enhancer – bloco seguro para colar no final do main.js === */
(() => {
  // Pequenos utilitários locais (sem poluir o global)
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const $  = (sel, root = document) => root.querySelector(sel);

  // Evita executar duas vezes se importar/concatenar o arquivo mais de uma vez
  if (window.__tcgListEnhancerLoaded) return;
  window.__tcgListEnhancerLoaded = true;

  // ---- 1) Toggle "Ver vendedores" <-> "Ocultar vendedores"
  function bindSellerToggles(scope = document) {
    $$('[data-toggle="sellers"]', scope).forEach(btn => {
      if (btn.__tcgBound) return;
      btn.__tcgBound = true;

      btn.addEventListener('click', () => {
        const id = btn.getAttribute('aria-controls');
        if (!id) return;
        const panel = document.getElementById(id);
        if (!panel) return;

        const hidden = panel.hasAttribute('hidden');
        if (hidden) {
          panel.removeAttribute('hidden');
          btn.textContent = 'Ocultar vendedores ▴';
          // ao abrir, garante que as linhas terão os controles
          enhanceVendorRows(panel);
        } else {
          panel.setAttribute('hidden', '');
          btn.textContent = 'Ver vendedores ▾';
        }
      });
    });
  }

  // ---- 2) Injeta [qty +/-] + [Adicionar] após a célula de preço (.js-price-cell)
  function enhanceVendorRows(scope = document) {
    $$('.vendor-row', scope).forEach(row => {
      if (row.__tcgEnhanced) return;
      row.__tcgEnhanced = true;

      const priceCell = $('.js-price-cell', row) || row;
      const price = Number(row.dataset.price || 0);
      const max = Math.max(1, Number(row.dataset.available || 99));
      const cardId = row.dataset.cardid || '';
      const vendorId = row.dataset.vendorid || '';

      // container de ações
      const actions = document.createElement('span');
      actions.className = 'vendor-actions';
      actions.style.display = 'inline-flex';
      actions.style.alignItems = 'center';
      actions.style.gap = '8px';
      actions.style.marginLeft = '8px';

      // caixa de quantidade
      const qtyBox = document.createElement('div');
      qtyBox.className = 'qty-box';
      qtyBox.style.display = 'inline-flex';
      qtyBox.style.alignItems = 'center';
      qtyBox.style.border = '1px solid rgba(255,255,255,.18)';
      qtyBox.style.borderRadius = '10px';
      qtyBox.style.overflow = 'hidden';

      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'qty-btn minus';
      minus.textContent = '−';
      minus.style.width = '30px';
      minus.style.height = '32px';
      minus.style.border = 'none';
      minus.style.cursor = 'pointer';

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'qty-input';
      input.value = '1';
      input.min = '1';
      input.max = String(max);
      input.style.width = '52px';
      input.style.height = '32px';
      input.style.border = 'none';
      input.style.textAlign = 'center';

      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'qty-btn plus';
      plus.textContent = '+';
      plus.style.width = '30px';
      plus.style.height = '32px';
      plus.style.border = 'none';
      plus.style.cursor = 'pointer';

      qtyBox.append(minus, input, plus);

      // botão adicionar
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary add-cart';
      addBtn.textContent = 'Adicionar';
      addBtn.dataset.cardid = cardId;
      addBtn.dataset.vendorid = vendorId;
      addBtn.dataset.price = String(price);
      addBtn.dataset.max = String(max);

      actions.append(qtyBox, addBtn);

      // injeta controles logo após a célula de preço
      priceCell.after(actions);

      // listeners locais de quantidade
      minus.addEventListener('click', () => {
        const v = Math.max(1, (parseInt(input.value || '1', 10) - 1));
        input.value = String(v);
      });
      plus.addEventListener('click', () => {
        const v = Math.min(max, (parseInt(input.value || '1', 10) + 1));
        input.value = String(v);
      });

      // adicionar ao carrinho (AJAX -> /cart/add)
      addBtn.addEventListener('click', async () => {
        const qty = Math.max(1, Math.min(max, parseInt(input.value || '1', 10)));
        const body = {
          cardId: addBtn.dataset.cardid,
          vendorId: addBtn.dataset.vendorid,
          price: Number(addBtn.dataset.price),
          qty
        };

        const original = addBtn.textContent;
        addBtn.disabled = true;
        try {
          const res = await fetch('/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (!res.ok) throw new Error('Erro ao adicionar');
          addBtn.textContent = 'Adicionado ✓';
          setTimeout(() => { addBtn.textContent = original; addBtn.disabled = false; }, 1200);
        } catch (e) {
          console.error(e);
          addBtn.textContent = 'Falhou';
          setTimeout(() => { addBtn.textContent = original; addBtn.disabled = false; }, 1200);
        }
      });
    });
  }

  // ---- 3) Remover item da lista (se existir botão com .remove-item e data-remove)
  function bindRemoveFromList(scope = document) {
    $$('.remove-item', scope).forEach(btn => {
      if (btn.__tcgBound) return;
      btn.__tcgBound = true;

      btn.addEventListener('click', async () => {
        const id = btn.dataset.remove;
        if (!id) return;
        try {
          const res = await fetch(`/lista/remove/${id}`, { method: 'POST' });
          if (res.ok) location.reload();
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  // ---- 4) Inicialização segura (após DOM pronto)
  function init(scope = document) {
    bindSellerToggles(scope);
    bindRemoveFromList(scope);

    // Caso a página já venha com painéis abertos (sem hidden), aprimora linhas
    $$('.sellers-panel:not([hidden])', scope).forEach(p => enhanceVendorRows(p));

    // Seções/abas dinâmicas que trocam de conteúdo? Observe mutações leves:
    if ('MutationObserver' in window) {
      const mo = new MutationObserver(muts => {
        for (const m of muts) {
          if (m.type === 'childList' && (m.addedNodes?.length || m.removedNodes?.length)) {
            // rebind em nós adicionados
            bindSellerToggles(scope);
            bindRemoveFromList(scope);
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document));
  } else {
    init(document);
  }
})();
/// === FAB do carrinho: abre/fecha o modal usando o atributo "hidden" ===
(() => {
  const fab      = document.getElementById('floating-cart-button');
  const modal    = document.getElementById('cart-modal');
  const backdrop = document.getElementById('cart-backdrop');
  const closeBtn = document.getElementById('cart-close-btn');
  const totalEl  = document.getElementById('cart-total');
  const content  = document.getElementById('cart-content');

  // segurança: se a página não tiver o modal, não faz nada
  if (!modal || !backdrop) return;

  async function loadCart() {
    if (!content || !totalEl) return;
    try {
      const res  = await fetch('/cart/json');
      const cart = res.ok ? await res.json() : { items: [], totalPrice: 0, totalQty: 0 };

      if (!cart.items || cart.items.length === 0) {
        content.innerHTML = `
          <div class="cart-empty">
            <p>Seu carrinho está vazio.</p>
            <a href="/cards" class="btn btn-primary">Explorar cartas</a>
          </div>`;
        totalEl.textContent = 'R$ 0,00';
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
        totalEl.textContent = 'R$ ' + Number(cart.totalPrice || 0).toFixed(2);
      }

      // atualiza badge por conferência
      const badge = document.querySelector('#floating-cart-button .badge');
      if (badge) {
        const count = Number((cart && cart.totalQty) || 0);
        badge.textContent = String(count);
        badge.classList.toggle('hidden', count <= 0);
      }
    } catch (e) {
      console.error(e);
      content.innerHTML = '<div class="cart-empty"><p>Não foi possível carregar o carrinho.</p></div>';
      totalEl.textContent = 'R$ 0,00';
    }
  }

 // === Abrir/fechar carrinho com null-safety ===
function openCartModal(ev) {
  ev?.preventDefault?.();

  const modal    = document.getElementById('cart-modal');
  const backdrop = document.getElementById('cart-backdrop');
  const content  = document.getElementById('cart-content');
  const totalEl  = document.getElementById('cart-total');

  // Se o modal não existe nesta página, só avisa e sai
  if (!modal || !backdrop) {
    console.warn('[cart] modal/backdrop não encontrados nesta página.');
    return;
  }

  // Mostra modal (você usa atributo hidden)
  modal.removeAttribute('hidden');
  backdrop.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Carrega dados do carrinho, mas só mexe no DOM se os elementos existem
  (async () => {
    try {
      const res  = await fetch('/cart/json');
      const cart = res.ok ? await res.json() : { items: [], totalQty: 0, totalPrice: 0 };

      if (content && totalEl) {
        if (!cart.items || cart.items.length === 0) {
          content.innerHTML = `
            <div class="cart-empty">
              <p>Seu carrinho está vazio.</p>
              <a href="/cards" class="btn btn-primary">Explorar cartas</a>
            </div>`;
          totalEl.textContent = 'R$ 0,00';
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
          totalEl.textContent = 'R$ ' + Number(cart.totalPrice || 0).toFixed(2);
        }
      }

      // Atualiza badge (se existir)
      const badge = document.querySelector('#floating-cart-button .badge');
      if (badge) {
        const c = Number(cart.totalQty || 0);
        badge.textContent = String(c);
        badge.classList.toggle('hidden', c <= 0);
      }
    } catch (e) {
      console.error(e);
      if (content) content.innerHTML = '<div class="cart-empty"><p>Não foi possível carregar o carrinho.</p></div>';
      if (totalEl) totalEl.textContent = 'R$ 0,00';
    }
  })();
}

function closeCartModal() {
  const modal    = document.getElementById('cart-modal');
  const backdrop = document.getElementById('cart-backdrop');
  if (!modal || !backdrop) return;
  modal.setAttribute('hidden', '');
  backdrop.setAttribute('hidden', '');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// binds (deixa no final do main.js)
document.getElementById('floating-cart-button')?.addEventListener('click', openCartModal);
document.getElementById('cart-backdrop')?.addEventListener('click', closeCartModal);
document.getElementById('cart-close-btn')?.addEventListener('click', closeCartModal);
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeCartModal(); });


  function closeCart() {
    modal.setAttribute('hidden', '');
    backdrop.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // garante que começa fechado ao carregar
  document.addEventListener('DOMContentLoaded', closeCart);

  // abre no clique do botão flutuante (e não navega)
  fab?.setAttribute('href', '#');
  fab?.addEventListener('click', (e) => { e.preventDefault(); openCart(); });

  // fechar
  backdrop.addEventListener('click', closeCart);
  closeBtn?.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });

  // controles internos (opcional, só se já não tiver)
  content?.addEventListener('click', async (ev) => {
    const row = ev.target.closest('.cart-row');
    if (!row) return;
    const key = row.dataset.key;

    if (ev.target.closest('.qty-btn.minus') || ev.target.closest('.qty-btn.plus')) {
      const input = row.querySelector('.qty-input');
      let val = parseInt(input.value || '1', 10);
      if (ev.target.closest('.qty-btn.minus')) val = Math.max(1, val - 1);
      if (ev.target.closest('.qty-btn.plus'))  val = Math.max(1, val + 1);
      input.value = String(val);
      await fetch('/cart/update', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ key, qty: val })
      });
      loadCart();
    }

    if (ev.target.closest('.cart-remove')) {
      await fetch('/cart/remove', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ key })
      });
      loadCart();
    }
  });

  document.getElementById('cart-clear-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/cart/clear', { method:'POST' });
    loadCart();
  });
})();
// === CART MODAL: handler único com null-safety ===
(() => {
  if (window.__cartBound) return;  // evita duplicar listeners se o script carregar duas vezes
  window.__cartBound = true;

  const fab      = document.getElementById('floating-cart-button');
  const modal    = document.getElementById('cart-modal');
  const backdrop = document.getElementById('cart-backdrop');

  const content  = document.getElementById('cart-content'); // pode ser null em algumas páginas
  const totalEl  = document.getElementById('cart-total');

  function money(n){ return 'R$ ' + Number(n || 0).toFixed(2); }

  async function safeLoadCart() {
    // Se a página não tem conteúdo/total, apenas não tenta mexer no DOM
    if (!content || !totalEl) return;
    try {
      const res  = await fetch('/cart/json');
      const cart = res.ok ? await res.json() : { items: [], totalQty: 0, totalPrice: 0 };

      if (!cart.items || cart.items.length === 0) {
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

      // badge (se existir)
      const badge = document.querySelector('#floating-cart-button .badge');
      if (badge) {
        const c = Number(cart.totalQty || 0);
        badge.textContent = String(c);
        badge.classList.toggle('hidden', c <= 0);
      }
    } catch (e) {
      console.error('[cart] load error:', e);
      if (content) content.innerHTML = '<div class="cart-empty"><p>Não foi possível carregar o carrinho.</p></div>';
      if (totalEl) totalEl.textContent = money(0);
    }
  }

  function openCartModal(e){
    e?.preventDefault?.();
    if (!modal || !backdrop) {
      console.warn('[cart] modal/backdrop não encontrados nesta página.');
      return;
    }
    modal.removeAttribute('hidden');
    backdrop.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    safeLoadCart(); // só escreve no DOM se achar os elementos
  }

  function closeCartModal(){
    if (!modal || !backdrop) return;
    modal.setAttribute('hidden', '');
    backdrop.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Garante que o FAB não navega
  fab?.setAttribute('href', '#');
  fab?.addEventListener('click', openCartModal);
  document.getElementById('cart-close-btn')?.addEventListener('click', closeCartModal);
  backdrop?.addEventListener('click', closeCartModal);
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeCartModal(); });
})();
