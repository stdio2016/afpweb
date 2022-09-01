const { ObjectID } = require('bson');
const {client} = require('./mongoConnect');

async function listAllSongs() {
    var table = (await client).db().collection('songs');
    var cur = table.find({}, {projection:{id:1, name:1, singer:1, language:1}});
    cur.batchSize(1000);
    var ans = await cur.toArray();
    ans.sort((a, b) => {
        if (a.name > b.name) return 1;
        if (a.name < b.name) return -1;
        return 0;
    });
    return ans;
}

async function getSong(id) {
    var table = (await client).db().collection('songs');
    if (parseInt(id, 10)) id = parseInt(id, 10);
    var ans = table.findOne({id: id});
    return ans;
}

module.exports.listAllSongs = listAllSongs;
module.exports.getSong = getSong;
