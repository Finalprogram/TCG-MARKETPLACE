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
    // 1. Pega o nome de usuário do parâmetro da URL
    const username = req.params.username;

    // 2. Busca o usuário no banco de dados
    // IMPORTANTE: Usamos .select() por segurança, para NUNCA enviar a senha ou email para a página.
    const profileUser = await User.findOne({ username: username })
                                  .select('username accountType businessName createdAt');

    // 3. Se o usuário não for encontrado, mostra uma página de erro (ou redireciona)
    if (!profileUser) {
      return res.status(404).send('Usuário não encontrado.');
    }

    // 4. Renderiza a página de perfil, passando os dados do usuário encontrado
    res.render('pages/profile', { profileUser });

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