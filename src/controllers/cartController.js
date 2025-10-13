const getCartContents = async (req, res) => {
    try {
        const userCart = req.session.cart || [];

        if (userCart.length === 0) {
            return res.json([]); // Retorna um array vazio se o carrinho estiver vazio
        }

        // Pega todos os IDs dos anúncios que estão no carrinho
        const listingIds = userCart.map(item => item.listingId);

        // Busca todos os anúncios de uma só vez, populando os dados da carta e do vendedor
        const listings = await Listing.find({ '_id': { $in: listingIds } })
                                      .populate({ path: 'card', select: 'name image_url' })
                                      .populate({ path: 'seller', select: 'username' });

        // Junta as informações do banco com as quantidades da sessão
        const populatedCart = userCart.map(item => {
            const listingDetails = listings.find(l => l._id.toString() === item.listingId);
            return {
                quantity: item.quantity,
                details: listingDetails
            };
        });

        res.json(populatedCart);

    } catch (error) {
        console.error("Erro ao buscar conteúdo do carrinho:", error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};
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

module.exports = { 
    addToCart,
    getCartContents
 };
