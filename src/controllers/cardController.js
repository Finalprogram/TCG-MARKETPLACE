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

module.exports = {
  searchCards
};