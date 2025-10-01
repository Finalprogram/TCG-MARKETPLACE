document.addEventListener('DOMContentLoaded', () => {

  // --- 1. SELETORES DOS ELEMENTOS ---
  const searchInput = document.getElementById('sell-search-input');
  const searchResultsContainer = document.getElementById('sell-search-results');
  const stagingArea = document.getElementById('listing-staging-area');
  const saveAllBtn = document.getElementById('save-all-listings-btn');
  
  let debounceTimer; // Variável para controlar o "atraso" da busca

  // --- 2. LÓGICA DE BUSCA DINÂMICA (AO DIGITAR) ---
  searchInput.addEventListener('input', (event) => {
    const query = event.target.value;
    
    // Limpa o cronômetro anterior a cada nova letra
    clearTimeout(debounceTimer);
    
    if (query.length < 3) {
      searchResultsContainer.innerHTML = '';
      return;
    }
    
    searchResultsContainer.innerHTML = '<p style="color: var(--text-secondary);">Digitando...</p>';

    // Cria um novo cronômetro de 300ms
    debounceTimer = setTimeout(async () => {
      searchResultsContainer.innerHTML = '<p style="color: var(--text-secondary);">Buscando...</p>';
      try {
        const response = await fetch(`/api/cards/search?q=${query}`);
        const cards = await response.json();
        
        searchResultsContainer.innerHTML = ''; // Limpa a mensagem "Buscando..."

        if (cards.length === 0) {
          searchResultsContainer.innerHTML = '<p>Nenhuma carta encontrada.</p>';
          return;
        }

        cards.forEach(card => {
          const cardElement = document.createElement('div');
          cardElement.classList.add('search-result-item');
          cardElement.setAttribute('data-card-id', card._id);
          cardElement.setAttribute('data-card-name', card.name);
          cardElement.setAttribute('data-card-set', card.set_name || '');
          cardElement.setAttribute('data-card-image', card.image_url);
          
          cardElement.innerHTML = `
            <img src="${card.image_url}" alt="${card.name}">
            <div>
              <h4>${card.name}</h4>
              <p>${card.set_name || 'Edição não especificada'}</p>
            </div>
            <button class="btn-primary">Adicionar</button>
          `;
          searchResultsContainer.appendChild(cardElement);
        });
      } catch (error) {
        console.error('Erro ao buscar cartas:', error);
        searchResultsContainer.innerHTML = '<p>Erro ao buscar cartas. Tente novamente.</p>';
      }
    }, 300); // Espera 300ms após o usuário parar de digitar
  });

  // --- 3. LÓGICA PARA ADICIONAR UM RESULTADO À LISTA DE RASCUNHO ---
  searchResultsContainer.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
      const item = event.target.closest('.search-result-item');
      const { cardId, cardName, cardSet, cardImage } = item.dataset;
      
      const emptyMessage = stagingArea.querySelector('.empty-staging-message');
      if (emptyMessage) {
        emptyMessage.remove();
      }

      const listingRow = document.createElement('div');
      listingRow.classList.add('listing-row');
      listingRow.setAttribute('data-card-id', cardId);
      
      listingRow.innerHTML = `
        <img src="${cardImage}" alt="${cardName}">
        <div class="card-info">
            <strong>${cardName}</strong>
            <small>(${cardSet || 'N/A'})</small>
        </div>
        <div class="listing-inputs">
            <input type="number" placeholder="Preço" class="listing-price form-control" required>
            <input type="number" placeholder="Qtd" class="listing-quantity form-control" value="1" min="1" required>
            <select class="listing-condition form-control">
                <option value="NM">Near Mint</option>
                <option value="LP">Lightly Played</option>
                <option value="MP">Moderately Played</option>
                <option value="HP">Heavily Played</option>
            </select>
            <select class="listing-language form-control">
                <option value="pt">Português</option>
                <option value="en">Inglês</option>
            </select>
            <label class="foil-checkbox">
                <input type="checkbox" class="listing-is-foil"> Foil
            </label>
        </div>
        <button class="remove-listing-btn" title="Remover">&times;</button>
      `;
      stagingArea.appendChild(listingRow);

      searchInput.value = '';
      searchResultsContainer.innerHTML = '';
      searchInput.focus();
    }
  });
  
  // --- 4. LÓGICA PARA REMOVER UM ITEM DA LISTA DE RASCUNHO ---
  stagingArea.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-listing-btn')) {
      event.target.closest('.listing-row').remove();
      
      if (stagingArea.children.length === 0) {
        stagingArea.innerHTML = '<p class="empty-staging-message">As cartas que você adicionar aparecerão aqui.</p>';
      }
    }
  });

  // --- 5. LÓGICA PARA SALVAR TODOS OS ANÚNCIOS ---
  saveAllBtn.addEventListener('click', async () => {
    const listingRows = stagingArea.querySelectorAll('.listing-row');
    const listingsToCreate = [];

    listingRows.forEach(row => {
      const cardId = row.dataset.cardId;
      const price = row.querySelector('.listing-price').value;
      const quantity = row.querySelector('.listing-quantity').value;
      const condition = row.querySelector('.listing-condition').value;
      const language = row.querySelector('.listing-language').value;
      const is_foil = row.querySelector('.listing-is-foil').checked;

      if (cardId && price && quantity) {
        listingsToCreate.push({
          card: cardId,
          price: parseFloat(price),
          quantity: parseInt(quantity, 10),
          condition,
          language,
          is_foil
        });
      }
    });

    if (listingsToCreate.length === 0) {
      alert('Nenhum anúncio para salvar!');
      return;
    }

    try {
      const response = await fetch('/api/listings/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingsToCreate),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`${result.count} anúncios criados com sucesso!`);
        window.location.href = '/meus-anuncios'; // Redireciona para uma futura página de anúncios
      } else {
        throw new Error(result.message || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('Erro ao salvar anúncios:', error);
      alert(`Erro ao salvar anúncios: ${error.message}`);
    }
  });
});