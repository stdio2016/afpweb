var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('jianpu', { place: 'jianpu' });
});

router.get('/search', function(req, res, next) {
  res.render('jianpuSearch', { place: 'jianpu', query: req.query.jianpu });
});

module.exports = router;
