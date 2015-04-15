"use strict";
var fs = require('fs'),
  injects = ['eval.js', 'lib/moment.min.js', 'lib/URI.js', 'lib/Autolinker.js'];
var moment = require('lib/moment.min.js');
var path = require('lib/path.js');
//env?sys?

console.log('Starting task on ' + moment().format('MMMM Do YYYY, h:mm:ss a'));

var senateScraper = {
  dataPath: '/var/www/html/hearings/data/',
  hearingPath: '/var/www/html/hearings',
  getVidUrl: 'http://illegible.us/video.php',
  pdfurl: 'http://localhost/hearingHandler/pdf.php',
  maxSocks: 5, 
  currentSocks: 0
};

phantom.injectJs('hearings.js');



var intel = new Committee({
  committee: "Intelligence",
  chamber: "senate",
  url: "http://www.intelligence.senate.gov",
  sessions: [106, 107, 108, 109, 110, 111, 112, 113],
  shortname: "intel"
});

console.log("Scraping Sessions!");

//senateScraper.getHDSdata('http://www.senate.gov/isvp/?type=live&comm=intel&filename=intel021611&stt=0:20:10');





intel.scrapeSessions().then(function (result) {
  console.log("what hey?");

  console.log("Processing Hearings!");
  return intel.processHearings();
}).then(function (result) {
  for (var hearing of intel.hearings) {
    //process links found on hearing pages
    hearing.scrapeLinks();
  }
}).then(function (result) {
  for (var hearing of intel.hearings) {
    //get more links and process witnesses
    hearing.scrapeWitnesses();
  }
}).then(function (result) {
  for (var hearing of intel.hearings) {
    //another link processing pass with the new ones
    hearing.scrapeLinks();
  }
}).then(function (result) {
  for (var hearing of intel.hearings) {
    //and another witness check based on the new links
    hearing.scrapeWitnesses();
  }
}).then(function (result) {
  for (var hearing of intel.hearings) {
    //fix media links
    hearing.sanitizeMedia();
  }
  //write JSON
  intel.fileify();
  intel.report();


  slimer.exit();
});

//