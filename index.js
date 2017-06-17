process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const util = require('util')
const setImmediatePromise = util.promisify(setImmediate)
const fetch = require('node-fetch')
const mysql = require('./mysql.js')
const smsWorker = require('./workers/sms.js')
const queueSize = 10000

function fillQueue(connection) {
  return connection.query('SELECT * FROM commlog WHERE commlog_status = "New" AND comm_id=9713 LIMIT ?', [queueSize]) 
}

function pushQueue(connection, finishedQueue) {
  if (finishedQueue.length === 0) return
  try {
    const queryString = 'UPDATE commlog SET commlog_status = "Sent" WHERE commlog_id IN(?)'
    return connection.query(queryString, [finishedQueue])
  } catch (error) {
    console.log('update error', error.message)
  }
  console.log(finishedQueue.join(','))
}

async function processItem(connection, item) {
  if (!item) return
  try {
    const query = await connection.query('SELECT * FROM commlog_data WHERE commlog_data_id = ?', [item.commlog_fkey])
    const result = await smsWorker.sendSms(fetch, {test: query})
  } catch (error) {
    //console.log('process error', error.message)
  }
  return item.commlog_id;
}

async function processingLoop(connection) {
  let processingTime = Date.now()
  const processQueue = await fillQueue(connection)
  const promiseQueue = processQueue.map(queueItem => processItem(connection, queueItem))
  const finishedQueue = await Promise.all(promiseQueue);
  await setImmediatePromise()
  //console.log('After I/O callbacks')
  await pushQueue(connection, finishedQueue)
  console.log("took: ", (Date.now() - processingTime)/1000, 's')
  processingLoop(connection)
}

async function init() {
  const connection = await mysql.connect()
  await processingLoop(connection)
}

init ();