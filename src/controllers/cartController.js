const addToCart = (req, res) => {
    // Verifica se o usuário está logado pela sessão
    console.log(req.session.user); // Log para verificar a sessã
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Você precisa estar logado para adicionar ao carrinho.' });
    }

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

    // Retorna o número total de itens no carrinho
    const cartCount = req.session.cart.reduce((total, item) => total + item.quantity, 0);
    res.status(200).json({ success: true, message: 'Item adicionado com sucesso!', cartCount });
};

module.exports = { addToCart };
