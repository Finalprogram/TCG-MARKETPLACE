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

const showMagicCardsPage = async (req, res) => {
  try {
    // Monta a query base para buscar cartas de Magic
    let scryfallQuery = 'f:standard order:released';

    // --- LÓGICA PARA ADICIONAR FILTROS ---
    // Filtro de Raridade (ex: /cards/magic?rarity=rare)
    if (req.query.rarity) {
      scryfallQuery += ` r:${req.query.rarity}`;
    }
    // Filtro de Cor (ex: /cards/magic?color=blue)
    if (req.query.color) {
      scryfallQuery += ` c:${req.query.color}`;
    }
    // Filtro de Tipo (ex: /cards/magic?type=creature)
    if (req.query.type) {
      scryfallQuery += ` t:${req.query.type}`;
    }
    
    const currentPage = parseInt(req.query.p) || 1;
    console.log(`Buscando : "${scryfallQuery}" | Página:, ${currentPage}`);
    console.log("Query enviada para Scryfall:", scryfallQuery);//para Debug

    const cardsFound = await scryfallService.searchCards(scryfallQuery);
    const scryfallResult = await scryfallService.searchCards(scryfallQuery, currentPage);
    // console.log('RESULTADO COMPLETO DA SCRYFALL:', scryfallResult); // Ver tudo que a Scryfall retornou
    res.render('pages/cardSearchPage', { // Renderiza a NOVA PÁGINA
      cards: scryfallResult.data, // As cartas estão em data
      hasMore: scryfallResult.has_more,
      totalCards: scryfallResult.total_cards,
      currentPage: currentPage,
      filters: req.query // Passa os filtros atuais para a view
    });

  } catch (error) {
    console.error("Erro na página de busca de cards:", error);
    res.render('pages/cardSearchPage', { cards: [], filters: {}, hasMore: false, totalCards: 0, currentPage: 1 }); // Renderiza a página vazia em caso de erro
  }
};


module.exports = {
  searchCards,
  showMagicCardsPage // <-- Não se esqueça de exportar a nova função
};
