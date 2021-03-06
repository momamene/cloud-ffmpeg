const fs = require('fs-extra');
const BaseStorage = require('./base-storage');

class LocalStorage extends BaseStorage {
  downloadStream(storagePath) {
    let path = storagePath.location + storagePath.targetName;
    return fs.createReadStream(path);
  }

  createDirectoryIfNotExists(storagePath) {
    return fs.ensureDir(storagePath);
  }

  _uploadStream(storagePath, stream) {
    return new Promise((resolve, reject) => {
      fs.createWriteStream(storagePath);
    });
  }

  uploadStream(storagePath, stream) {
    let path = storagePath.location + storagePath.targetName;
    return this.createDirectoryIfNotExists(path)
      .then(this._uploadStream(path, stream));
  }

  _uploadFile(storagePath, tempPath) {
    return new Promise((resolve, reject) => {
      var readStream = fs.createReadStream(tempPath),
          writeStream = fs.createWriteStream(storagePath);
      readStream.pipe(writeStream);
    });
  }

  uploadFile(storagePath, tempPath) {
    let path = storagePath.location + storagePath.targetName;
    return this.createDirectoryIfNotExists(storagePath.location)
      .then(this._uploadFile(path, tempPath));
  }
}

module.exports = LocalStorage;
