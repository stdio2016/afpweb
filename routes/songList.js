var express = require('express');
var router = express.Router();
const {querySQL, jianpuDB} = require('../connectDB');
const { jianpu_to_pitch } = require('../jianpuAlgo');

/* GET home page. */
router.get('/', function(req, res, next) {
  querySQL('SELECT id,name,singer,language FROM songs', []).then(result => {
    res.render('songList', { place: 'songList', songs: result });
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

// show single song
router.get('/([0-9]+)', function(req, res, next) {
  let songID = req.path.match(/^\/([0-9]+)/)[1]
  querySQL('SELECT * FROM songs WHERE id=?', [songID]).then(result => {
    if (result.length > 0)
      res.render('songShow', { place: 'songList', song: result[0] });
    else {
      res.status(404);
      res.render('songShow', { place: 'songList', song: null});
    }
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

// edit song
router.get('/([0-9]+)/edit', function(req, res, next) {
  let songID = req.path.match(/^\/([0-9]+)/)[1]
  querySQL('SELECT * FROM songs WHERE id=?', [songID]).then(result => {
    if (result.length > 0)
      res.render('songEdit', { place: 'songList', song: result[0] });
    else {
      res.status(404);
      res.render('songEdit', { place: 'songList', song: null});
    }
    return;
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

// confirm edit
router.post('/([0-9]+)', function(req, res, next) {
  let songID = req.path.match(/^\/([0-9]+)/)[1];
  const form = req.body;
  querySQL(
    'UPDATE songs SET name=?,singer=?,language=?,jianpu=? WHERE id=?',
    [form.name, form.singer||null, form.language||null, form.jianpu||null, +songID]
  ).then(result => {
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
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

// add song
router.get('/add', function(req, res, next) {
  res.render('songAdd', { place: 'songList' });
});

// confirm add
router.post('/add', function(req, res, next) {
  const form = req.body;
  querySQL(
    'INSERT INTO songs(name,singer,language,jianpu) VALUES(?,?,?,?)',
    [form.name, form.singer||null, form.language||null, form.jianpu||null]
  ).then(result => {
    const songID = result.insertId;
    const me = {
      id: songID,
      name: form.name,
      singer: form.singer,
      language: form.language,
      jianpu: form.jianpu
    };
    if (form.jianpu) {
      const {pitch, duration} = jianpu_to_pitch(form.jianpu);
      me.pitch = pitch;
      me.duration = duration;
    }
    jianpuDB[songID] = me;
    res.redirect(songID);
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

module.exports = router;
