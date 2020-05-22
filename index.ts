const NodeWebcam = require( "node-webcam" );

const CAMERA_NAME = 'FaceTime HDカメラ（内蔵）';
const TEMP_PHOTO_FILE = 'temppicture';
const opts = {
    width: 1280,
    height: 720,
    quality: 100,
    frames: 60,
    delay: 2,
    saveShots: true,
    output: "jpeg",
    device: CAMERA_NAME,
    callbackReturn: "location",
    verbose: false
};

const camera = NodeWebcam.create(opts)
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

async  function capturePhotoAndDetectLabels():Promise<[]>{
  return new Promise((resolve, reject)=>{
    camera.capture(TEMP_PHOTO_FILE, (err, data)=>{
      if(err) return reject(err);
      client.labelDetection(`./${data}`, (err, result)=>{
        if(err) return reject(err);
        resolve(result.labelAnnotations);
      });
    });
  })
}

const schedule = require('node-schedule');
const async = require('async');
const request = require('request');

// todo: ルーティンを増やしたらconfig化する
schedule.scheduleJob('/20 * * * * *', ()=>{
  async.retry({times:10, interval: 1000}, cb =>{
    console.log('attempt')
    capturePhotoAndDetectLabels().then((labels:Array<{description:string}>)=>{
      if(labels.some(label=>label.description==='Vacuum cleaner')) return cb(null, true);
      cb(new Error('retry'));
    });
  }, (err, results)=>{
    if(results) return;
    // アラート
    request({url:require('./config').ZAPIER_HOOK_URL , method:'POST', json:{hoge:true}},(err, res, body)=>{
      if(err)console.error(err)
      console.log(body);
    });
  });
});