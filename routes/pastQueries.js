var express = require('express');
var router = express.Router();
const {querySQL} = require('../connectDB');

/* GET home page. */
router.get('/', function(req, res, next) {
  querySQL('SELECT * FROM past_queries WHERE NOT deleted').then(queries => {
    res.render('pastQueries', { place: 'pastQueries', queries: queries })
  }).catch(err => {
    res.render('error', {error: err});
  });
});

module.exports = router;
