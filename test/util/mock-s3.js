var events = require('events')
var concat = require('concat-stream')

function createMockS3 () {
  function upload (opts) {
    var ee = new events.EventEmitter()

    ee.send = function send (cb) {
      opts['Body'].pipe(concat(function (body) {
        ee.emit('httpUploadProgress', { total: body.length })
        cb(null, {
          'Location': 'mock-location',
          'ETag': 'mock-etag'
        })
      }))
    }

    return ee
  }

  function send (opts, cb) {
    var ee = new events.EventEmitter()
    var buffer = opts['input']['Body']
    ee.emit('httpUploadProgress', { total: buffer.length })
    return Promise.resolve({
      Location: 'mock-location',
      ETag: 'mock-etag'
    })
  }

  return {
    upload: upload,
    send: send
  }
}

module.exports = createMockS3
