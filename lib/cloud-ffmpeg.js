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
    if (error !== "")
     console.log('[ERROR]: ' + error.message);
    console.log('[STDOUT]: ' + stdout);
    if (stderr !== undefined)
      console.log('[STDERR]: ' + stderr);
  }

  getStorage(storage) {
    switch (storage) {
    case "azure":
      return require('./storage/azure');
    case "local":
      return require('./storage/local');
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
    let stream = storage.downloadStream(source.path);
    return command
      .input(stream)
      .inputOptions(options);
  }

  addOutput(command, source) {
    const options = source.ffmpegOptions || {};
    const CloudStorage = this.getStorage(source.storage);
    const storage = new CloudStorage();
    const path = this.config.tempPath + uuidV4() + '.' + source.path.targetName;
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
        storagePath: sourceWithLocalPath[0].path,
        tempPath: sourceWithLocalPath[1]
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
        output.storagePath, output.tempPath
      ).then(() => {
        // Remove local file after finishing upload
        fs.unlink(output.tempPath);
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
