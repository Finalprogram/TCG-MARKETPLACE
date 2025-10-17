const Listing = require('../models/Listing');
const Card = require('../models/Card');
const PriceHistory = require('../models/PriceHistory');

const recordPriceHistory = async () => {
  try {
    console.log('Starting price history recording...');

    const listings = await Listing.find({ quantity: { $gt: 0 } }).populate('card');
    console.log(`${listings.length} active listings found.`);

    const cardPrices = new Map();

    listings.forEach(listing => {
      if (listing.card) {
        const cardId = listing.card._id.toString();
        if (!cardPrices.has(cardId)) {
          cardPrices.set(cardId, { prices: [], card: listing.card });
        }
        cardPrices.get(cardId).prices.push(listing.price);
      }
    });

    console.log(`Found ${cardPrices.size} unique cards with active listings.`);

    for (const [cardId, data] of cardPrices.entries()) {
      const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;

      const newPriceHistory = new PriceHistory({
        card: cardId,
        price: avgPrice,
        date: new Date()
      });
      await newPriceHistory.save();

      data.card.averagePrice = avgPrice;

      const history = await PriceHistory.find({ card: cardId }).sort({ date: -1 }).limit(2);

      if (history.length < 2) {
        data.card.price_trend = 'stable';
      } else {
        const [recentPrice, previousPrice] = history;
        if (recentPrice.price > previousPrice.price) {
          data.card.price_trend = 'up';
        } else if (recentPrice.price < previousPrice.price) {
          data.card.price_trend = 'down';
        } else {
          data.card.price_trend = 'stable';
        }
      }
      await data.card.save();
    }

    console.log('Price history recording complete.');
  } catch (error) {
    console.error('Error recording price history:', error);
  }
};

module.exports = { recordPriceHistory };
