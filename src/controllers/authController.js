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

module.exports = {
  showRegisterPage,
  registerUser,
};