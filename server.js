// server.js
const path = require('path');
const express = require('express');

// --- IMPORTAÇÃO DAS ROTAS ---
const pagesRoutes = require('./src/routes/pagesRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const app = express();
const port = 3000;

// Configura o EJS como o motor de visualização (template engine)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
// Serve arquivos estáticos (CSS, imagens, etc.) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));
// --- ROTAS DA APLICAÇÃO ---
app.use('/', pagesRoutes);
app.use('/', cardRoutes); 

// app.use('/cards', cardRoutes); // Exemplo de como você usaria as rotas de cards
// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});