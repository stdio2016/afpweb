const {jianpu_to_pitch} = require('./jianpuAlgo');
const { getAllRecentSongs } = require('./mongo/songs');
require('dotenv').config();

let jianpuDB = {};
let lastDate = new Date(0);
let firstTimeInit = true;

function initDB() {
    return getAllRecentSongs(lastDate).then(results => {
        results.forEach(row => {
            let song = {
                name: row.name,
                id: row.id,
                singer: row.singer,
                language: row.language,
                jianpu: row.jianpu,
                creation_time: row.creation_time,
                modify_time: row.modify_time,
                rev: row.rev,
            };
            if (row.jianpu) {
                let {pitch, duration} = jianpu_to_pitch(row.jianpu);
                song.pitch = pitch;
                song.duration = duration;
            }
            jianpuDB[row.id] = song;
            if (song.modify_time > lastDate) {
                lastDate = song.modify_time;
            }
        });
        if (firstTimeInit) {
            console.log('[initDB] found %d songs in mongodb', results.length);
            firstTimeInit = false;
        }
    }).catch((err) => {
        console.log('[initDB]', err);
    }).finally(() => {
        setTimeout(initDB, Math.random() * 30000 + 30000);
    });
}

module.exports = {
    jianpuDB: jianpuDB,
    initDB
};
