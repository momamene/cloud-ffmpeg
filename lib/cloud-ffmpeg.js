const ffmpeg = require('fluent-ffmpeg');
const _ = require('lodash');
const uuidV4 = require('uuid/v4');
const fs = require('fs');

class CloudFFmpeg {

  constructor(config) {
    this.config = config || {
      tempPath: '/tmp/'
    };
  }

  ffmpegLogCallback(error, stdout, stderr) {
    console.log('[ERROR]: ' + error.message);
    console.log('[STDOUT]: ' + stdout);
    console.log('[STDERR]: ' + stderr);
  }

  getStorage(storage) {
    switch (storage) {
    case "azure":
      return require('./storage/azure');
    }
    return undefined;
  }

  createFFmpegCommand() {
    return ffmpeg()
      .on('error', this.ffmpegLogCallback)
      .on('end', this.ffmpegLogCallback);
  }

  addInput(command, source) {
    const options = source.ffmpegOptions || {};
    const CloudStorage = this.getStorage(source.storage);
    const storage = new CloudStorage();
    let url = storage.downloadUrl(source.path);
    return command
      .input(url)
      .inputOptions(options);
  }
  
  addOutput(command, source) {
    const options = source.ffmpegOptions || {};
    const CloudStorage = this.getStorage(source.storage);
    const storage = new CloudStorage();
    const path = this.config.tempPath + uuidV4() + '.' + source.path.blobName;
    return command
      .output(path)
      .outputOptions(options);
  }

  encode(data) {
    let command = this.createFFmpegCommand();
    command = data.input.reduce(
      this.addInput.bind(this),
      command
    );
    command = data.output.reduce(
      this.addOutput.bind(this),
      command
    );

    const result = _.zip(
      data.output,
      command._outputs.map((output) => output.target)
    ).map(sourceWithLocalPath => {
      return {
        storage: sourceWithLocalPath[0].storage,
        cloudPath: sourceWithLocalPath[0].path,
        localPath: sourceWithLocalPath[1]
      };
    });

    return new Promise((resolve, reject) => {
      command.on('end', (stdout, stderr) => {
        resolve(result);
      }).on('error', (stdout, stderr) => {
        reject(result);
      }).run();
    });
  }

  uploadAndUnlink(encodeResult) {
    const uploadTasks = encodeResult.map((output) => {
      const CloudStorage = this.getStorage(output.storage);
      const storage = new CloudStorage();
      return storage.uploadFile(
        output.cloudPath, output.localPath
      ).then(() => {
        // Remove local file after finishing upload
        fs.unlinkSync(output.localPath);
      });
    });
    return Promise.all(uploadTasks);
  }

  run(data) {
    return this.encode(data)
      .then(this.uploadAndUnlink.bind(this));
  }
}

module.exports = CloudFFmpeg;
