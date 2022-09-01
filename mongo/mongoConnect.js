const { MongoClient } = require("mongodb");

var client = MongoClient.connect(process.env.MONGO_URL || '');

module.exports.client = client;
