// 1. Imports
require('dotenv').config();

// Validação de Variáveis de Ambiente Essenciais dos Correios
const requiredEnv = ['CWS_TOKEN', 'CWS_CEP_ORIGEM'];
const missingEnv = requiredEnv.filter(v => !process.env[v]);

if (missingEnv.length > 0) {
    console.error(`
    ==================================================================
    ERRO DE CONFIGURAÇÃO: Variáveis de ambiente dos Correios ausentes.
    ==================================================================

    A aplicação não pode iniciar sem as seguintes variáveis no seu arquivo .env:
    
    ${missingEnv.join('\n    ')}

    Por favor, verifique se o arquivo .env existe na raiz do projeto e
    se ele contém essas variáveis com valores válidos.

    Exemplo:
    CWS_TOKEN="SEU_TOKEN_AQUI"
    CWS_CEP_ORIGEM="01001000"
    
    `);
    process.exit(1); // Encerra a aplicação com um código de erro.
}

const path = require('path');
const express = require('express');
const session = require('express-session');
const connectDB = require('./src/database/connection');
const pagesRoutes = require('./src/routes/pagesRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const listRoutes = require('./src/routes/listRoutes');
const authRoutes = require('./src/routes/authRoutes');
const sellerRoutes = require('./src/routes/sellerRoutes');
const listingRoutes = require('./src/routes/listingRoutes');
const cartRoutes = require('./src/routes/cartRoutes'); 
const checkoutRoutes = require('./src/routes/checkoutRoutes');
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
app.use('/api', listingRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
// 6. Inicia o Servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});