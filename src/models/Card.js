const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  scryfall_id: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true, index: true },
  set: { type: String, index: true }, // 'index: true' acelera os filtros
  // Não precisamos salvar todas as URLs, só a que vamos usar
  image_url: { type: String }, 
  rarity: { type: String },
  colors: { type: Array },
  type_line: { type: String },
  legalities: { type: Object }, // Guarda a legalidade em cada formato
  // Podemos salvar o preço em USD como referência
  price_usd: { type: String },
  price_usd_previous: { type: String }, // Guarda o preço da última verificação
  price_trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' }, // Guarda a tendência
  price_last_updated: { type: Date } // Guarda quando foi a última atualização
});

// Removemos a opção "strict: false" para garantir que só salvaremos o que definimos
// Isso reduz drasticamente o tamanho de cada documento

module.exports = mongoose.model('Card', CardSchema);