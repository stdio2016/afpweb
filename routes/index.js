var express = require('express');
const { getNumberOfSongs } = require('../mongo/songs');
var router = express.Router();

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    var cnt = await getNumberOfSongs();
    res.render('index', { place: 'main', numSongs: cnt, ip: req.ip });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
