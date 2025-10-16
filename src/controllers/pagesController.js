// src/controllers/pagesController.js
const User = require('../models/User');
const showHomePage = (req, res) => {
  // Agora a lógica de renderizar a página fica aqui
  res.render('pages/index', {
    title: 'Bem-vindo ao Magic Card Search',
  });
};
const showProfilePage = async (req, res) => {
  try {
    const username = req.params.username;
    const profileUser = await User.findOne({ username: username });

    if (!profileUser) {
      return res.status(404).send('Usuário não encontrado.');
    }

    // Prepara uma mensagem de erro se a validação do endereço falhou
    let errorMessage = null;
    if (req.query.error === 'validation') {
      errorMessage = 'Falha na validação. Por favor, preencha todos os campos de endereço obrigatórios.';
    }

    res.render('pages/profile', { 
      profileUser,
      error: errorMessage // Passa a mensagem de erro para a view
    });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).send('Erro no servidor');
  }
};

const showSellPage = (req, res) => {
  // Por enquanto, apenas renderizamos a página.
  // No futuro, essa função também vai lidar com os resultados da busca.
  res.render('pages/sell', { searchResults: [] }); // Passamos um array vazio inicialmente
};
module.exports = {
  showHomePage,
  showProfilePage,
  showSellPage,
};