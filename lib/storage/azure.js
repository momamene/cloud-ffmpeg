const azure = require('azure-storage');

class AzureStorage {
  constructor() {
    this._blobService = azure.createBlobService();
  }  

  downloadStreamResponse(error, result, response) {
    if (error) {
      console.log(error);
    } else {
      console.log(result);
    }
  }
  
  downloadStream(cloudPath) {
    return this._blobService.createReadStream(
      cloudPath.containerName,
      cloudPath.blobName,
      this.downloadStreamResponse
    );
  }

  downloadUrl(cloudPath) {
    const expiryHours = 10;
    const startDate = new Date();
    let expiryDate = new Date(startDate);
    expiryDate.setHours(startDate.getHours() + expiryHours);

    var sharedAccessPolicy = {
      AccessPolicy: {
        Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
        Start: startDate,
        Expiry: expiryDate
      }
    };

    var token = this._blobService.generateSharedAccessSignature(
      cloudPath.containerName,
      cloudPath.blobName,
      sharedAccessPolicy
    );
    
    return this._blobService.getUrl(
      cloudPath.containerName,
      cloudPath.blobName,
      token
    );
  }
  
  uploadStreamResponse(resolve, reject) {
    return (error, result, response) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log(result);
        resolve(result);
      }
    };
  }  

  createContainerIfNotExists(containerName) {
    return new Promise((resolve, reject) => {
      this._blobService.createContainerIfNotExists(
        containerName,
        { publicAccessLevel: null },
        this.uploadStreamResponse(resolve, reject)
      );
    });
  }

  _uploadStream(cloudPath, stream) {
    const streamLength = 4 * 1024 * 1024;
    const uploadOptions = {};
    return new Promise((resolve, reject) => {
      this._blobService.createBlockBlobFromStream(
        cloudPath.containerName,
        cloudPath.blobName,
        stream,
        streamLength,
        uploadOptions,
        this.uploadStreamResponse(resolve, reject)
      );
    });
  }
  
  uploadStream(cloudPath, stream) {
    return this.createContainerIfNotExists(cloudPath.containerName)
      .then(this._uploadStream(cloudPath, stream));
  }

  _uploadFile(cloudPath, localPath) {
    const streamLength = 4 * 1024 * 1024;
    const uploadOptions = {};
    return new Promise((resolve, reject) => {
      this._blobService.createBlockBlobFromLocalFile(
        cloudPath.containerName,
        cloudPath.blobName,
        localPath,
        uploadOptions,
        this.uploadStreamResponse(resolve, reject)
      );
    });
  }

  uploadFile(cloudPath, localPath) {
    return this.createContainerIfNotExists(cloudPath.containerName)
      .then(this._uploadFile(cloudPath, localPath));
  }
}

module.exports = AzureStorage;
