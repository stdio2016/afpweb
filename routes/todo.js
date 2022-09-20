var express = require('express');
const { db } = require('../mongo/mongoConnect');
var router = express.Router();

router.get('/', async function(req, res, next) {
  var table = (await db).collection('todo');
  var todos = await table.find().toArray();
  return res.render('todo', { todos });
});

module.exports = router;
