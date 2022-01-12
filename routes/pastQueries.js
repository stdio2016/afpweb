var express = require('express');
var router = express.Router();
const {querySQL} = require('../connectDB');

/* GET home page. */
router.get('/', function(req, res, next) {
  querySQL('SELECT id,query_time,method,top_song FROM past_queries WHERE NOT deleted').then(queries => {
    res.render('pastQueries', { place: 'pastQueries', queries: queries })
  }).catch(err => {
    res.render('error', {error: err});
  });
});

router.get('/([0-9]+)', function(req, res, next) {
  let songID = req.path.match(/^\/([0-9]+)/)[1];
  querySQL('SELECT * FROM past_queries WHERE id=?', [songID]).then(queries => {
    const row = queries[0];
    const method = row.method;
    if (method == 'jianpu')
      res.render('pastQueriesJianpu', { place: 'pastQueries', query: row.query, result: JSON.parse(row.details) });
    else {
      res.render('error', {error: new Error('history corrupt!')});
    }
  }).catch(err => {
    res.render('error', {error: err});
  });
});

module.exports = router;
