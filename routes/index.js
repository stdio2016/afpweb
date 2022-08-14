var express = require('express');
const { querySQL } = require('../connectDB');
var router = express.Router();

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    var cnt = await querySQL('select count(id) as num from songs');
    res.render('index', { place: 'main', numSongs: cnt[0].num });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
