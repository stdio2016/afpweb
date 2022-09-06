const { ObjectID } = require('bson');
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
    var table = (await db).collection('songs');
    var result = await table.updateOne({
        _id: new ObjectID().toString()
    }, {
        $set: song,
        $currentDate: {
            modify_time: true,
            creation_time: true,
        },
    }, {
        upsert: true
    });
    return {
        insertId: result.upsertedId
    };
}

async function updateSong(id, song) {
    var table = (await db).collection('songs');
    delete song.modify_time;
    var result = await table.updateOne({_id: id}, {
        $set: song,
        $currentDate: {modify_time: true},
    });
    return {
        affectedRows: result.matchedCount,
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

module.exports.listAllSongs = listAllSongs;
module.exports.getSong = getSong;
module.exports.addSong = addSong;
module.exports.updateSong = updateSong;
module.exports.getNumberOfSongs = getNumberOfSongs;
module.exports.getAllRecentSongs = getAllRecentSongs;
