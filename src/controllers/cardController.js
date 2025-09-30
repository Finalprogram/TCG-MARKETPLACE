// 1. Importa o serviço que fala com a API da Scryfall
const scryfallService = require('../services/scryfallService');

const searchCards = async (req, res) => {
  try {
    // 2. Pega o termo de busca da URL (vem de name="q" no formulário)
    const query = req.query.q;
    let cardsFound = [];
    if (query) {
      // 3. Usa o serviço para buscar as cartas na API da Scryfall
      cardsFound = await scryfallService.searchCards(query);
    }
  
    // 4. Renderiza a PÁGINA DE RESULTADOS, passando as cartas encontradas
    res.render('pages/searchResults', {
      cards: cardsFound,
      query: query // Passa o termo da busca para a página também
    });

  } catch (error) {
    console.error("Erro no controlador de busca:", error);
    res.status(500).send("Ocorreu um erro ao processar sua busca.");
  }
};

const Card = require('../models/Card'); // Importa o modelo local

const showMagicCardsPage = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.p) || 1;
    const limit = 50; // Quantas cartas por página

    // 1. Monta a base dos filtros para a nossa busca local
    const matchQuery = {};
    if (req.query.rarity) matchQuery.rarity = req.query.rarity;
    if (req.query.color) matchQuery.colors = req.query.color;
    // (Adicione mais filtros aqui no futuro)

    // 2. USA O AGGREGATION PIPELINE
    const cards = await Card.aggregate([
      // Estágio 1: Encontra as cartas que correspondem aos filtros
      { $match: matchQuery },

      // Estágio 2: "Junta" (JOIN) com a coleção de anúncios (listings)
      {
        $lookup: {
          from: 'listings', // O nome da coleção de anúncios (geralmente o nome do modelo em minúsculo e no plural)
          localField: '_id', // O campo na coleção 'Card'
          foreignField: 'card', // O campo na coleção 'Listing' que referencia o Card
          as: 'listings' // O nome do novo array que será criado com os anúncios encontrados
        }
      },

      // Estágio 3: Calcula o preço médio e adiciona como um novo campo
      {
        $addFields: {
          // Se houver anúncios, calcula a média. Se não, o preço médio é null.
          averagePrice: { $avg: '$listings.price' }
        }
      },

      // Estágio 4: Ordena, Pula e Limita para fazer a paginação
      { $sort: { name: 1 } }, // Ordena por nome
      { $skip: (currentPage - 1) * limit },
      { $limit: limit }
    ]);
    
    // Precisamos contar o total de documentos para a paginação
    const totalCards = await Card.countDocuments(matchQuery);

    res.render('pages/cardSearchPage', {
      cards: cards,
      currentPage: currentPage,
      hasMore: (currentPage * limit) < totalCards,
      totalCards: totalCards,
      filters: req.query
    });

  } catch (error) {
    console.error("Erro na página de busca de cards:", error);
    res.render('pages/cardSearchPage', { cards: [], filters: {}, currentPage: 1 });
  }
};

module.exports = {
  searchCards,
  showMagicCardsPage // <-- Não se esqueça de exportar a nova função
};
