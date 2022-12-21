var express = require('express');
const createHttpError = require('http-errors');
const { ObjectId } = require('mongodb');
const { db } = require('../mongo/mongoConnect');
var router = express.Router();

router.get('/', async function(req, res, next) {
  var table = (await db).collection('todo');
  var todos = await table.find().toArray();
  var order = {Open: 0, Committed: 1, Wait: 2, Done: 3, Abandoned: 4};
  todos.sort((a, b) => {
    if (order[a.status] === order[b.status]) {
      return a.modifyDate - b.modifyDate;
    }
    return order[a.status] - order[b.status];
  });
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
    modifyDate: new Date(),
  });
  return res.redirect('../TODO');
});

router.get('/edit', async function(req, res, next) {
  try {
    var table = (await db).collection('todo');
    var item = await table.findOne({ _id: new ObjectId(req.query.id) });
    if (!item) {
      return next(createHttpError(404));
    }
    return res.render('todoEdit', { item } );
  } catch (err) {
    return next(err);
  }
});
router.post('/edit', async function(req, res, next) {
  try {
    var body = req.body || {};
    var pass = body.password;
    if (pass !== process.env.PAW) {
      return res.redirect('../TODO/edit?id=' + req.query.id);
    }

    var table = (await db).collection('todo');
    var { title, description, status } = req.body;
    await table.updateOne({ _id: new ObjectId(req.query.id) }, {
      $set: {
        title: title + '',
        description: description + '',
        status: status + '',
        modifyDate: new Date(),
      }
    });
    return res.redirect('../TODO');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
