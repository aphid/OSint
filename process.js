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
  getVidUrl: 'http://metaviddemo01.ucsc.edu/asdf/getvid.php',
  pdfurl: 'http://localhost/hearingHandler/pdf.php'

};

phantom.injectJs('hearings.js');



var intel = new Committee({
  committee: "Intelligence",
  chamber: "senate",
  url: "http://www.intelligence.senate.gov",
  sessions: [110, 111, 112, 113]
});

console.log("Scraping Sessions!");

//senateScraper.getHDSdata('http://www.senate.gov/isvp/?type=live&comm=intel&filename=intel021611&stt=0:20:10');





intel.getDataFromJSON().then(function (result) {
  for (var hearing of intel.hearings){
    for (var vid of hearing.videos){
      console.log("time to fetch");
      vid.fetch();
    }
  }
  
  
}).then(function(result){
  //write JSON
  //intel.fileify();
  //intel.report();


  phantom.exit();
});
//intel.processWitnesses();
//intel.scrapeHDS();
//hearing.getPdfs();*/