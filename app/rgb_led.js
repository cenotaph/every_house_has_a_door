var fs = require('fs');
var sleep = require('sleep');

var exports = module.exports = {};

var config = {
  clk_gpio:"/sys/class/gpio/gpio39/value",
  data_gpio:"/sys/class/gpio/gpio38/value"
};

exports.initRGB = function(opts) {
  if(opts){
    for(cfg in config){
      if(opts[cfg] != undefined){
        config[cfg] = opts[cfg];
      }
    }
  }
  fs.writeFileSync(config["clk_gpio"], 1);
  sleep.usleep(20);
  //exports.setColor(0,0,0);
};

exports.clk = function(){
  fs.writeFileSync(config["clk_gpio"], 0);
  sleep.usleep(20);
  fs.writeFileSync(config["clk_gpio"], 1);
  sleep.usleep(20);
};

exports.sendByte = function(b){
  for(var i = 0; i < 8; i++){
    if((b & 0x80) != 0){
      fs.writeFileSync(config["data_gpio"], 1);
    } else {
      fs.writeFileSync(config["data_gpio"], 0);
    }
    exports.clk();
    b = b << 1;
  }
};

exports.sendColor = function(red,green,blue){
  var prefix = 0xC0;
  if((blue & 0x80) == 0){
    prefix |= 0x20;
  }
  if((blue & 0x40) == 0){
    prefix |= 0x10;
  }
  if((green & 0x80) == 0){
    prefix |= 0x08;
  }
  if((green & 0x40) == 0){
    prefix |= 0x04;
  }
  if((red & 0x80) == 0){
    prefix |= 0x02;
  }
  if((red & 0x40) == 0){
    prefix |= 0x01;
  }
  exports.sendByte(prefix);
  exports.sendByte(blue);
  exports.sendByte(green);
  exports.sendByte(red);
};

exports.setColor = function(red,green,blue){
  exports.sendByte(0x00);
  exports.sendByte(0x00);
  exports.sendByte(0x00);
  exports.sendByte(0x00);

  exports.sendColor(red,green,blue);

  exports.sendByte(0x00);
  exports.sendByte(0x00);
  exports.sendByte(0x00);
  exports.sendByte(0x00);
};
