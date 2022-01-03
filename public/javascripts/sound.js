var actx = new (window.AudioContext || window.webkitAudioContext)();
var master = actx.createGain();
master.gain.value = 0.5;
master.connect(actx.destination);

var stoppedSound = actx.createGain();
stoppedSound.gain.value = 1e-5;
stoppedSound.connect(actx.destination);

// for iOS only
var unlocked = false;
function unlock(){
  var buf = actx.createBuffer(1, 1, 22050);
  var ff = buf.getChannelData(0);
  ff[0] = 0.1;
  var src = actx.createBufferSource();

  src.buffer = buf;

  src.connect(master);
  if (src.start){
    src.start(0);
  }
  else{
    src.noteOn(0);
  }
  window.removeEventListener('touchend', unlock);
}
if(/iP[ao]d|iPhone/.test(navigator.userAgent)){
  window.addEventListener('touchend', unlock, false);
}

// provide instrument sounds
var soundBank = {};

function genFakePiano(){
  var len = 44100 * 2;
  var buff = actx.createBuffer(1, len + 44100 * 110 / 440, 44100);
  var dat = buff.getChannelData(0);
  var k = 440 / 44100 * Math.PI * 2;
  for(var t = 0; t < len; t++){
    var sum = 0;
    for(var n = 1; n < 40; n++){
      sum += Math.sin(k * n * t) / n * Math.exp(-(n - 1) * 0 - t*n/len);
    }
    dat[t] = sum * Math.exp(-t / (44100 * 0.5)) * 0.25;
  }
  for (var t = 0; t < 44100 * 110 / 440; t++){
    var sum = 0;
    for(var n = 1; n < 40; n++){
      sum += Math.sin(k * n * t) / n * Math.exp(-(n - 1) * 0 - n);
    }
    dat[len + t] = sum * Math.exp(-len / (44100 * 0.5)) * 0.25;
  }
  return buff;
}

function loadSmp(where, instr, prop){
  var req = new XMLHttpRequest();

  req.open('GET', where, true);
  req.responseType = 'arraybuffer';

  req.onload = function(){
    var dat = req.response;
    actx.decodeAudioData(dat, function(buffer){
      prop.sample = buffer;
      soundBank[instr] = prop;
    }, function(){
      throw new Error('Cannot decode audio');
    });
  };
  req.send();
}

soundBank.fakePno = {sample: genFakePiano(), center: 69, loopStart: 2, loopEnd: 2.25};
window.fakePno = soundBank.fakePno;
