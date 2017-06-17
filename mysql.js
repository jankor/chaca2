const mysql = require('promise-mysql')

module.exports.connect = () => 
  mysql.createConnection({
    host: '192.168.33.10',
    user: 'lab',
    password: 'lab',
    database: 'hh_uk_prod'
  })