document.addEventListener('DOMContentLoaded', () => {

    // ========================================================================
    // LÓGICA GERAL DO SITE (Componentes Reutilizáveis)
    // ========================================================================

    // --- Lógica do Menu Dropdown de Usuário ---
    const userDropdown = document.querySelector('.user-dropdown');
    if (userDropdown) {
        const toggle = userDropdown.querySelector('.dropdown-toggle');
        toggle.addEventListener('click', (event) => {
            event.stopPropagation(); // Impede que o clique feche o menu imediatamente
            userDropdown.classList.toggle('active');
        });
    }

    // --- Lógica para Adicionar Itens à "Lista de Desejos" ---
    document.body.addEventListener('click', function(event) {
        // Botão "+ Lista" nas páginas de busca
        if (event.target.classList.contains('add-to-list-btn')) {
            const button = event.target;
            const controls = button.closest('.add-to-list-controls');
            const quantityInput = controls.querySelector('.quantity-input');
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
            .catch(error => console.error('Erro:', error));
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

    // Função auxiliar para atualizar o contador flutuante
    function updateFloatingBadge(totalItems) {
        const badge = document.querySelector('#floating-list-button .list-item-count');
        if (badge) {
            badge.textContent = totalItems;
            badge.classList.toggle('hidden', totalItems === 0);
        }
    }

    // ========================================================================
    // LÓGICA ESPECÍFICA DA PÁGINA DA LISTA (/lista)
    // ========================================================================

    const wantListContainer = document.querySelector('.want-list-container');
    if (wantListContainer) {
        // Lógica para abrir/fechar a gaveta de vendedores
        wantListContainer.addEventListener('click', (event) => {
            const clickableArea = event.target.closest('.card-summary');
            if (clickableArea) {
                const toggleButton = clickableArea.querySelector('.toggle-sellers-btn');
                if (toggleButton) {
                    const targetId = toggleButton.dataset.target;
                    const drawer = document.getElementById(targetId);
                    if (drawer) {
                        toggleButton.classList.toggle('active');
                        drawer.style.display = drawer.style.display === 'block' ? 'none' : 'block';
                    }
                }
            }
        });
    }

    // --- Lógica do Modal de Adicionar Cartas ---
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
  const cart = []; // Array de itens no carrinho
    const cartItemsList = document.getElementById('cart-items-list');
    const cartTotalElement = document.getElementById('cart-total');
    
    // Função para atualizar o carrinho
    const updateCartSummary = () => {
        const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
        cartTotalElement.innerText = total.toFixed(2);

        cartItemsList.innerHTML = '';  // Limpa os itens

        cart.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.name} - ${item.quantity} x R$ ${item.price.toFixed(2)} = R$ ${(item.quantity * item.price).toFixed(2)}`;
            cartItemsList.appendChild(li);
        });
    };

    // Evento de clique para adicionar ao carrinho
    document.body.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-final-cart-btn')) {
            const listingId = event.target.getAttribute('data-listingid');
            const price = parseFloat(event.target.closest('.listing-row').querySelector('.price-info strong').innerText.replace('R$', '').trim());
            const quantity = parseInt(event.target.closest('.add-to-cart-controls').querySelector('.quantity-input').value, 10);

            const item = {
                listingId,
                name: event.target.closest('.card-summary').querySelector('h3').innerText,
                price,
                quantity
            };

            const existingIndex = cart.findIndex(cartItem => cartItem.listingId === listingId);
            if (existingIndex >= 0) {
                cart[existingIndex].quantity += quantity;
            } else {
                cart.push(item);
            }

            updateCartSummary();
        }
    });