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
    const errors = {};

    // --- VALIDAÇÃO ---
    if (!username) {
      errors.username = 'Nome de usuário é obrigatório.';
    }
    if (!email) {
      errors.email = 'Email é obrigatório.';
    }
    if (!password) {
      errors.password = 'Senha é obrigatória.';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem.';
    }

    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      errors.email = 'Este email já está cadastrado.';
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      errors.username = 'Este nome de usuário já está em uso.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
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

    res.status(201).json({ success: true, message: 'Cadastro realizado com sucesso!' });

  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({ errors: { general: 'Erro ao registrar usuário. Tente novamente.' } });
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
      accountType: user.accountType
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
        // Update the session user with the new address information
        req.session.user.address = updatedUser.address;
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