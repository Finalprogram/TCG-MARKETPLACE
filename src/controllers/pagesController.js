// src/controllers/pagesController.js

const showHomePage = (req, res) => {
  // Agora a lógica de renderizar a página fica aqui
  res.render('pages/index', {
    title: 'Bem-vindo ao Magic Card Search',
  });
};

module.exports = {
  showHomePage,
};