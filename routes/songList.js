var express = require('express');
var router = express.Router();
const {connection, jianpuDB} = require('../connectDB');
const { jianpu_to_pitch } = require('../jianpuAlgo');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('songList', { place: 'songList', songs: jianpuDB });
});

// show single song
router.get('/([0-9]+)', function(req, res, next) {
  let songID = req.path.match(/^\/([0-9]+)/)[1]
  if (songID in jianpuDB) {
    res.render('songShow', { place: 'songList', song: jianpuDB[songID]});
  }
  else {
    res.render('songShow', { place: 'songList', song: null});
    res.status(404);
  }
});

// edit song
router.get('/([0-9]+)/edit', function(req, res, next) {
  let songID = req.path.match(/^\/([0-9]+)/)[1]
  if (songID in jianpuDB) {
    res.render('songEdit', { place: 'songList', song: jianpuDB[songID]});
  }
  else {
    res.render('songEdit', { place: 'songList', song: null});
    res.status(404);
  }
});

// confirm edit
router.post('/([0-9]+)', function(req, res, next) {
  let songID = req.path.match(/^\/([0-9]+)/)[1];
  const form = req.body;
  connection.query(
    'UPDATE songs SET name=?,singer=?,language=?,jianpu=? WHERE id=?',
    [form.name, form.singer||null, form.language||null, form.jianpu||null, +songID],
    callback
  );
  function callback(err, result) {
    if (err) {
      console.error(err);
      res.redirect('../'+songID+'/edit?failed');
      return;
    }
    const me = jianpuDB[songID];
    me.name = form.name;
    me.singer = form.singer;
    me.language = form.language;
    me.jianpu = form.jianpu;
    if (form.jianpu) {
      const {pitch, duration} = jianpu_to_pitch(form.jianpu);
      me.pitch = pitch;
      me.duration = duration;
    }
    else {
      delete me.pitch;
      delete me.duration;
    }
    if (songID in jianpuDB) {
      res.redirect('../'+songID);
    }
    else {
      res.redirect('../'+songID);
    }
  }
});

module.exports = router;
