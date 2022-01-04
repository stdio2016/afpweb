var express = require('express');
var router = express.Router();

const {jianpu_to_pitch, match_score} = require('../jianpuAlgo');

const {connention, jianpuDB} = require('../connectDB');

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
  res.render('jianpuSearch', { place: 'jianpu', query: req.query.jianpu, result: result });
});

module.exports = router;
