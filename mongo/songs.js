const { ObjectID } = require('bson');
const { Collection } = require('mongodb');
const {db} = require('./mongoConnect');

async function listAllSongs() {
    console.time('listAllSongs');
    var table = (await db).collection('songs');
    var cur = table.find({}, {projection:{_id:1, name:1, singer:1, language:1}});
    cur.batchSize(1000);
    var ans = await cur.toArray();
    ans.sort((a, b) => {
        if (a.name > b.name) return 1;
        if (a.name < b.name) return -1;
        return 0;
    });
    for (var row of ans) {
        row.id = row._id;
    }
    console.timeEnd('listAllSongs');
    return ans;
}

async function getSong(id) {
    console.time('getSong');
    var table = (await db).collection('songs');
    var ans = await table.findOne({_id: id});
    if (ans) {
        ans.id = ans._id;
    }
    console.timeEnd('getSong');
    return ans;
}

async function addSong(song) {
    /**
     * @type {Collection<{_id:string}>}
     */
    var table = (await db).collection('songs');
    var revTable = (await db).collection('revisions');
    var id = new ObjectID().toString();
    song.id = id;
    song.rev = 1; // newly created song is revision 1
    var result = await table.findOneAndUpdate({
        _id: id,
    }, {
        $set: song,
        $currentDate: {
            modify_time: true,
            creation_time: true,
        },
    }, {
        upsert: true,
        returnDocument: 'after',
    });
    if (!result.value) {
        throw new Error('Database insert failure');
    }
    var rev = {};
    Object.assign(rev, song);
    rev.creation_time = result.value.creation_time;
    rev.modify_time = result.value.modify_time;
    rev.song_id = id;
    await revTable.insertOne(rev);
    return {
        insertId: result.value._id,
    };
}

async function updateSong(id, song) {
    /**
     * @type {Collection<{_id:string}>}
     */
    var table = (await db).collection('songs');
    var revTable = (await db).collection('revisions');
    delete song.modify_time;
    var result = await table.findOneAndUpdate({_id: id}, {
        $set: song,
        $currentDate: {modify_time: true},
        $inc: {rev: 1},
    }, {
        returnDocument: 'after',
    });
    if (result.value) {
        var rev = {};
        Object.assign(rev, song);
        rev.modify_time = result.value.modify_time;
        rev.song_id = id;
        rev.rev = result.value.rev;
        await revTable.insertOne(rev);
    }
    return {
        affectedRows: result.value ? 1 : 0,
    };
}

async function getNumberOfSongs() {
    console.time('getNumberOfSongs');
    var table = (await db).collection('songs');
    var cnt = await table.countDocuments();
    console.timeEnd('getNumberOfSongs');
    return cnt;
}

async function getAllRecentSongs(fromTime) {
    var table = (await db).collection('songs');
    var query = {};
    if (fromTime) {
        query.modify_time = {
            $gt: new Date(fromTime - 30000)
        };
    }
    var cur = table.find(query);
    cur.batchSize(1000);
    var ans = await cur.toArray();
    for (var row of ans) {
        row.id = row._id;
    }
    return ans;
}

async function listSongRevision(songID) {
    console.time('listSongRevision');
    var table = (await db).collection('revisions');
    var out = await table.find({
        song_id: songID,
    }, {
        batchSize: 21,
        limit: 21,
    }).toArray();
    console.timeEnd('listSongRevision');
    return out;
}

module.exports.listAllSongs = listAllSongs;
module.exports.getSong = getSong;
module.exports.addSong = addSong;
module.exports.updateSong = updateSong;
module.exports.getNumberOfSongs = getNumberOfSongs;
module.exports.getAllRecentSongs = getAllRecentSongs;
module.exports.listSongRevision = listSongRevision;