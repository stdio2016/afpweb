function playPitch() {
    var osc = actx.createOscillator();
    osc.type ="square";
    var ga = actx.createGain();
    ga.gain.value = 0.3;
    osc.connect(ga);
    ga.connect(master);
    var c = pitchSeq.innerText;
    try {
        c = JSON.parse(c);
    } catch (x) {
        c = JSON.parse(c.replace(/\s+/g, ','));
    }
    var t = actx.currentTime;
    var fps = 20;
    for (var i = 0; i < c.length; i++) {
        var pitch = 440 * 2**((c[i]-69)/12);
        osc.frequency.setValueAtTime(pitch, t);
        ga.gain.setValueAtTime(c[i] === -1 ? 0 : 0.3, t);
        t += 1/fps;
    }
    osc.start();
    osc.stop(t);
}
