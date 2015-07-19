var multerS3 = require('../../index');
var should = require('chai').should();

describe('multer-s3', function(){
  it('is exposed as a function', function(){
    multerS3.should.be.a('function');
  })
  it('accepts s3 options', function(){
    multerS3({bucket: 'bucket', accessKeyId: 'accessKeyId', secretAccessKey: 'secretAccessKey', region: 'region'})
  });
  it('implements _handleFile', function(){
    var upload = multerS3({bucket: 'bucket', accessKeyId: 'accessKeyId', secretAccessKey: 'secretAccessKey', region: 'region'})
    upload._handleFile.should.be.a('function')
  });
  it('implements _removeFile', function(){
    var upload = multerS3({bucket: 'bucket', accessKeyId: 'accessKeyId', secretAccessKey: 'secretAccessKey', region: 'region'})
    upload._removeFile.should.be.a('function')
  });
});
