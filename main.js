var PushBullet = require('pushbullet');
var exec = require('child_process').exec;

var pusher = new PushBullet(process.env.ACCESS_TOKEN);

var _nickname = process.env.NICKNAME || process.env.HOSTNAME;
var _prefix = process.env.PREFIX || '/tmp';
var _iden = null;
var _since = 0;

console.log('nickname=' + _nickname);

function start_stream(){

  console.log('iden=' + _iden);

  var stream = pusher.stream();

  stream.on('connect', function(){
    console.log('connected');
  });

  stream.on('close', function(){
    console.log('closed');
  });

  stream.on('error', function(){
  });

  stream.on('tickle', function(type){
    if(type == 'push'){
      pusher.history({modified_after: _since}, function(error, response){
        response.pushes.reverse();
        for(i in response.pushes){
          var push = response.pushes[i];
          _since = push.modified;
          if(push.target_device_iden == _iden){
            if(push.type == 'link' && !push.dismissed){
              console.log(String.fromCharCode(0xd83d, 0xdcbe) + '  ' + push.url);
              var child = exec('wget --content-disposition -P ' + _prefix + ' ' + push.url, function(err, stdout, stderr){
                if(err){
                  throw err;
                }else{
                  console.log(unescape('%u2713') + '  ' + push.url);
                }
              });
            }
            pusher.updatePush(push.iden, {dismissed: true},
              function(error, response){
                pusher.deletePush(push.iden, function(error, response){
                });
              }
            );
          }
        }
      });
    }
  });

  stream.connect();

}

pusher.devices(function(error, response){

  for(i in response.devices){

    var device = response.devices[i];

    if(device.nickname == _nickname){

      _iden = device.iden;
      _since = device.modified;
      break;

    }

  }

  if(_iden){

    start_stream();

  }else{

    pusher.createDevice(_nickname, function(error, response){

      _iden = response.iden;
      _since = response.modified;
      start_stream();

    });

  }

});
