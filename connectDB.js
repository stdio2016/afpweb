var mysql = require('mysql');
const {jianpu_to_pitch} = require('./jianpuAlgo');

var db_option = {
    host: 'localhost',
    user: 'nodejs',
    password: 'nodejs',
    database: 'afpweb',
    port: 3306
};

var conn = mysql.createConnection(db_option);

conn.query(
    `CREATE TABLE IF NOT EXISTS songs (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL,
        singer varchar(100) DEFAULT NULL,
        language varchar(50) DEFAULT NULL,
        jianpu text DEFAULT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    [],
    function (err, results, fields) {
        if (err) throw err;
    }
);

let jianpuDB = {};

conn.query(
    'SELECT * FROM songs',
    [],
    function (err, results, _fields) {
        if (err) throw err;
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
    }
);

module.exports = {
    connection: conn,
    jianpuDB: jianpuDB
};
