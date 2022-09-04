const { MongoClient } = require("mongodb");
require('dotenv').config();

var client = MongoClient.connect(process.env.MONGO_URL || '');
var db = client.then(client => client.db(process.env.MONGO_DB));

module.exports.client = client;
module.exports.db = db;
