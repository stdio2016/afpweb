var mysql = require('mysql');
const {jianpu_to_pitch} = require('./jianpuAlgo');
const spawn = require('child_process').spawn;
require('dotenv').config();

var db_option = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    charset : 'utf8mb4',
    port: process.env.MYSQL_PORT,
};

var conn = mysql.createPool(db_option);

function querySQL(sql, values) {
    return new Promise((resolve, reject) => {
        conn.query(sql, values, function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

conn.query(
    `CREATE TABLE IF NOT EXISTS songs (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL,
        singer varchar(100) DEFAULT NULL,
        language varchar(50) DEFAULT NULL,
        jianpu text DEFAULT NULL,
        creation_time timestamp DEFAULT CURRENT_TIMESTAMP,
        modify_time timestamp DEFAULT current_timestamp ON UPDATE current_timestamp,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    [],
    function (err, results, fields) {
        if (err) throw err;
    }
);
conn.query(
    `CREATE TABLE IF NOT EXISTS past_queries (
        id int(11) NOT NULL AUTO_INCREMENT,
        query_time timestamp DEFAULT CURRENT_TIMESTAMP,
        method varchar(50) NOT NULL,
        top_song varchar(255),
        query text,
        details text,
        deleted int NOT NULL DEFAULT 0,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    [],
    function (err, results, fields) {
        if (err) throw err;
    }
);

let jianpuDB = {};

function initDB() {
    return querySQL('SELECT * FROM songs', []).then(results => {
        results.forEach(row => {
            let song = {
                name: row.name,
                id: row.id,
                singer: row.singer,
                language: row.language,
                jianpu: row.jianpu,
            };
            if (row.jianpu) {
                let {pitch, duration} = jianpu_to_pitch(row.jianpu);
                song.pitch = pitch;
                song.duration = duration;
            }
            jianpuDB[row.id] = song;
            console.log(row.name);
        });
    });
}

module.exports = {
    querySQL: querySQL,
    jianpuDB: jianpuDB,
    initDB
};
