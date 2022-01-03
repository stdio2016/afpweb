var express = require('express');
var router = express.Router();
const {connection, jianpuDB} = require('../connectDB');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('songList', { place: 'songList', songs: jianpuDB });
});

module.exports = router;
