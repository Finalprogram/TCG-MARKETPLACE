document.addEventListener('DOMContentLoaded', () => {
    // Delegação de evento para todos os botões de adicionar à lista
    document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('add-to-list-btn')) {
            const button = event.target;
            const controls = button.closest('.add-to-list-controls');
            const quantityInput = controls.querySelector('.quantity-input');
            
            const cardId = button.dataset.cardid;
            const quantity = quantityInput.value;

            console.log(`Adicionando à lista: Card ID ${cardId}, Quantidade ${quantity}`);

            // Envia os dados para o nosso back-end
            fetch('/api/list/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cardId, quantity }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Item adicionado! Total de itens na lista:', data.totalItems);
                    
                    // ===================================================
                    // ====== ATUALIZAÇÃO DO CONTADOR FLUTUANTE ======
                    // ===================================================
                    const badge = document.querySelector('#floating-list-button .list-item-count');
                    if (badge) {
                        badge.textContent = data.totalItems;
                        if (data.totalItems > 0) {
                            badge.classList.remove('hidden');
                        } else {
                            badge.classList.add('hidden');
                        }
                    }
                    // ===================================================

                    // Feedback visual para o botão que foi clicado (seu código original)
                    button.textContent = 'Adicionado!';
                    button.style.backgroundColor = '#28a745'; // Verde
                    setTimeout(() => {
                        button.textContent = '+ Lista';
                        button.style.backgroundColor = ''; // Volta ao normal
                    }, 2000);
                }
            })
            .catch(error => {
                console.error('Erro:', error);
            });
        }
        
        // Lógica para os botões de + e -
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
});

document.addEventListener('DOMContentLoaded', () => {
    // ... seu código de 'add to list' e 'quantity-btn' ...

    // --- LÓGICA DO MENU DROPDOWN DE USUÁRIO ---
    const userDropdown = document.querySelector('.user-dropdown');

    if (userDropdown) {
        const toggle = userDropdown.querySelector('.dropdown-toggle');

        // Abre/fecha o menu ao clicar no gatilho
        toggle.addEventListener('click', () => {
            userDropdown.classList.toggle('active');
        });

        // Fecha o menu se o usuário clicar fora dele
        window.addEventListener('click', (event) => {
            if (!userDropdown.contains(event.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }
});

// ... seu código de 'add to list' e dropdown de usuário ...

// --- LÓGICA DA GAVETA DE VENDEDORES NA PÁGINA /lista ---
const wantListContainer = document.querySelector('.want-list-container');
if (wantListContainer) {
  wantListContainer.addEventListener('click', (event) => {
    // Procura pela área clicável (o resumo do card)
    const clickableArea = event.target.closest('.card-summary');
    
    if (clickableArea) {
      const toggleButton = clickableArea.querySelector('.toggle-sellers-btn');
      const targetId = toggleButton.dataset.target;
      const drawer = document.getElementById(targetId);
      
      if (drawer) {
        // Alterna a classe 'active' no botão (para a seta girar)
        toggleButton.classList.toggle('active');
        
        // Alterna a exibição da gaveta com um efeito suave
        if (drawer.style.display === 'block') {
          drawer.style.display = 'none';
        } else {
          drawer.style.display = 'block';
        }
      }
    }
  });
}
// ...

// --- LÓGICA DOS FILTROS DINÂMICOS NA PÁGINA /lista ---
if (wantListContainer) {
  wantListContainer.addEventListener('change', async (event) => {
    if (event.target.classList.contains('item-filter-select')) {
      const selectElement = event.target;
      const cardId = selectElement.dataset.cardid;
      const drawer = selectElement.closest('.sellers-drawer');
      const listingsContainer = drawer.querySelector('.listings-container');

      // 1. Coleta todos os filtros para esta carta
      const filters = {};
      drawer.querySelectorAll('.item-filter-select').forEach(select => {
        if (select.value) {
          filters[select.dataset.filter] = select.value;
        }
      });

      listingsContainer.innerHTML = '<p>Atualizando...</p>';

      // 2. Chama a nossa nova API
      try {
        const response = await fetch('/api/list/filter-sellers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId, filters })
        });
        const listings = await response.json();

        // 3. Limpa e redesenha a lista de vendedores
        listingsContainer.innerHTML = '';
        if (listings.length > 0) {
          listings.forEach(listing => {
            // Cria o HTML para cada nova linha de anúncio
            const listingRow = document.createElement('div');
            listingRow.classList.add('listing-row');
            // (Aqui você recria o innerHTML da .listing-row que já temos no EJS)
            listingRow.innerHTML = `
              <div class="seller-info"><strong>${listing.seller.username}</strong></div>
              <div class="condition-info"><span>${listing.condition}</span> | <span>${listing.is_foil ? 'Foil' : 'Normal'}</span></div>
              <div class="price-info"><strong>R$ ${listing.price.toFixed(2)}</strong></div>
              <div class="add-to-cart-controls">...</div>
            `;
            listingsContainer.appendChild(listingRow);
          });
        } else {
          listingsContainer.innerHTML = '<p class="no-listings">Nenhum anúncio encontrado com estes filtros.</p>';
        }
      } catch (error) {
        console.error('Erro ao atualizar vendedores:', error);
        listingsContainer.innerHTML = '<p>Erro ao atualizar. Tente novamente.</p>';
      }
    }
  });
}

// ... dentro do 'DOMContentLoaded' ...

// --- LÓGICA DO MODAL DO OTIMIZADOR ---
const optimizeBtn = document.getElementById('optimize-list-btn');
const optimizerModal = document.getElementById('optimizer-modal');
const closeModalBtn = optimizerModal.querySelector('.modal-close-btn');

if (optimizeBtn) {
  // Abre o modal
  optimizeBtn.addEventListener('click', () => {
    optimizerModal.classList.add('active');
    // (No futuro, aqui chamaremos a lógica do back-end)
  });

  // Fecha o modal pelo botão 'X'
  closeModalBtn.addEventListener('click', () => {
    optimizerModal.classList.remove('active');
  });

  // Fecha o modal ao clicar fora dele
  optimizerModal.addEventListener('click', (event) => {
    if (event.target === optimizerModal) {
      optimizerModal.classList.remove('active');
    }
  });
}// ... dentro do 'DOMContentLoaded' ...

// --- LÓGICA PARA EXPANDIR FILTROS AVANÇADOS ---
const advancedToggleBtn = document.getElementById('advanced-filters-toggle');
const advancedFiltersPanel = document.getElementById('advanced-filters-panel');

if (advancedToggleBtn) {
  advancedToggleBtn.addEventListener('click', (event) => {
    event.preventDefault();
    advancedToggleBtn.classList.toggle('active');
    advancedFiltersPanel.classList.toggle('active');
  });
}
// ... dentro do 'if (wantListContainer)' ...
wantListContainer.addEventListener('click', async (event) => {
    
    // ... sua lógica do 'toggle-sellers-btn' ...

    // --- LÓGICA PARA REMOVER DA LISTA ---
    if (event.target.classList.contains('remove-from-list-btn')) {
        const button = event.target;
        const cardId = button.dataset.cardid;
        const wantListItem = button.closest('.want-list-item');

        try {
            const response = await fetch('/api/list/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId })
            });
            const data = await response.json();

            if (response.ok) {
                // Remove o item da tela
                wantListItem.remove();
                // (Opcional: atualizar o ícone flutuante)
                const badge = document.querySelector('#floating-list-button .list-item-count');
                if (badge) badge.textContent = data.totalItems;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            alert(`Erro ao remover item: ${error.message}`);
        }
    }
});
// --- LÓGICA DO MODAL DE ADICIONAR CARTAS ---
const addMoreCardsBtn = document.getElementById('add-more-cards-btn');
const addCardModal = document.getElementById('add-card-modal');

if (addMoreCardsBtn) {
    const closeModal = addCardModal.querySelector('.modal-close-btn');
    const searchInput = addCardModal.querySelector('#modal-search-input');
    const searchResults = addCardModal.querySelector('#modal-search-results');
    let debounceTimer;

    // Abrir o modal
    addMoreCardsBtn.addEventListener('click', () => {
        addCardModal.classList.add('active');
        searchInput.focus();
    });

    // Fechar o modal
    closeModal.addEventListener('click', () => addCardModal.classList.remove('active'));
    addCardModal.addEventListener('click', (e) => {
        if (e.target === addCardModal) addCardModal.classList.remove('active');
    });

    // Lógica de busca com debounce (igual à da página de Venda)
    searchInput.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);
        const query = event.target.value;
        if (query.length < 3) {
            searchResults.innerHTML = '';
            return;
        }
        debounceTimer = setTimeout(async () => {
            const response = await fetch(`/api/cards/search?q=${query}`);
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

    // Lógica para adicionar a carta à lista quando o botão é clicado DENTRO do modal
    searchResults.addEventListener('click', async (event) => {
        if (event.target.classList.contains('add-from-modal-btn')) {
            const cardId = event.target.dataset.cardid;
            
            // Reutiliza a API de adicionar à lista
            const response = await fetch('/api/list/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId, quantity: 1 })
            });

            if (response.ok) {
                // A forma mais simples de atualizar a página é recarregando-a
                window.location.reload();
            } else {
                alert('Não foi possível adicionar a carta.');
            }
        }
    });
}