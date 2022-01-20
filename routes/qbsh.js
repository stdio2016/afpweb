var express = require('express');
var router = express.Router();
const path = require('path');
const {querySQL, jianpuDB} = require('../connectDB');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('qbsh', { place: 'qbsh' });
});

router.post('/query', function(req, res, next) {
  const file = req.files.file;
  querySQL(
    'INSERT INTO past_queries(method, details) VALUES(?,?)',
    ['qbsh', JSON.stringify({progress:0})]
  ).then(result => {
    const queryID = result.insertId;
    file.mv(path.join(__dirname, '..', 'public', 'savedQueries', `${queryID}.flac`));
    res.send((queryID).toString());

    var detail = JSON.stringify([
      {name: 'name', singer: 'singer', score: 100, file: `savedQueries/${queryID}.flac`}
    ]);
    querySQL(
      'UPDATE past_queries SET top_song=?, details=?, query=? WHERE id=?',
      ['name', detail, queryID, queryID]
    ).catch(console.error);
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

router.get('/result/\\d+', function(req, res, next) {
  const queryID = req.path.match(/^\/result\/([0-9]+)/)[1];
  res.send({progress: 100, songs: [
    {name: 'name', singer: 'singer', score: 100, file: `savedQueries/${queryID}.flac`}
  ]});
});

module.exports = router;
