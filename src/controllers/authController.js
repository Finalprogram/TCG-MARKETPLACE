const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Função para MOSTRAR a página de registro
const showRegisterPage = (req, res) => {
  res.render('pages/register'); // Vamos criar esta página EJS no próximo passo
};

// Função para PROCESSAR o formulário de registro
const registerUser = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, accountType, businessName, taxId } = req.body;

    // --- VALIDAÇÃO ---
    if (!username || !email || !password || !confirmPassword || !accountType) {
      return res.status(400).send('Por favor, preencha todos os campos obrigatórios.');
    }
    if (password !== confirmPassword) {
      return res.status(400).send('As senhas não coincidem.');
    }

    // Verifica se o usuário ou email já existe
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).send('Nome de usuário ou email já cadastrado.');
    }

    // --- CRIPTOGRAFIA DA SENHA ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- CRIAÇÃO DO NOVO USUÁRIO ---
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      accountType,
      businessName: accountType === 'shop' ? businessName : undefined,
      taxId: accountType === 'shop' ? taxId : undefined,
    });

    await newUser.save();

    // Redireciona para a página de login ou para uma página de sucesso
    res.redirect('/login'); // (Criaremos o login depois)

  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).send('Erro ao registrar usuário.');
  }
};
const showLoginPage = (req, res) => {
  res.render('pages/login'); // Vamos criar esta página no próximo passo
};

// 2. Função para PROCESSAR o formulário de login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).send('Por favor, preencha todos os campos.');
    }

    // Encontra o usuário no banco de dados pelo email
    const user = await User.findOne({ email });
    if (!user) {
      // Usamos uma mensagem genérica por segurança
      return res.status(400).send('Email ou senha inválidos.');
    }

    // Compara a senha digitada com a senha criptografada (hash) no banco
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('Email ou senha inválidos.');
    }

    // SUCESSO! A senha corresponde.
    // Salvamos as informações do usuário na sessão para "lembrar" que ele está logado.
    req.session.user = {
      id: user._id,
      username: user.username,
      accountType: 'individual'
    };
    
    // Redireciona para uma página de painel do usuário (que criaremos no futuro)
    res.redirect(`/perfil/${user.username}`);

  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).send('Erro no servidor.');
  }
};

const logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/dashboard'); // Se der erro, manda para o dashboard
    }
    res.clearCookie('connect.sid'); // Limpa o cookie da sessão
    res.redirect('/'); // Redireciona para a página inicial
  });
};
module.exports = {
  showRegisterPage,
  registerUser,
  showLoginPage,
  loginUser,
  logoutUser
};