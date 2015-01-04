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
  getVidUrl: 'http://localhost/hearingHandler/video.php',
  pdfurl: 'http://localhost/hearingHandler/pdf.php',
  busy: false

};

phantom.injectJs('hearings.js');



var intel = new Committee({
  committee: "Intelligence",
  chamber: "senate",
  url: "http://www.intelligence.senate.gov",
  sessions: [110, 111, 112, 113]
});

console.log("Scraping Sessions!");



intel.getDataFromJSON().then(function (result) {
  
  intel.fetchVids();
  
  
}).then(function(result){
  //write JSON
  //intel.fileify();
  //intel.report();


  phantom.exit();
});
//intel.processWitnesses();
//intel.scrapeHDS();
//hearing.getPdfs();*/