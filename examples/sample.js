const CloudFFmpeg = require('../lib/cloud-ffmpeg');
const fs = require('fs');

const json = fs.readFileSync('./sample.json');
const data = JSON.parse(json);

const config = {
  tempPath: '/tmp/'
};

const startDate = new Date();

const cloudFFmpeg = new CloudFFmpeg(config);
cloudFFmpeg.run(data).then((responses) => {
  const endDate = new Date();
  console.log(responses);
  console.log("Taking times : " + (endDate - startDate));
  console.log("Job's done!");
});
