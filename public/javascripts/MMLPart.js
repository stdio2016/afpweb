// a music part
function MMLPart(partId) {
  if (!(this instanceof MMLPart))
    return new MMLPart(partId);
  this.id = partId || 0;
  this.notes = []; // array of MMLNotes
  // all of the following are used in MMLAssembler
  this.octave = 4; // current octave
  this.volume = 63; // current volume
  this.duration = 4; // current duration
  this.dots = 0; // current dot count of duration
  this.transpose = 0; // current transpose in semitones
  this.pos = 0; // current position. Unit is whole notes
  this.chordMode = false; // next note is in the chord
  this.feel = 1;
  this.tieMode = false;
  this.savedOctave = 4;
}

MMLPart.prototype.toString = function () {
  if (this.notes.length == 0)
    return "[MMLPart !" + this.id + "]";
  return "[MMLPart !" + this.id + "\n  " + this.notes.join("\n  ") + "\n]";
};

MMLPart.prototype.toLegacy = function () {
  var str = "!" + this.id;
  var o = 4;
  for (var i = 0; i < this.notes.length; i++) {
    str += this.notes[i].toLegacy(o);
    if (this.notes[i].type == "note")
    o = Math.floor(this.notes[i].pitch / 12) - 1;
  }
  return str;
};

MMLPart.prototype.makeOfftune = function () {
  for (var i = 0; i < this.notes.length; i++) {
    var n = this.notes[i];
    if (Math.random() < 0.1) n.pitch--;
  }
};

MMLPart.prototype.connectTie = function () {
  var notes = this.notes;
  var chord = [];
  var lastTied = {};
  for (var i = 0; i < notes.length; i++) {
    var n = notes[i];
    // first note of chord
    if (!n.chord) {
      lastTied = {};
      for (var j = 0; j < chord.length; j++) {
        var p = chord[j].pitch;
        if (lastTied[p])
          lastTied[p].push(chord[j]);
        else
          lastTied[p] = [chord[j]];
      }
      chord.length = 0;
    }
    if (n.tieAfter && n.type === "note") {
      chord.push(n);
    }
    if (n.type === "note" && lastTied[n.pitch]) {
      var r = lastTied[n.pitch].shift();
      if (r) {
        n.tieBefore = r;
        r.tieAfter = n;
      }
    }
  }
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].tieAfter === true) {
      notes[i].tieAfter = null;
    }
  }
};

MMLPart.prototype.setTempo = function (tempo) {
  var used = 1, t = 0;
  for (var i = 0; i < this.notes.length; i++) {
    var n = this.notes[i];
    if (n.chord) {
      n.startTime = this.notes[i-1].startTime;
      n.endTime = this.notes[i-1].endTime;
    }
    else {
      while (used < tempo.length && tempo[used].position < n.startTime) {
        t += (tempo[used].position - tempo[used-1].position) * 240 / tempo[used-1].bpm;
        used++;
      }
      n.startTime = t + (n.startTime - tempo[used-1].position) * 240 / tempo[used-1].bpm;
      
      while (used < tempo.length && tempo[used].position < n.endTime) {
        t += (tempo[used].position - tempo[used-1].position) * 240 / tempo[used-1].bpm;
        used++;
      }
      n.endTime = t + (n.endTime - tempo[used-1].position) * 240 / tempo[used-1].bpm;
    }
  }
  while (used < tempo.length && tempo[used].position < this.pos) {
    t += (tempo[used].position - tempo[used-1].position) * 240 / tempo[used-1].bpm;
    used++;
  }
  this.pos = t + (this.pos - tempo[used-1].position) * 240 / tempo[used-1].bpm;
};

MMLPart.prototype.addNote = function (note) {
  var part = this;
  if (part.chordMode) {
    part.chordMode = false;
    part.octave = part.savedOctave;
    note.startTime = part.notes[part.notes.length - 1].startTime;
    note.endTime = part.pos;
  }
  else {
    note.startTime = part.pos;
    var du = 1 / note.duration * (2 - Math.pow(0.5, note.dots));
    note.endTime = part.pos + du * part.feel;
    part.pos += du;
  }
  note.feel = part.feel;
  part.tieMode = false;
  part.notes.push(note);
};

MMLPart.prototype.chordOn = function () {
  if (this.notes.length > 0 && !this.chordMode & !this.tieMode) {
    this.chordMode = true;
    this.savedOctave = this.octave;
    return true;
  }
  return false;
};
