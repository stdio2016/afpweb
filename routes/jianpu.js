var express = require('express');
var router = express.Router();

const {jianpu_to_pitch, match_score} = require('../jianpuAlgo');

const {connention, jianpuDB} = require('../connectDB');

/*db[0] = jianpu_to_pitch('5_.6=5_4_3_4_5 | 2_3_4 3_4_5 | 5_.6=5_4_3_4_5 | 253_1. |')
db[0].name = '倫敦鐵橋垮下來'
db[1] = jianpu_to_pitch('533- | 422- | 1234 | 555- | 533- | 422- | 1355 | 3--- |2222 | 234- | 3333 | 345- | 533- | 422- | 1355 | 1--- |')
db[1].name = '小蜜蜂'*/

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('jianpu', { place: 'jianpu' });
});

router.get('/search', function(req, res, next) {
  const jianpu = jianpu_to_pitch(req.query.jianpu).pitch;
  const result = [];
  for (var i in jianpuDB) {
    const song = jianpuDB[i];
    if (!song.pitch) continue;
    const score = match_score(song.pitch, jianpu, song.duration);
    if (score < 999999)
      result.push({score: 1000/(score+10), songId: i, song: jianpuDB[i]});
  }
  result.sort((a,b) => b.score - a.score);
  res.render('jianpuSearch', { place: 'jianpu', query: req.query.jianpu, result: result });
});

module.exports = router;
