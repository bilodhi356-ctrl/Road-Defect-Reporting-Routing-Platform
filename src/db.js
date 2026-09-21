const mongoose = require('mongoose');
async function connectDb() { mongoose.set('strictQuery', true); await mongoose.connect(process.env.MONGODB_URI); }
module.exports = { connectDb };
