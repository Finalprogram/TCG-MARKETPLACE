// src/controllers/listController.js
const addToList = (req, res) => {
  try {
    const { cardId, quantity } = req.body;

    if (!req.session.list) req.session.list = [];

    const existingItemIndex = req.session.list.findIndex(item => item.cardId === cardId);

    if (existingItemIndex > -1) {
      req.session.list[existingItemIndex].quantity += parseInt(quantity, 10);
    } else {
      req.session.list.push({ cardId, quantity: parseInt(quantity, 10) });
    }

    // Calcula o total de itens na lista (somando as quantidades)
    const totalItems = req.session.list.reduce((sum, item) => sum + item.quantity, 0);

    console.log('Sessão da Lista atualizada:', req.session.list);
    // Envia o total de itens na resposta
    res.status(200).json({ success: true, totalItems: totalItems });

  } catch (error) {
    console.error('Erro ao adicionar à lista:', error);
    res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
};

module.exports = { addToList };