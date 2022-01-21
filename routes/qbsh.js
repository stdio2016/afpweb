var express = require('express');
var router = express.Router();
const path = require('path');
const {querySQL, jianpuDB} = require('../connectDB');
const spawn = require('child_process').spawn;
const net = require('net');

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
  }).then(wavFile => {
    var details = JSON.stringify({progress: 50});
    querySQL(
      'UPDATE past_queries SET details=? WHERE id=?',
      [details, queryID]
    ).catch(console.error);
    
    return new Promise((resolve, reject) => {
      var conn = net.connect({
        localAddress: '127.0.0.1',
        port: 1605
      });
      conn.on('error', x => {
        throw Error('qbsh server crashed!!!');
      })
      conn.setEncoding('utf-8');
      conn.write(`query ${wavFile}\n`);
      conn.end();

      let data = '';
      conn.on('data', x => {
        data += x;
        console.log('data', data);
      });
      conn.on('end', x => {
        resolve(JSON.parse(data));
        console.log('close', JSON.parse(data));
      });
    });
  }).then(result => {
    var details = JSON.stringify(result);
    querySQL(
      'UPDATE past_queries SET top_song=?, details=? WHERE id=?',
      ['name', details, queryID]
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
  querySQL(
    'SELECT details FROM past_queries WHERE id=?',
    [queryID]
  ).then(result => {
    res.send(result[0].details);
  });
});

module.exports = router;
