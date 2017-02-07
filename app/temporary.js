var request = require("request");
var fs = require('fs');
var sleep = require('sleep');
const Freefare = require('freefare/index');
var moment = require("moment");
var nfc  = require('nfc').nfc;
var util = require('util');
var weblock = require('lockfile');
var led = require("./rgb_led.js");
var yaml_config = require('node-yaml-config');
 
var config = yaml_config.load('config/config.yml');
 



led.initRGB();

function Logger(){
}
function checkBin(n){return/^[01]{1,64}$/.test(n)}
function bin2hex(n){if(!checkBin(n))return 0;return parseInt(n,2).toString(16)}



Logger.prototype.plain = function(message){
 console.log(message);
}

Logger.prototype.log = function(message){
 var current_date = new Date();
 var str_date = moment(current_date).format("YYYY-MM-DD HH:mm Z");
 console.log(str_date + ": " + message);
}

var logger = new Logger();

function switch_relay(on){
 fs.writeFile("/sys/class/gpio/gpio7/value", on, function(err) {
 if(err) {
   return logger.log(err);
 }
   //logger.log("Relay has switched to: " + on);
 });
}

function toggle_relay(){
 switch_relay(1);
 setTimeout(function(){
   switch_relay(0);
 },1000);
}



function bip(on){
 fs.writeFile("/sys/class/gpio/gpio38/value", on, function(err) {
 if(err) {
   return logger.log(err);
 }
   //logger.log("Beep has switched to: " + on);
 });
}

function toggle_bip(duration,callback){
 bip(1);
 setTimeout(function(){
   bip(0);
   if(callback){
     callback();
   }
 },duration);
}

function bip_read(callback){
 toggle_bip(200,callback);
}

function bip_success(callback){
 toggle_bip(600,callback);
}


function bip_error(callback){
 toggle_bip(300,function(){
   setTimeout(function(){
     toggle_bip(300, function(){
       setTimeout(function(){
         toggle_bip(300, callback);
       },100);
     });
   },100);
 });
}

function led_ready(){
 //Blue Led
 led.setColor(0x00,0x00,0x60);
}

function led_success(){
 //Blue Led
 led.setColor(0x00,0x60,0x00);
}

function led_error(){
 //Blue Led
 led.setColor(0xFF,0x00,0x00);
}


function led_waiting(){
 //Blue Led
 led.setColor(0xCC,0x4C,0x00);
}

function toggle_led(to,timeout){
 if(to == "success"){
     led_success();
 } else if(to == "error"){
     led_error();
 } else if(to == "waiting"){
     led_waiting();
 }
 setTimeout(function(){
     led_ready();
 },timeout);
}


var device = new nfc.NFC();
device.on('read', function(tag) {
  if ((!!tag.data) && (!!tag.offset))  {
    if (tag.type == 68) {
      var address = tag.data.toString('hex').substring(0,20);
      var security_code = tag.data.toString('hex').substring(32,40);

      var url = 'http://' + config.api + ":" + config.port + '/nfcs/' + address + '/auth_door';


      console.log('tag address is ' + address);
      console.log('security code is ' + security_code);
      console.log('would query ' + url);
  weblock.check('webapi.lock', function(error, isLocked) {
      if (isLocked) {
	console.log('not querying API again yet');
      } else {
     	weblock.lock('webapi.lock', function(er) {
      	  request.get({url: url, 
	    json: true,
            qs: {securekey: security_code },
            headers: {"X-Hardware-Name": config.name, "X-Hardware-Token": config.token}},
	 function (error, response, body) {
	   if (!error && response.statusCode === 200) {
	     console.log("Got a response: ", response.body.data)
	     if (response.body.data = 'UNLOCK') {
		switch_relay(1);
		bip(0);
                toggle_bip(500);
                led_ready();
   		setTimeout(function() {
		  switch_relay(0);
		
		}, 4000);
             }
           } else {
             bip_error();
	     if (response.statusCode == 401) {
              console.log('Unauthorised (check your headers and access tokens)');
	      } else {
                console.log("Got an error: ", error, ", status code: ", response.statusCode);
              }
           } 
		weblock.unlock('webapi.lock', function(er) {
		})

          });
	});
     }
   });

    } else if (tag.type == 4) {
      console.log('nfc other');
    }
  }
}).on('error', function(err) {
    // handle background error;
}).start();

	

bip(0);
toggle_bip(500);
led_ready();

