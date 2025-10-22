document.addEventListener('DOMContentLoaded', () => {
  const mercadopagoButton = document.getElementById('mercadopago-button');

  if (mercadopagoButton) {
    mercadopagoButton.addEventListener('click', async () => {
      // Em um cenário real, você obteria os itens do carrinho e o total do DOM
      // ou de variáveis globais definidas pelo servidor no EJS.
      // Por simplicidade, vamos usar dados de exemplo ou tentar extrair do DOM.
      const cartItems = []; // Array de objetos { cardName, price, qty }
      let totalAmount = 0;

      // Exemplo de como extrair do DOM (pode variar dependendo da estrutura exata)
      const packageElements = document.querySelectorAll('.ship-package');
      packageElements.forEach(packageEl => {
        const itemElements = packageEl.querySelectorAll('.ck-item');
        itemElements.forEach(itemEl => {
          const name = itemEl.querySelector('.ck-title').textContent.split(' ')[0]; // Pega só o nome da carta
          const qty = parseInt(itemEl.querySelector('.ck-meta').textContent.match(/Qtd: (\d+)/)[1]);
          const unitPriceText = itemEl.querySelector('.ck-meta').textContent.match(/Unit: (.*)/)[1];
          const unitPrice = parseFloat(unitPriceText.replace('R$', '').replace('.', '').replace(',', '.'));

          cartItems.push({
            cardName: name,
            price: unitPrice,
            qty: qty,
          });
        });
      });

      const grandTotalElement = document.getElementById('ck-grand');
      if (grandTotalElement) {
        const grandTotalText = grandTotalElement.textContent;
        totalAmount = parseFloat(grandTotalText.replace('R$', '').replace('.', '').replace(',', '.'));
      }

      if (cartItems.length === 0 || totalAmount === 0) {
        alert('Seu carrinho está vazio ou o total é inválido.');
        return;
      }

      try {
        const response = await fetch('/payment/mercadopago/create-preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cartItems, totalAmount }),
        });

        const data = await response.json();

        if (response.ok && data.init_point) {
          window.location.href = data.init_point;
        } else {
          alert('Erro ao iniciar o pagamento com Mercado Pago: ' + (data.message || 'Erro desconhecido'));
        }
      } catch (error) {
        console.error('Erro ao comunicar com o servidor:', error);
        alert('Erro ao processar seu pedido. Tente novamente.');
      }
    });
  }
});