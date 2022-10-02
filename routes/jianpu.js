var express = require('express');
var router = express.Router();

const {jianpu_to_pitch, match_score} = require('../jianpuAlgo');

const {querySQL, jianpuDB} = require('../connectDB');
const { addPastQuery } = require('../mongo/pastQueries');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('jianpu', { place: 'jianpu' });
});

router.get('/search', function(req, res, next) {
  const jianpu = jianpu_to_pitch(req.query.jianpu).pitch;
  const result = [];
  const max = jianpu.length * 2;
  for (var i in jianpuDB) {
    const song = jianpuDB[i];
    if (!song.pitch) continue;
    const [score, from, to] = match_score(song.pitch, jianpu, song.duration);
    if (score < 999999)
      result.push({score: Math.max(0, 100*(max-score)/max), songId: i, song: jianpuDB[i],
        from: from, to: to});
  }
  result.sort((a,b) => b.score - a.score);
  for (var i = 0; i < result.length; i++) {
    var s = result[i].song;
    result[i].song = {name: s.name, id: s.id, singer: s.singer, jianpu: s.jianpu};
  }
  addPastQuery(
    'jianpu',
    result.length > 0 ? result[0].song.name : null,
    req.query.jianpu,
    result,
  );
  res.render('jianpuSearch', { place: 'jianpu', query: req.query.jianpu, result: result });
});

module.exports = router;
