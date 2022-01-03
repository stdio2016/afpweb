// an MML music note
function MMLNote(pitch, duration, dots) {
  if (!(this instanceof MMLNote)) {
    return new MMLNote(pitch, duration);
  }
  if (pitch === "rest") {
    this.type = "rest"; // type of note, can be "note" or "rest"
    this.pitch = 0; // MIDI pitch number
  }
  else {
    this.type = "note";
    if (pitch > MMLNote.MAX_PITCH) {
      pitch = (pitch - 1 - MMLNote.MAX_PITCH) % 12 + MMLNote.MAX_PITCH - 11;
    }
    if (pitch < MMLNote.MIN_PITCH) {
      pitch = MMLNote.MIN_PITCH + 11 - (MMLNote.MIN_PITCH - 1 - pitch) % 12;
    }
    this.pitch = pitch;
  }
  this.tieBefore = null; // a MMLNote connecting to this note
  this.tieAfter = null; // a MMLNote this note connects to
  this.volume = 0.5; // volume of the note, from 0 to 1
  this.source = -1; // <span> elements that contains the music code
  this.chord = false; // this note is part of a chord
  this.duration = duration;
  this.dots = dots; // dot count, can be either 0 or 1
  this.startTime = 0;
  this.endTime = 0;
  this.feel = 1;
}

MMLNote.MAX_DURATION = 128;
MMLNote.MAX_PITCH = 127;
MMLNote.MIN_PITCH = 0;
MMLNote.MAX_OCTAVE = 9;
MMLNote.MIN_OCTAVE = -1;
MMLNote.MAX_TEMPO = 999;
MMLNote.MIN_TEMPO = 20;
MMLNote.MAX_PART = 999;

MMLNote.prototype.toString = function () {
  if (this.type == "rest") {
    return "[MMLNote P" + this.duration + "]";
  }
  else {
    var octave = Math.floor(this.pitch / 12) - 1;
    if (octave < 0) octave = "0<";
    var noteName = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"][this.pitch % 12];
    return "[MMLNote " + (this.chord ? "/" : "") +
      (this.tieBefore ? "~" : "") + "V" + Math.round(this.volume * 127) +
      " O" + octave + " " + noteName + (this.duration || "") + (this.dots ? "." : "") +
      (this.tieAfter ? "~" : "") + "]";
  }
};

MMLNote.prototype.toLegacy = function (octave) {
  if (octave == null) octave = 4;
  var str = "";
  if (this.type == "rest") str = "P";
  else {
    if (this.chord) str += "/";
    var o = Math.floor(this.pitch / 12) - 1;
    if (o == octave+1) str += ">";
    else if (o == octave-1) str += "<";
    else if (o == octave) ;
    else {
      if (o < 0) str += "O0<";
      else str += "O" + o;
    }
    str += ["C","C+","D","D+","E","F","F+","G","G+","A","A+","B"][this.pitch % 12];
  }
  if (this.duration) str += this.duration;
  if (this.dots) str += ".";
  if (this.tieAfter) str += "~";
  return str;
};
