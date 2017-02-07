var request = require("request");
var fs = require('fs');
var sleep = require('sleep');
var rc522 = require("rc522-rfid-promise-spidev");
var moment = require("moment");

var led = require("./rgb_led.js");

led.initRGB();

function Logger(){
}

Logger.prototype.plain = function(message){
 console.log(message);
}

Logger.prototype.log = function(message){
 var current_date = new Date();
 var str_date = moment(current_date).format("YYYY-MM-DD HH:mm Z");
 console.log(str_date + ": " + message);
}

var logger = new Logger();


logger.plain("===============================================");
logger.plain("Card Reader 1.0");
logger.plain("By Otávio Ribeiro @2016");
logger.plain("otavio.ribeiro@gmail.com");
logger.plain("===============================================");


function switch_relay(on){
 fs.writeFile("/sys/class/gpio/gpio2/value", on, function(err) {
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
 fs.writeFile("/sys/class/gpio/gpio75/value", on, function(err) {
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

switch_relay(0);
bip(0);
toggle_bip(500);
led_ready();

var last_card_num = "";
var read = function(){
 rc522.startListening({
 spi:"/dev/spidev1.0",
 enableLog: 0
 },2000)
 .then(function(rfidTag){
   var card_num = parseInt(rfidTag, 16); 
   console.log("Read card: " + card_num);
   if(last_card_num != card_num){
     last_card_num = card_num;
     toggle_bip(1000);
	switch_relay(1);
   } else {
     bip_error();
     led_error();
   }
   setTimeout(read,0);
 }, function(){
   last_card_num = "";
   setTimeout(read,0);
   switch_relay(0);
 });
}
setTimeout(read,0);
