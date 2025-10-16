const Listing = require('../models/Listing'); // Importa o modelo de Anúncio

// Função para criar múltiplos anúncios de uma vez
const bulkCreateListings = async (req, res) => {
  try {
    const { listings: listingsData } = req.body;

    // DEBUG: Inspecionar os dados recebidos
    console.log('Dados recebidos do frontend:', JSON.stringify(listingsData, null, 2));

    
    // Pega o ID do usuário logado a partir da sessão
    const sellerId = req.session.user.id;

    if (!listingsData || listingsData.length === 0) {
      return res.status(400).json({ message: 'Nenhum anúncio para criar.' });
    }

    // Prepara os dados: mapeia o cardId para o campo 'card' e adiciona o vendedor
    const listingsToSave = listingsData.map(listing => ({
      card: listing.cardId, // Mapeamento de cardId -> card
      seller: sellerId,
      price: listing.price,
      quantity: listing.quantity,
      condition: listing.condition,
      language: listing.language,
      // Adicione outros campos que seu formulário envia, como is_foil, se houver
    }));

    // Usa 'insertMany' do Mongoose para salvar todos os anúncios de uma vez. É super eficiente!
    const createdListings = await Listing.insertMany(listingsToSave);

    // Responde com sucesso
    res.status(201).json({ 
      message: 'Anúncios criados com sucesso!',
      count: createdListings.length 
    });

  } catch (error) {
    console.error('Erro ao criar anúncios em massa:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Erro no servidor ao criar anúncios.' });
  }
};

module.exports = {
  bulkCreateListings,
};