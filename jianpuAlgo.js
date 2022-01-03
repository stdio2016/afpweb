function jianpu_to_pitch(jianpu) {
    const pitch_steps = [0, 2, 4, 5, 7, 9, 11]
    const code = []
    const dur = []
    let du_type = 0
    let du_dots = 0
    let du_mul = 0
    let du = 0
    for (var i = 0; i < jianpu.length; i++) {
        let ch = jianpu[i]
        if ('1' <= ch && ch <= '7') {
            let pitch = pitch_steps[ch.charCodeAt(0) - 49]
            if (i > 0) {
                ch = jianpu[i-1]
                if (ch == '#') {
                    pitch += 1
                    if (i > 1 && jianpu[i-2] == '#')
                        pitch += 1
                }
                else if (ch == 'b') {
                    pitch -= 1
                    if (i > 1 && jianpu[i-2] == 'b')
                        pitch -= 1
                }
            }
            code.push(pitch % 12)
            du += 0.5**du_type * (2 - 0.5**du_dots) * (du_mul+1)
            dur.push(du)
            du_type = du_dots = du_mul = du = 0
        }
        else if (ch == '0' || ch == '-') {
            du += 0.5**du_type * (2 - 0.5**du_dots) * (du_mul+1)
            du_type = du_dots = du_mul = 0
        }
        else if (ch == '_')
            du_type += 1
        else if (ch == '=')
            du_type += 2
        else if (ch == '.')
            du_dots += 1
        else if (ch == '-')
            du_mul += 1
    }
    du += 0.5**du_type * (2 - 0.5**du_dots) * (du_mul+1)
    dur.push(du);
    return {pitch: code, duration: dur.slice(1)}
}

function match_score(song, query, song_dur) {
    const ns = song.length, nq = query.length
    if (ns == 0 || nq == 0)
        return 999999
    let dp1 = Array(ns+1).fill(0)
    let dp2 = Array(ns+1).fill(0)
    const avg = song_dur.reduce((p, v) => p+v, 0) / ns
    for (var i = 1; i < ns; i++)
        dp1[i] = Math.max(1.2 - song_dur[i-1] / avg, 0) * 2
    dp1[ns] = 999999
    for (var i = 0; i < nq; i++) {
        dp2[0] = 999999
        for (var j = 0; j < ns; j++) {
            let diff = Math.abs(song[j] - query[i])
            if (diff > 6) diff = 12 - diff
            dp2[j+1] = Math.min(dp1[j] + diff, dp1[j+1] + 4, dp2[j] + 4)
        }
        [dp1, dp2] = [dp2, dp1]
    }
    for (var i = 0; i < ns; i++)
        dp1[i+1] += Math.max(1.2 - song_dur[i] / avg, 0) * 2
    let best = dp1.reduce((p, v) => Math.min(p, v), 999999)
    return best
}

module.exports = {jianpu_to_pitch, match_score};
