'use strict';
var fs = require('fs');

var file = "/var/www/html/hearings/data/senate_intelligence.json";
var data = (fs.read(file));
data = JSON.parse(data);
var rm = [];
var busy = false,
  done = false;


for (var hearing of data.hearings) {
  for (var video of hearing.videos) {
    if (video.type.contains("Real")) {
      console.log(video.url);
      rm.push(video);
    }
  }
}



var getReal = function (rm) {
  //var filename = rm.url.substring(url.lastIndexOf('/') + 1);
  var filename = rm.url.split('/').pop();
  var state;
  console.log("WAAAAT");
  console.log("Gettin' busy with " + rm.url);
  var data = "url=" + rm.url + "&type=rm" + "&fn=" + filename;
  var webpage = require('webpage').create();
  webpage.open('http://localhost/hearingHandler/video.php', 'post', data, function () { // executed after loading
    if (webpage.content.contains('Nope')) {
      //webpage.open('http://aphid.org/sad.html');
    }
    busy = false;
  });
  console.log(state);
  console.log("gotReal");
  return (true);
};

var desertOfTheReal = function () {

  window.setTimeout(function () {
    if (done === false) {
      //console.log("WAT");
      if (busy === false) {
        busy = true;
        getReal(rm.pop());
      } else {
        console.log("...");
      }

      if (rm.length < 1) {
        done = true;
        console.log("all done");
        slimer.exit();
      } else {
        desertOfTheReal();
      }
    }
  }, 1000);

};

desertOfTheReal();


console.log(rm.length);
//slimer.exit();
//console.log(parsedJSON.dateReadable);
/* for (hearing of parsedJSON.hearings){
   console.log(hearing.dateReadable);  
  }*/