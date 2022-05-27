var events = require('events')

function createMockS3 () {
  function send (opts, cb) {
    var ee = new events.EventEmitter()
    var buffer = opts['input']['Body']
    ee.emit('httpUploadProgress', { total: buffer.length })
    return Promise.resolve({
      Location: 'mock-location',
      ETag: 'mock-etag'
    })
  }

  return { send: send }
}

module.exports = createMockS3
