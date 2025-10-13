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

