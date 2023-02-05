var actx = new (window.AudioContext || window.webkitAudioContext)();
var master = actx.createGain();
master.gain.value = 1;
master.connect(actx.destination);

var stoppedSound = actx.createGain();
stoppedSound.gain.value = 1e-5;
stoppedSound.connect(actx.destination);

var support = {isChrome: true, isSafari: false, isIOS16: false};
if (!/AppleWebKit\/537\.36/.test(navigator.userAgent)) support.isChrome = false;
if (/AppleWebKit/.test(navigator.userAgent) && !support.isChrome) support.isSafari = true;
if (support.isSafari && /Version\/16\.\d|CPU (iPhone )?OS 16_\d/.test(navigator.userAgent)) {
  support.isIOS16 = true;
}

// for iOS only
var unlocked = false;
function unlock(){
  actx.resume();
  // iOS 16 Safari fix stuck AudioContext
  // see https://stackoverflow.com/questions/69502340/ios-15-web-audio-playback-stops-working-in-safari-after-locking-screen-for-a-fe
  if (support.isIOS16) {
    var audioElt = document.getElementById('keepAudioCtx');
    if (audioElt instanceof HTMLAudioElement && audioElt.paused) {
      audioElt.play();
    }
  }
}
window.addEventListener('touchend', unlock, false);
window.addEventListener('click', unlock, false);

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

// iOS Safari bug from iOS 15, the AudioContext may stuck even though it is in "running" state
var lastTime = -1;
setInterval(function detectAudioContextFailure() {
  if (actx.state === 'running') {
    if (actx.currentTime == lastTime) {
      onAudioContextFail();
      lastTime = 0;
    } else {
      lastTime = actx.currentTime;
    }
  }
}, 2000);

function onAudioContextFail() {
  console.log('audio context fail!!');
  //var xhr = new XMLHttpRequest;
  //xhr.open('GET', '/audioContextFail');
  //xhr.send();
}
