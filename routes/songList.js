var express = require('express');
var router = express.Router();
const {connection, jianpuDB} = require('../connectDB');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('songList', { place: 'songList', songs: jianpuDB });
});

router.get('/([0-9]+)', function(req, res, next) {
  let songID = req.path.match(/^\/([0-9]+)/)[1]
  console.log(songID)
  if (songID in jianpuDB) {
    res.render('songShow', { place: 'songList', song: jianpuDB[songID]});
  }
  else {
    res.render('songShow', { place: 'songList', song: null});
    res.status(404);
  }
});

module.exports = router;
