const mongoose = require('mongoose');
require('dotenv').config();

let connectionPromise;

const conectarDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('Falta configurar MONGO_URI o MONGODB_URI');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  await connectionPromise;
};

module.exports = { mongoose, conectarDB };
