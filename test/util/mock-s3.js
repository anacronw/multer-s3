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

  return { upload: upload }
}

module.exports = createMockS3
