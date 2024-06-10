function playPitch() {
    var timbreRe = new Float32Array(21);
    var timbreIm = new Float32Array(21);
    for (var i = 1; i <= 20; i++) timbreIm[i] = Math.exp((i-1) * -0.25);
    var timbre = actx.createPeriodicWave(timbreRe, timbreIm);
    var osc = actx.createOscillator();
    osc.setPeriodicWave(timbre);
    var ga = actx.createGain();
    ga.gain.value = 0.3;
    osc.connect(ga);
    ga.connect(master);
    var c = pitchSeq.textContent;
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
