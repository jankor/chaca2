const mysql = require('./mysql.js')

async function init() {
  const connection = await mysql.connect()
  for (let i = 0, len = 100000; i < len; i++) {
    const result = await connection.query('INSERT INTO commlog_data SET ?', {
      commlog_data_fobj: 'cust',
      commlog_data_fkey: 12345678,
      commlog_data_fobj2: 'order',
      commlog_data_fkey2: 12345678,
      commlog_data_text: 'Very sorry, A, but your order was cancelled. You can re-order with your account balance of £15.49 or check your email for refund info.',
      commlog_data_string: '123456789'
    })
    await connection.query('INSERT INTO commlog SET ?', {
      commlog_status: 'New',
      comm_id: 9713,
      commlog_fkey: result.insertId,
      commlog_fkey2: 0,
    })
  }
}

init ()
