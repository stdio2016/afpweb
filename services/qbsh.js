const {jianpuDB, initDB} = require('../connectDB');
const fs = require('fs');
const je = require('../public/javascripts/je');
const spawn = require('child_process').spawn;

function toPitchList(score) {
    let list = [];
    let pitch = 60;
    let t = 0;
    score.forEach(meas => {
        meas.forEach(x => {
            if (x instanceof je.Note) {
                let du = 8 / 2**x.duration.type * x.duration.mul * (2 - 0.5**x.duration.dots);
                let myPitch = x.pitch.step;
                if (myPitch >= '1' && myPitch <= '7') {
                    pitch = [0,0,2,4,5,7,9,11][+myPitch] + 60 + x.pitch.octave * 12;
                    var acc = x.pitch.accidental;
                    if (acc == '♯') pitch += 1;
                    if (acc == '♯♯') pitch += 2;
                    if (acc == '♭') pitch -= 1;
                    if (acc == '♭♭') pitch -= 2;
                }
                t += du;
                while (list.length < t) {
                    list.push(pitch);
                }
            }
        })
    });
    return list;
}

function buildQbshIndex() {
    var fout = fs.createWriteStream('pitchDB.txt');
    for (var songId in jianpuDB) {
        var song = jianpuDB[songId];
        if (song.jianpu) {
            let score = je.parseJianpu(song.jianpu);
            let pitchList = toPitchList(score);
            fout.write(`${song.name}\n${songId}\n${pitchList.join(' ')}\n`);
        }
    }
    return new Promise(resolve => {
        fout.end();
        fout.on('finish', resolve);
    });
}

let proc;
function procExitHandler(exitCode) {
    if (exitCode == 1) {
        throw new Error('cannot start server');
    }
    else {
        console.error('Qbsh server unexpectedly exited. restarting');
        setTimeout(startServer, 1000);
    }
}

function startServer() {
    if (proc) proc.kill();
    proc = spawn('./qbshServer', ['pitchDB.txt'], {stdio: ['pipe','inherit','inherit']});
    proc.on('exit', procExitHandler);
}

function waitForMsecs(msecs) {
    return new Promise(resolve => {
        setTimeout(resolve, msecs);
    });
}

// my current qbsh server cannot dynamically add songs,
// so I need to restart server after every song edit!
let restartCooldown = 0;
let restartPending = false;
async function restartServer() {
    // don't restart server too frequently
    var now = +new Date();
    if (now < restartCooldown) {
        if (restartPending) return;
        restartPending = true;
        await waitForMsecs(restartCooldown - now);
        restartPending = false;
    }
    restartCooldown = now + 10000; // 10 seconds of cooldown
    var prom = new Promise(resolve => proc.on('exit', resolve));
    try {
        proc.off('exit', procExitHandler);
        console.log('WORKAROUND: restart server due to database update');
        proc.kill();
    } catch (x) {
        console.error(x);
    }
    await buildQbshIndex();
    if (proc.exitCode === null) {
        await prom;
    }
    startServer();
}

initDB().then(buildQbshIndex).then(startServer);
module.exports = {
    restartServer, 
};
