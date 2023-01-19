var express = require('express');
const { getNumberOfSongs, getRecentlyAddedSongs } = require('../mongo/songs');
var router = express.Router();

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    var [cnt, recent] = await Promise.all([
      getNumberOfSongs(), getRecentlyAddedSongs()]);
    res.render('index', { numSongs: cnt, recentSongs: recent });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
