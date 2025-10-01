const Listing = require('../models/Listing'); // Importa o modelo de Anúncio

// Função para criar múltiplos anúncios de uma vez
const bulkCreateListings = async (req, res) => {
  try {
    // req.body será um array de objetos, ex: [{ card, price, quantity, ... }]
    const listingsData = req.body;
    
    // Pega o ID do usuário logado a partir da sessão
    const sellerId = req.session.user.id;

    if (!listingsData || listingsData.length === 0) {
      return res.status(400).json({ message: 'Nenhum anúncio para criar.' });
    }

    // Prepara os dados: adiciona o ID do vendedor a cada anúncio
    const listingsToSave = listingsData.map(listing => ({
      ...listing,
      seller: sellerId, // Associa o anúncio ao vendedor logado
    }));

    // Usa 'insertMany' do Mongoose para salvar todos os anúncios de uma vez. É super eficiente!
    const createdListings = await Listing.insertMany(listingsToSave);

    // Responde com sucesso
    res.status(201).json({ 
      message: 'Anúncios criados com sucesso!',
      count: createdListings.length 
    });

  } catch (error) {
    console.error('Erro ao criar anúncios em massa:', error);
    res.status(500).json({ message: 'Erro no servidor ao criar anúncios.' });
  }
};

module.exports = {
  bulkCreateListings,
};