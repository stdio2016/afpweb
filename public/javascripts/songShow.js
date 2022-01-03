var je;
addEventListener('load', function () {
  document.querySelectorAll('.to-jianpu').forEach(function (elt) {
    je = renderJianpu(elt);
  })
});

function play() {
  playJianpu(je);
}
function playJianpu(je) {
  var part = new MMLPart(0);
  var tempos = [{position: 0, bpm: 120}];
  var oldPitch = 60;
  var view = {notes:[]};
  for (var i = 0; i < je.length; i++) {
    var me = je[i];
    for (var j = 0; j < me.length; j++) {
      if (me[j] instanceof Note) {
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
        if (tied) part.notes[part.notes.length-1].tieAfter = true;
        part.addNote(note);
        oldPitch = pitch;
      }
    }
  }
  part.setTempo(tempos);
  part.connectTie();
  var player = new MMLPlayer(part);
  player.view = view;
  player.play();
}
