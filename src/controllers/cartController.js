// src/controllers/cartController.js

// A lógica principal do carrinho
const addToCart = (req, res) => {
  const { listingId, quantity } = req.body;

  // Inicia o carrinho na sessão se ele não existir
  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Verifica se o item já está no carrinho
  const existingItemIndex = req.session.cart.findIndex(item => item.listingId === listingId);

  if (existingItemIndex > -1) {
    // Se já existe, apenas atualiza a quantidade
    req.session.cart[existingItemIndex].quantity += parseInt(quantity, 10);
  } else {
    // Se não existe, adiciona o novo item
    req.session.cart.push({ listingId, quantity: parseInt(quantity, 10) });
  }

  // Responde com sucesso (poderia enviar o total de itens no carrinho)
  res.status(200).json({ message: 'Item adicionado com sucesso!' });
};

module.exports = { addToCart };