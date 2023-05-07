var je;
addEventListener('load', function () {
  document.querySelectorAll('.to-jianpu').forEach(function (elt) {
    if (qbshfrom != -1 && qbshto != -1) {
      elt.dataset.qbshfrom = qbshfrom;
      elt.dataset.qbshto = qbshto;
    }
    je = renderJianpu(elt);
  })
});

var key=null, bpm=0, qbshfrom=-1, qbshto=-1;
function setKey() {
  var dict = {};
  if (location.hash) {
    var x = location.hash.substring(1).split('&');
    for (var i = 0; i < x.length; i++) {
      var n = x[i].indexOf('=');
      if (n >= 0) {
        var name = x[i].substring(0, n);
        var value = x[i].substring(n+1);
        dict[name] = value;
      }
    }
  }
  if (dict.key && /[A-G]b?/.test(dict.key)) {
    var k = [9,11,0,2,4,5,7][dict.key.charCodeAt(0) - 65];
    key = k - (dict.key.length-1);
    if (key > 6) key -= 12;
  }
  var b=parseFloat(dict.bpm);
  if (b >= 20) {
    bpm = b;
  }
  if (parseFloat(dict.qbshfrom)>=0) qbshfrom=parseFloat(dict.qbshfrom);
  if (parseFloat(dict.qbshto)>=0) qbshto=parseFloat(dict.qbshto);
}
setKey();
addEventListener('hashchange', setKey);
function play() {
  playJianpu(je);
}
function playJianpu(je, songid) {
  actx.resume();
  var part = new MMLPart(0);
  var tempos = [{position: 0, bpm: bpm}];
  var myKey = 0;
  if (je.key == null) {
    // music sheet has no preset key
    myKey = key;
  } else {
    myKey = key == null ? je.key : key;
  }
  var tmpKey = 0;
  if (bpm == 0) {
    tempos = [];
  }
  var oldPitch = 'rest';
  var view = {notes:[]};
  var beat = 0;
  for (var i = 0; i < je.length; i++) {
    var me = je[i];
    if (bpm == 0) {
      tempos.push({position: beat, bpm: je[i].bpm});
    }
    for (var j = 0; j < me.length; j++) {
      if (me[j] instanceof Note) {
        if (me[j].transpose) tmpKey += me[j].transpose;
        var du = 4 * 2**me[j].duration.type / me[j].duration.mul;
        var pitch;
        var tied = false;
        if (me[j].pitch.step == '0') {
          pitch = 'rest';
        }
        else {
          pitch = me[j].pitch.step;
          if (pitch >= '1' && pitch <= '7') {
            pitch = [0,0,2,4,5,7,9,11][+me[j].pitch.step] + 60 + me[j].pitch.octave * 12;
            var acc = me[j].pitch.accidental;
            if (acc == '♯') pitch += 1;
            if (acc == '♯♯') pitch += 2;
            if (acc == '♭') pitch -= 1;
            if (acc == '♭♭') pitch -= 2;
            pitch += myKey + tmpKey;
          }
          else if (pitch == '-') {
            pitch = oldPitch;
            tied = true;
          }
          else pitch = 'rest';
        }
        var note = new MMLNote(pitch, du, me[j].duration.dots);
        note.source = view.notes.length;
        view.notes.push({span: me[j].note_svg});
        if (tied && part.notes.length > 0)
          part.notes[part.notes.length-1].tieAfter = true;
        part.addNote(note);
        oldPitch = pitch;
        beat += 1 / du;
      }
    }
  }
  part.setTempo(tempos);
  part.connectTie();
  var player = new MMLPlayer(part);
  player.view = view;
  player.play();
  if (songid) {
    var xhr = new XMLHttpRequest;
    xhr.open('GET', '/youplayed/' + songid);
    xhr.send();
  }
  return player;
}
function debounce(func) {
  var time = 0;
  var scheduled = false;
  return function () {
    var now = new Date();
    if (scheduled) return;
    if (+now > +time) {
      func();
      time = +now + 300;
    } else {
      setTimeout(function () {
        scheduled = false;
        func();
        time = +new Date() + 300;
      }, time - now);
      scheduled = true;
    }
  };
}
