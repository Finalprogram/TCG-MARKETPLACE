const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Função para MOSTRAR a página de registro
const showRegisterPage = (req, res) => {
  res.render('pages/register'); // Vamos criar esta página EJS no próximo passo
};

// Função para PROCESSAR o formulário de registro
const registerUser = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // --- VALIDAÇÃO SIMPLIFICADA ---
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).send('Por favor, preencha todos os campos obrigatórios.');
    }
    if (password !== confirmPassword) {
      return res.status(400).send('As senhas não coincidem.');
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).send('Nome de usuário ou email já cadastrado.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- CRIAÇÃO DO NOVO USUÁRIO (SEMPRE PESSOA FÍSICA) ---
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      accountType: 'individual', // Definido como 'individual' diretamente
    });

    await newUser.save();

    res.redirect('/login');

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

// Atualiza o endereço do usuário
const updateAddress = async (req, res) => {
  const userId = req.session.user.id;
  console.log(`[updateAddress] Iniciando atualização para o usuário ID: ${userId}`);
  console.log('[updateAddress] Dados recebidos:', req.body);

  try {
    const { cep, street, number, complement, city, state } = req.body;

    if (!cep || !street || !number || !city || !state) {
        // Se houver erro de validação, busca os dados do usuário para renderizar o formulário novamente com o erro
        const user = await User.findById(userId);
        // Nota: Precisamos de uma forma de passar o erro para a página de perfil.
        // Por enquanto, apenas redirecionamos de volta com uma query string de erro (pode ser melhorado).
        return res.redirect(`/perfil/${req.session.user.username}?error=validation`);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, {
      $set: {
        'address.cep': cep,
        'address.street': street,
        'address.number': number,
        'address.complement': complement,
        'address.city': city,
        'address.state': state,
      }
    }, { new: true }); // { new: true } retorna o documento atualizado

    if (updatedUser) {
        console.log('[updateAddress] Usuário após a atualização:', updatedUser.toObject());
        console.log('[updateAddress] Objeto de endereço salvo:', updatedUser.toObject().address);
    } else {
        console.log('[updateAddress] Nenhum usuário encontrado para atualizar.');
    }

    // Redireciona de volta para a página de perfil.
    res.redirect(`/perfil/${req.session.user.username}`);

  } catch (error) {
    console.error('Erro ao atualizar endereço:', error.message);
    console.error(error.stack);
    res.status(500).send('Erro no servidor.');
  }
};

module.exports = {
  showRegisterPage,
  registerUser,
  showLoginPage,
  loginUser,
  logoutUser,
  updateAddress
};