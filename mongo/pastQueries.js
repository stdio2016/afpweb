const { ObjectID } = require('bson');
const { Collection } = require('mongodb');
const {db} = require('./mongoConnect');

async function addPastQuery(method, top_song, query, details) {
    var table = (await db).collection('past_queries');
    return await table.insertOne({
        query_time: new Date(),
        method,
        top_song,
        details,
        query,
        deleted: 0,
    });
}

async function updatePastQuery(id, top_song, query, details) {
    var table = (await db).collection('past_queries');
    return await table.updateOne({
        _id: id,
    }, {
        $set: {
            top_song,
            details,
            query,
        }
    });
}

async function getPastQuery(id) {
    var table = (await db).collection('past_queries');
    try {
        id = new ObjectID(id);
    } catch (err) {
        id = String(id);
    }
    return await table.findOne({
        _id: id,
    });
}

async function listPastQueries() {
    var table = (await db).collection('past_queries');
    return await table.find({
        deleted: 0,
    }, {
        projection: {
            query_time: 1,
            method: 1,
            top_song :1,
        },
    }).toArray();
}

module.exports.addPastQuery = addPastQuery;
module.exports.updatePastQuery = updatePastQuery;
module.exports.getPastQuery = getPastQuery;
module.exports.listPastQueries = listPastQueries;
