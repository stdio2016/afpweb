var express = require('express');
var router = express.Router();
const { getPastQuery, listPastQueries } = require('../mongo/pastQueries');

/* GET home page. */
router.get('/', function(req, res, next) {
  listPastQueries().then(queries => {
    res.render('pastQueries', { place: 'pastQueries', queries: queries })
  }).catch(err => {
    res.render('error', {error: err});
  });
});

router.get('/:queryID', function(req, res, next) {
  let songID = req.params.queryID;
  getPastQuery(songID).then(queries => {
    if (queries == null) {
      res.status(404);
      res.render('notFound');
      return;
    }
    const row = queries;
    const method = row.method;
    if (method == 'jianpu')
      res.render('pastQueriesJianpu', { place: 'pastQueries', query: row.query, result: row.details });
    else if (method == 'qbsh')
      res.render('pastQueriesQbsh', { place: 'pastQueries', query: row.query, result: row.details });
    else {
      res.render('error', {error: new Error('history corrupt!')});
    }
  }).catch(err => {
    res.render('error', {error: err});
  });
});

module.exports = router;
