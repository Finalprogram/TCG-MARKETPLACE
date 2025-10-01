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