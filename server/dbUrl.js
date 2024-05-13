const mysql = require('mysql2');

const con = mysql.createConnection({
    host: 'localhost',
    user: "root",
    password: "",
    database: "talently"
});

con.connect((err) => {
    if (err) {
        console.log('mySQL database connection error: ', err);
    } else {
        console.log("Connected to database");
    }
});

module.exports = con;