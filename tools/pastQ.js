var mysql = require('mysql');
const {db, client} = require('../mongo/mongoConnect');
require('dotenv').config();

var db_option = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    charset : 'utf8mb4',
    port: process.env.MYSQL_PORT,
};

var conn;
async function main() {
    conn = mysql.createConnection(db_option);
    var rows = await new Promise((resolve, reject) => 
        conn.query('select * from past_queries', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        })
    );
    console.log(rows.length);
    var table = (await db).collection('past_queries');
    for (var row of rows) {
        row._id = String(row.id);
        row.details = JSON.parse(row.details);
        delete row.id;
        await table.updateOne({
            _id: row._id,
        }, {
            $set: row,
        }, {
            upsert: true,
        });
    }
}

main().finally(() => {
    conn.destroy();
}).then(async () => {
    (await client).close();
});
