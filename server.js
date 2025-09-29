// Importa os módulos necessários
const express = require('express');
const path = require('path');

// Inicializa o aplicativo Express
const app = express();
const port = 3000;

// Configura o EJS como o motor de visualização (template engine)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve arquivos estáticos (CSS, imagens, etc.) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- DADOS MOCK (SIMULAÇÃO DE BANCO DE DADOS) ---
// No futuro, estes dados viriam de um banco de dados real.
const mockCards = [
  { id: 1, name: 'Raio', price: '5,50', image: 'https://placehold.co/220x310/242833/F0F2F5?text=Raio', game: 'Magic' },
  { id: 2, name: 'Charizard', price: '350,00', image: 'https://placehold.co/220x310/242833/F0F2F5?text=Charizard', game: 'Pokemon' },
  { id: 3, name: 'Dragão Branco', price: '400,00', image: 'https://placehold.co/220x310/242833/F0F2F5?text=Dragão+Branco', game: 'Yu-Gi-Oh!' },
  { id: 4, name: 'Black Lotus', price: '50.000,00', image: 'https://placehold.co/220x310/242833/F0F2F5?text=Black+Lotus', game: 'Magic' },
  { id: 5, name: 'Pikachu VMAX', price: '80,00', image: 'https://placehold.co/220x310/242833/F0F2F5?text=Pikachu', game: 'Pokemon' },
  { id: 6, name: 'Mago Negro', price: '250,00', image: 'https://placehold.co/220x310/242833/F0F2F5?text=Mago+Negro', game: 'Yu-Gi-Oh!' },
];

// --- ROTAS DA APLICAÇÃO ---

// Rota para a Página Inicial
app.get('/', (req, res) => {
  // Renderiza o arquivo 'index.ejs' e passa os dados mockados para ele
  res.render('pages/index', {
    recentlyAdded: mockCards
  });
});

// Outras rotas (a serem implementadas no futuro)
app.get('/search', (req, res) => {
  res.send('Página de Busca - Em construção');
});

app.get('/product/:id', (req, res) => {
  res.send(`Página do Produto ${req.params.id} - Em construção`);
});

app.get('/store/:name', (req, res) => {
  res.send(`Página da Loja ${req.params.name} - Em construção`);
});


// Inicia o servidor na porta definida
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

