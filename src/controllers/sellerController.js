// src/controllers/sellerController.js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Listing = require('../models/Listing');

const showSellerDashboard = async (req, res) => {
  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.session.user.id);

    // 1. Contar anúncios ativos
    const activeListingsCount = await Listing.countDocuments({ seller: sellerObjectId });

    // 2. Calcular métricas de vendas (Total Vendido e Itens Vendidos)
    const salesData = await Order.aggregate([
      // Encontra todos os pedidos que contenham pelo menos um item do vendedor
      { $match: { 'items.seller': sellerObjectId } },
      // "Desenrola" o array de itens, criando um documento para cada item
      { $unwind: '$items' },
      // Filtra novamente para manter apenas os itens do vendedor atual
      { $match: { 'items.seller': sellerObjectId } },
      // Agrupa os resultados para calcular a soma e a contagem
      {
        $group: {
          _id: null, // Agrupa todos os itens do vendedor em um único resultado
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          totalItemsSold: { $sum: '$items.quantity' }
        }
      }
    ]);

    // O aggregate agora retorna um único objeto com os totais, ou um array vazio se não houver vendas
    const totalRevenue = salesData.length > 0 ? salesData[0].totalRevenue : 0;
    const totalItemsSold = salesData.length > 0 ? salesData[0].totalItemsSold : 0;

    // 3. Buscar as últimas 5 vendas
    const recentSales = await Order.find({ 'items.seller': sellerObjectId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Filtra os itens para mostrar apenas os do vendedor
    const sellerRecentSales = recentSales.map(order => {
        return {
            ...order.toObject(),
            items: order.items.filter(item => item.seller.toString() === sellerObjectId.toString())
        };
    });

    res.render('pages/seller-dashboard', {
      stats: {
        totalRevenue,
        totalItemsSold,
        activeListingsCount,
      },
      recentSales: sellerRecentSales,
    });

  } catch (error) {
    console.error('Erro ao carregar o dashboard do vendedor:', error);
    res.status(500).send('Erro no servidor');
  }
};

module.exports = {
  showSellerDashboard,
};
