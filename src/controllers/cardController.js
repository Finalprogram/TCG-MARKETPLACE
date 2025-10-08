const mongoose = require('mongoose');
const Card = require('../models/Card');
const Listing = require('../models/Listing');
const scryfallService = require('../services/scryfallService');

// Esta função continua como estava, servindo a busca geral do site (se houver uma)
const searchCards = async (req, res) => {
  try {
    const query = req.query.q;
    let cardsFound = [];
    if (query) {
      cardsFound = await scryfallService.searchCards(query);
    }
    res.render('pages/searchResults', {
      cards: cardsFound,
      query: query
    });
  } catch (error) {
    console.error("Erro no controlador de busca:", error);
    res.status(500).send("Ocorreu um erro ao processar sua busca.");
  }
};

// --- FUNÇÃO PRINCIPAL COM LOGS DE DEBUG ---
const showMagicCardsPage = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.p) || 1;
    const limit = 50;

    const cardMatchQuery = {};
    if (req.query.rarity) cardMatchQuery.rarity = req.query.rarity;
    if (req.query.color) cardMatchQuery.colors = req.query.color;
    if (req.query.type) cardMatchQuery.type_line = new RegExp(req.query.type, 'i');

    if (req.query.format) {
  cardMatchQuery[`legalities.${req.query.format}`] = 'legal';
}
    // ---- DEBUG 1: VER OS FILTROS ----
    console.log("1. Filtros aplicados na busca:", cardMatchQuery);
    
    // Etapa 1: Encontrar os IDs de cartas únicos que estão nos anúncios
    const distinctCardIds = await Listing.distinct('card');
    
    // ---- DEBUG 2: VER OS IDs ENCONTRADOS ----
    console.log("2. IDs de cartas que possuem anúncios:", distinctCardIds);

    // Etapa 2: Contar o total de cartas únicas com anúncios para a paginação
    const totalCards = await Card.countDocuments({ 
      _id: { $in: distinctCardIds },
      ...cardMatchQuery
    });
    
    // ---- DEBUG 3: VER A CONTAGEM ----
    console.log("3. Contagem de cartas que passam nos filtros:", totalCards);

    // Etapa 3: Buscar as informações dessas cartas
    const cards = await Card.aggregate([
      { $match: { 
          _id: { $in: distinctCardIds },
          ...cardMatchQuery
      }},
      { $lookup: {
          from: 'listings',
          localField: '_id',
          foreignField: 'card',
          as: 'listings'
      }},
      { $addFields: {
          lowestPrice: { $min: '$listings.price' }
      }},
      { $sort: { name: 1 } },
      { $skip: (currentPage - 1) * limit },
      { $limit: limit }
    ]);
    
    // ---- DEBUG 4: VER O RESULTADO FINAL ----
    console.log("4. Resultado final da agregação (primeiros 5):", cards.slice(0, 5));

    const formattedCards = cards.map(card => ({
        ...card,
        averagePrice: card.lowestPrice
    }));

    res.render('pages/cardSearchPage', {
      cards: formattedCards,
      currentPage: currentPage,
      hasMore: (currentPage * limit) < totalCards,
      totalCards: totalCards,
      filters: req.query
    });

  } catch (error) {
    console.error("Erro na página de busca de cards:", error);
    res.render('pages/cardSearchPage', { cards: [], filters: {}, currentPage: 1, hasMore: false, totalCards: 0 });
  }
};

// Função para a página de detalhes da carta
const showCardDetailPage = async (req, res) => {
  try {
    const cardId = req.params.id;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).send('Carta não encontrada');
    }

    const listings = await Listing.find({ card: cardId })
                                  .sort({ price: 1 })
                                  .populate('seller', 'username');

    const priceStats = await Listing.aggregate([
      { $match: { card: new mongoose.Types.ObjectId(cardId) } },
      {
        $group: {
          _id: { condition: '$condition', is_foil: '$is_foil' },
          averagePrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
        }
      }
    ]);

    res.render('pages/card-detail', { card, listings, priceStats });

  } catch (error) {
    console.error("Erro ao buscar detalhes da carta:", error);
    res.status(500).send('Erro no servidor');
  }
};

// Função para a busca da página de Venda
const searchCardsForSale = async (req, res) => {
  try {
    const searchQuery = req.query.q;
    let searchResults = [];

    if (searchQuery && searchQuery.length > 2) {
      searchResults = await Card.find({
        name: { $regex: new RegExp(searchQuery, 'i') }
      }).select('name set_name image_url').limit(10);
    }
    res.json(searchResults);

  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
};
// Adicione esta função ao seu src/controllers/cardController.js

const showOnePieceCardsPage = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.p) || 1;
    const limit = 50;
    
    // A query base agora filtra por 'game: "onepiece"'
    const cardMatchQuery = { game: 'onepiece' };
    
    // (No futuro, os filtros de raridade, etc., seriam específicos de One Piece)
    // if (req.query.rarity) cardMatchQuery.rarity = req.query.rarity;
    
    const distinctCardIds = await Listing.distinct('card');
    
    const totalCards = await Card.countDocuments({ 
      _id: { $in: distinctCardIds },
      ...cardMatchQuery 
    });

    const cards = await Card.aggregate([
      { $match: { _id: { $in: distinctCardIds }, ...cardMatchQuery }},
      { $lookup: { from: 'listings', localField: '_id', foreignField: 'card', as: 'listings' }},
      { $addFields: { lowestPrice: { $min: '$listings.price' }}},
      { $sort: { name: 1 }},
      { $skip: (currentPage - 1) * limit },
      { $limit: limit }
    ]);

    const formattedCards = cards.map(card => ({ ...card, averagePrice: card.lowestPrice }));

    // Reutilizamos a MESMA VIEW, passando um título e jogo diferentes!
    res.render('pages/cardSearchPage', {
      title: 'Explorar Cartas de One Piece',
      game: 'onepiece',
      cards: formattedCards,
      currentPage,
      hasMore: (currentPage * limit) < totalCards,
      totalCards,
      filters: req.query,
    });

  } catch (error) {
    console.error("Erro na página de busca de One Piece:", error);
    res.render('pages/cardSearchPage', { 
        title: 'Erro', 
        game: 'onepiece', 
        cards: [], 
        filters: {}, 
        currentPage: 1, 
        hasMore: false, 
        totalCards: 0 
    });
  }
};

module.exports = {
  searchCards,
  showMagicCardsPage,
  showCardDetailPage,
  showOnePieceCardsPage,
  searchCardsForSale,
};