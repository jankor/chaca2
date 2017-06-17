const util = require('util')
const setImmediatePromise = util.promisify(setImmediate)
const fetch = require('node-fetch')
const mysql = require('./mysql.js')
const smsWorker = require('./workers/sms.js')
let processQueue = {}
let finishedQueue = {}
const queueSize = 1000

async function fillQueue(connection) {
  if (Object.keys(processQueue).length >= queueSize) return;
  const result = await connection.query('SELECT * FROM commlog WHERE commlog_status = "New" AND comm_id=9713 LIMIT ?', [queueSize])
  for (let i = 0, len = result.length; i < len; i++) {
    if (finishedQueue[result[i].commlog_id]) continue
    processQueue[result[i].commlog_id] = result[i]
  }
}

async function pushQueue(connection) {
  if (Object.keys(finishedQueue) <= queueSize) return;
  let errorIds = [];
  for (const key of Object.keys(finishedQueue)) {
    errorIds.push(key)
  }
  const queryString = 'UPDATE commlog SET commlog_status = "Sent" WHERE commlog_id IN(?)'
  const result = await connection.query(queryString, [errorIds.join(',')])
  finishedQueue = {}
  console.log(errorIds.join(','))
}

async function processItem(connection, item) {
  try {
    const query = await connection.query('SELECT * FROM comm_data WHERE comm_data_id = ?', [item.commlog_fkey])
    const result = await smsWorker.sendSms(fetch, {test: query})
    return 'Sent'
  } catch (error) {
    //console.log(error)
    return 'Error'
  }
}

async function processingLoop(connection) {
  await fillQueue(connection);
  for (const key of Object.keys(processQueue)) {
    finishedQueue[processQueue[key].commlog_id]
      = await processItem(connection, processQueue[key]);
    delete processQueue[key]
  }
  await setImmediatePromise()
  //console.log('After I/O callbacks')
  await pushQueue(connection)
  processingLoop(connection)
}

async function init() {
  const connection = await mysql.connect()
  await processingLoop(connection)
}

init ();