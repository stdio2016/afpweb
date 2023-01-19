var express = require('express');
var router = express.Router();
const {jianpuDB} = require('../connectDB');
const { jianpu_to_pitch } = require('../jianpuAlgo');
const { listAllSongs, getSong, addSong, updateSong, listSongRevision, getSongRevision } = require('../mongo/songs');
const {addSong:addSongToQbsh} = require('../services/qbsh');

/* GET home page. */
router.get('/', function(req, res, next) {
  listAllSongs().then(result => {
    res.render('songList', { songs: result });
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

// add song
router.get('/add', function(req, res, next) {
  res.render('songAdd', { });
});

// confirm add
router.post('/add', function(req, res, next) {
  const form = req.body;
  const me = {
    id: '',
    name: String(form.name),
    singer: String(form.singer),
    language: String(form.language),
    jianpu: String(form.jianpu)
  };
  const {pitch, duration} = jianpu_to_pitch(me.jianpu);
  me.pitch = pitch;
  me.duration = duration;
  var user = {
    ip: req.ip
  };
  addSong(me, user).then(result => {
    const songID = result.insertId;
    me.id = songID;
    jianpuDB[songID] = me;
    return addSongToQbsh(songID, me);
  }).then((songID) => {
    res.redirect(songID);
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

router.get('/history', async function (req, res, next) {
  var songID = req.query.songID;
  var rev = req.query.rev;
  var song = await getSong(songID);
  if (rev) {
    try {
      var oldSong = await getSongRevision(songID, rev);
      res.render('songHistoryShow', { song: oldSong, curSong: song });
    } catch (err) {
      console.error(err);
      res.status(500);
      res.render('error', {error: err});
    }
    return;
  }
  var revisions = await listSongRevision(songID);
  res.render('songHistoryList', {song, revisions});
});

// show single song
router.get('/:songID', function(req, res, next) {
  let songID = req.params.songID;
  getSong(songID).then(result => {
    if (result)
      res.render('songShow', { song: result });
    else {
      res.status(404);
      res.render('songShow', { song: null });
    }
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

// edit song
router.get('/:songID/edit', function(req, res, next) {
  let songID = req.params.songID;
  getSong(songID).then(result => {
    if (result)
      res.render('songEdit', { song: result });
    else {
      res.status(404);
      res.render('songEdit', { song: null});
    }
    return;
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.render('error', {error: err});
  });
});

// confirm edit
router.post('/:songID/edit', function(req, res, next) {
  let songID = req.params.songID;
  const form = req.body;
  const me = jianpuDB[songID] || {};
  // remember to add fields to check for edits
  const formFields = ['name', 'singer', 'language', 'jianpu'];
  me.name = String(form.name);
  me.singer = String(form.singer);
  me.language = String(form.language);
  me.jianpu = String(form.jianpu);
  me.id = songID;
  const {pitch, duration} = jianpu_to_pitch(me.jianpu);
  me.pitch = pitch;
  me.duration = duration;
  var user = {
    ip: req.ip
  };
  getSong(songID).then(oldVer => {
    var edited = false;
    for (var field of formFields) {
      if (me[field] != oldVer[field]) {
        edited = true;
        break;
      }
    }
    if (!edited) {
      // null edit, don't change database
      return songID;
    }
    return updateSong(songID, me, user).then(_ => {
      jianpuDB[songID] = me;
      return addSongToQbsh(songID, me);
    });
  }).then((songID) => {
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

module.exports = router;
