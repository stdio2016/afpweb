var express = require('express');
const { db } = require('../mongo/mongoConnect');
var router = express.Router();

router.get('/', async function(req, res, next) {
  var table = (await db).collection('todo');
  var todos = await table.find().toArray();
  return res.render('todo', { todos });
});

router.get('/add', async function(req, res, next) {
  return res.render('todoAdd', {  });
});
router.post('/add', async function(req, res, next) {
  var body = req.body || {};
  var pass = body.password;
  if (pass !== process.env.PAW) {
    return res.redirect('../TODO/add');
  }

  var table = (await db).collection('todo');
  await table.insertOne({
    title: body.title + '',
    description: body.description + '',
    status: body.status + '',
  });
  return res.redirect('../TODO');
});

module.exports = router;
