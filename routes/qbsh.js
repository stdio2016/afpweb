var express = require('express');
var router = express.Router();
const path = require('path');
const spawn = require('child_process').spawn;
const net = require('net');
const axios = require('axios');
const { addPastQuery, updatePastQuery, getPastQuery } = require('../mongo/pastQueries');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('qbsh', { place: 'qbsh' });
});

router.post('/query', async function(req, res, next) {
  const file = req.files.file;
  let queryID = '';
  var query = '';
  const dir = path.join(__dirname, '..', 'public', 'savedQueries');
  try {
    var result = await addPastQuery('qbsh', null, null, {progress:0});
    queryID = result.insertedId;
    query = queryID.toString();
    file.mv(path.join(dir, `${query}.flac`));
    res.send((queryID).toString());
  } catch(err) {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
    return;
  }

  try {
    var details = {progress: 25};
    await updatePastQuery(queryID, '', query, details);

    var wavFile = path.join(dir, `${queryID}.wav`);
    var proc = spawn('ffmpeg', [
      '-i', path.join(dir, `${queryID}.flac`),
      '-t', '20',
      wavFile
    ]);
    var wavFile = await new Promise((resolve, reject) => {
      proc.on('close', () => {
        resolve(`public/savedQueries/${queryID}.wav`);
      });
    });
    var details = {progress: 50};
    await updatePastQuery(queryID, '', query, details);
    
    var result = (await axios.default.get(
      'http://localhost:1606/searchLocalWav',
      {
        params: {
          file: wavFile,
        }
      }
    )).data;
    var top_song = null;
    if (result.songs && result.songs.length > 0) {
      top_song = result.songs[0].name;
    }
    await updatePastQuery(queryID, top_song, query, result);
  } catch (err) {
    var details = {progress: 'error', reason: err.message + '\n' + err.stack};
    await updatePastQuery(queryID, null, query, details);
  }
});

router.get('/result/:queryID', function(req, res, next) {
  const queryID = req.params.queryID;
  var details;
  getPastQuery(queryID).then(result => {
    res.send(result.details);
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
