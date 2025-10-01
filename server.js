// server.js

// 1. Imports
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const connectDB = require('./src/database/connection');
const pagesRoutes = require('./src/routes/pagesRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const listRoutes = require('./src/routes/listRoutes');
const authRoutes = require('./src/routes/authRoutes');
const sellerRoutes = require('./src/routes/sellerRoutes');
// const cartRoutes = require('./src/routes/cartRoutes'); // Você pode reativar quando precisar

// 2. Inicialização do App
const app = express();
const port = 3000;

// 3. Conexão com o Banco de Dados
connectDB();

// 4. Configuração dos Middlewares (A ORDEM IMPORTA)

// Habilita o "tradutor" de JSON. Deve vir antes das rotas que o usam.
app.use(express.json());

// Configura o EJS como o motor de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Serve arquivos estáticos (CSS, JS, imagens) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
// Configuração da Sessão
app.use(session({
  secret: 'um_segredo_muito_forte_aqui',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Em produção, use 'true' com HTTPS
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// 5. Configuração das Rotas (VÊM POR ÚLTIMO)
app.use('/', authRoutes);
app.use('/', pagesRoutes);
app.use('/', cardRoutes);
// app.use('/api', cartRoutes);
app.use('/api', listRoutes);
app.use('/', sellerRoutes);


// 6. Inicia o Servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});