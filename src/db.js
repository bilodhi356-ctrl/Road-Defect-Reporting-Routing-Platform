const mongoose = require('mongoose');
async function connectDb() {
	const dbURI = process.env.MONGODB_URI || process.env.DATABASE_URL;
	if (!dbURI) throw new Error('MONGODB_URI or DATABASE_URL must be configured.');
	mongoose.set('strictQuery', true);
	await mongoose.connect(dbURI);
}
module.exports = { connectDb };
