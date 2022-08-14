var express = require('express');
var router = express.Router();
const path = require('path');
const {querySQL, jianpuDB} = require('../connectDB');
const spawn = require('child_process').spawn;
const net = require('net');
const axios = require('axios');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('qbsh', { place: 'qbsh' });
});

router.post('/query', function(req, res, next) {
  const file = req.files.file;
  let queryID = 0;
  const dir = path.join(__dirname, '..', 'public', 'savedQueries');
  querySQL(
    'INSERT INTO past_queries(method, details) VALUES(?,?)',
    ['qbsh', JSON.stringify({progress:0})]
  ).then(result => {
    queryID = result.insertId;
    file.mv(path.join(dir, `${queryID}.flac`));
    res.send((queryID).toString());
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  }).then(x => {
    var details = JSON.stringify({progress: 25});
    querySQL(
      'UPDATE past_queries SET details=?, query=? WHERE id=?',
      [details, queryID, queryID]
    ).catch(console.error);

    var wavFile = path.join(dir, `${queryID}.wav`);
    var proc = spawn('ffmpeg', [
      '-i', path.join(dir, `${queryID}.flac`),
      '-t', '20',
      wavFile
    ]);
    return new Promise((resolve, reject) => {
      proc.on('close', () => {
        resolve(`public/savedQueries/${queryID}.wav`);
      });
    });
  }).then(async wavFile => {
    var details = JSON.stringify({progress: 50});
    querySQL(
      'UPDATE past_queries SET details=? WHERE id=?',
      [details, queryID]
    ).catch(console.error);
    
    var result = await axios.default.get(
      'http://localhost:1606/searchLocalWav',
      {
        params: {
          file: wavFile,
        }
      }
    );
    return result.data;
  }).then(result => {
    var details = JSON.stringify(result);
    var top_song = null;
    if (result.songs && result.songs.length > 0) {
      top_song = result.songs[0].name;
    }
    querySQL(
      'UPDATE past_queries SET top_song=?, details=? WHERE id=?',
      [top_song, details, queryID]
    ).catch(console.error);
  }).catch(err => {
    var details = JSON.stringify({progress: 'error', reason: err.message + '\n' + err.stack});
    querySQL(
      'UPDATE past_queries SET details=? WHERE id=?',
      [details, queryID]
    ).catch(console.error);
  }).catch(console.error);
});

router.get('/result/\\d+', function(req, res, next) {
  const queryID = req.path.match(/^\/result\/([0-9]+)/)[1];
  var details;
  querySQL(
    'SELECT details FROM past_queries WHERE id=?',
    [queryID]
  ).then(result => {
    res.send(JSON.parse(result[0].details));
  }).catch(err => {
    res.send({'status': 'error', 'reason': err.message});
  });
});

router.get('/ping', (req, res, next) => {
  axios.default.get('http://localhost:1606/ping').then(value => {
    res.send(value.data);
  }, err => {
    console.log(err.message);
    res.send({status: 'unavailable', reason: err.message});
  });
});

module.exports = router;
