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

var Committee = function (options) {
  this.chamber = options.chamber || 'senate';
  this.committee = options.committee;
  this.baseUrl = options.url;
  this.meta = [];
  this.sessions = options.sessions;
  this.hearings = [];
  this.init();
};

var Hearing = function (options) {
  this.comm = options.comm;
  this.url = options.url;
  this.date = options.date;
  this.dateReadable = moment(this.date).format('MMMM Do YYYY, h:mm a');
  this.shortdate = moment(this.date).format('YYMMDD');
  this.room = options.room;
  this.session = options.session;
  this.description = options.description;
  this.baseUrl = options.baseUrl;
  this.witnesses = [];
  this.links = [];
  this.pdfs = [];
  this.videos = [];
  this.path = senateScraper.hearingPath + "/" + this.session + "/" + this.shortdate;
  senateScraper.checkPath(this);
};

senateScraper.makeDir = function (path) {
  //console.log("+++++ TRYING " + path);
  if (!fs.exists(path)) {
    console.log("IT WASN'T THERE YET, MAKING");
    fs.makeDirectory(path);
  }
};

senateScraper.checkPath = function (hearing) {
  var sesDir = this.hearingPath + "/" + hearing.session + "/";
  this.makeDir(sesDir);
  this.makeDir(hearing.path);


};

Committee.prototype.init = function () {
  if (this.committee === "Intelligence") {
    console.log("YYYYYY");
    phantom.injectJs('intel.js');
  }
};

Committee.prototype.addHearing = function (options) {
  var hearing = new Hearing(options);
  for (var hear of this.hearings) {
    if (hear.date === options.date) {
      console.log("likely dupe");
      return false;
    }
  }
  this.hearings.push(hearing);
  console.log("successfully added?");
  return hearing;
};

Committee.prototype.fileify = function () {
  var comm = this;
  console.log("Starting file save...");
  return new Promise(function (resolve) {
    console.log("so far so good");
    console.log("organizing for files");
    var hearings = comm.hearings;
    var thing = JSON.parse(JSON.stringify(comm));
    thing.meta.writeTime = moment().format('MMMM Do YYYY, h:mm:ss a');
    thing.hearings = hearings;
    var data = JSON.stringify(thing, undefined, 2);
    //console.log(data);
    var filename = comm.chamber + "_" + comm.committee.toLowerCase() + ".json";
    console.log("Writing to " + senateScraper.dataPath + filename);
    fs.write(senateScraper.dataPath + filename, data);
  
    resolve(true);
  });
};

Hearing.prototype.addWitness = function (options) {
  for (var wit of this.witnesses) {
    if (options.name === wit.name || options.name.length < 2) {
      console.log("Blocked bad or duplicate witness");
      return false;
    }
  }
  var witness = new Witness(options);
  this.witnesses.push(witness);
};


var Witness = function (options) {
  this.name = options.name.trim();
  this.title = options.title.trim();
  this.url = options.testimonyURL || options.url;
  this.panel = options.panel;
  this.witnessId = options.witnessId || null;
};

var Video = function (options) {
  this.url = options.url;
  this.type = options.type;
  this.description = options.description;
  this.startTime = options.startTime;
  this.filename = options.filename;
  this.witnessRef = options.witnessRef;
  this.metadata = {};
  if (this.url.contains("ivsp")) {
    this.type = "HDS";
  } else if (this.url.contains("fplayer")) {
    this.url = ""; //correct for wrong url structure
    //essentially becomes isvp / date / something
    this.type = "HDS";
  } else if (this.url.contains(".ram")) {
    this.type = "RealMedia";
  }
};

var Pdf = function (options) {
  this.url = options.url;
  this.description = options.description;
  this.filename = options.filename || this.url.split('/').pop().replace(".pdf", "");
  this.witnessRef = options.witnessRef;
};

Hearing.prototype.getPdfs = function () {
  var hear = this;
  for (var pdf of this.pdfs){
    var pdfpage = require('webpage').create();
    var data = "date=" + this.shortdate + "&session=" + hear.session + "&pdf=" + pdf.filename; 
    console.log(senateScraper.pdfurl + "   " + JSON.stringify(data));
    
    pdfpage.open(senateScraper.pdfurl, "post", data).then(function(status){
      //console.log("WOWOWOWOWO " + hear.shortdate + " " + pdf.filename);
      //console.log(pdfpage.plainText);
      
    }); 
  }
};


Pdf.prototype.fetchMetadata = function () {
  //exec exiftool return json 
};


var Link = function (options) {
  this.url = options.url;
  this.description = options.description;
  this.parentLink = options.parentLink;
  this.witnessRef = options.witnessRef;
};

Hearing.prototype.addVideo = function (options) {
  for (var vid of this.videos) {
    if (options.url === vid.url) {
      console.log("Blocked duplicate media" + options.url);
      //do some things to add any other missing metadata
      return false;
    }
  }
  var video = new Video(options);
  this.videos.push(video);
};

Hearing.prototype.addPdf = function (options) {
  for (var pdf of this.pdfs) {
    if (options.url === pdf.url) {
      console.log("Blocked duplicate pdf" + options.url);
      //do some things to add any other missing metadata
      return false;
    }
  }
  pdf = new Pdf(options);
  this.pdfs.push(pdf);
};

Hearing.prototype.addLink = function (options) {
  if (!options.url.contains('http')){
   options.url = this.baseUrl + options.url; 
  }
  for (var link of this.links) {
    if (options.url === link.url) {
      console.log("Blocked duplicate link" + options.url);
      //do some things to add any other missing metadata
      return false;
    }
  }
  link = new Link(options);
  this.links.push(link);
};

Committee.prototype.scrapeSessions = function () {
  var that = this;
  return Promise.all(this.sessions.map(function (a) {
    console.log(a);
    console.log(JSON.stringify(that));
    return that.scrapeSession(a);
  }), that);

};


Committee.prototype.processHearings = function () {
  return Promise.all(this.hearings.map(function (a) {
    return a.process();
  }));
};



Committee.prototype.getDataFromJSON = function () {
  var filename, parsed, comm;
  comm = this;
  var path = senateScraper.dataPath;
  filename = path + this.chamber + "_" + this.committee.toLowerCase() + ".json";
  console.log("opening " + filename);
  parsed = JSON.parse(fs.open(filename, 'r').read());
  for (var hear of parsed.hearings) {
    var theHearing = comm.addHearing({
      description: hear.description,
      url: hear.url,
      date: hear.date,
      room: hear.location,
      session: hear.session,
    });
    if (theHearing) {
      for (var wit of hear.witnesses) {
        theHearing.addWitness(wit);
      }
      for (var pdf of hear.pdfs) {
        theHearing.addPdf(pdf);
      }  
      for (var vid of hear.videos) {
        theHearing.addVideo(vid);
      }  
      for (var link of hear.links) {
        theHearing.addLink(link);
      }
        
    }//if
  }//for
  return Promise.resolve(true);
};


Hearing.prototype.scrapeLinks = function () {
  var hear = this;
  return Promise.all(this.links.map(function (b) {
    return b.update(hear);
  }));

};

Hearing.prototype.scrapeWitnesses = function () {
  var hear = this;
  return Promise.all(this.witnesses.map(function (b) {
    return b.update(hear);
  }));

}

  /*
  for (var hearing of this.hearings) {

    for (var witness of hearing.witnesses) {
      this.tasks++;
      witness.update(this, hearing);
    }

    for (var media of hearing.media) {
      this.tasks++;
      media.update(this);
    }
  }
  console.log(this.tasks + "!!!!! tasks to go");
  this.waitAndSave();
  */


Committee.prototype.processMedia = function () {
  var that = this;
  return Promise.all(this.hearings.map(function (a) {
    return a.media.map(function (b) {
      return b.update(that, a);
    });
  }));

};



/*
Committee.prototype.waitAndScrape = function () {
  var comm = this;
  if (comm.tasks > 0) {
    setTimeout(function () {
      console.log("Busy, waiting for the next one");
      comm.waitAndScrape();
    }, 10000);
  } else {
    console.log("Done, saving now");
    comm.scrapeHDS();
  }
}; */

/* refactor 
Committee.prototype.scrapeHDS = function () {
  if (!this.temp.hds) {
    //initialize
    this.temp.hds = [];
    for (var hear of this.hearings) {
      for (var video of hear.video) {
        if (video.type === "HDS" && "status" !== "finished") {
          this.temp.hds.push(video);
        }
      }

    }
  }
  var working = this.temp.hds.pop();
  working.scrapeVideo(this);
  this.waitAndScrape();

}; */
/* UGH REFACTOR 
Video.prototype.scrape = function (comm) {
  var video = this,
    auth = false,
    manifest = false,
    once = false;
  comm.tasks++;
  this.status = "working";
  var scrapePage = require('webpage').create();


  scrapePage.open(this.url).then(function (status) {});

  scrapePage.onConsoleMessage = function (msg) {
    console.log(msg);
  };


  scrapePage.onResourceReceived = function (response) {
    if (response.url.contains("f4m") && response.status < 400 && manifest === false) {
      console.log("GOT MANIFEST*****========>");
      manifest = response.url;
    } else if (response.url.contains("als") && response.status < 400 && auth === false) {
      console.log("GOT AUTH*********========>");
      auth = response.url.split("?")[1];
    }

    if (manifest !== false && auth !== false && once === false) {
      once = true;
      console.log("****AUTH=" + auth);
      console.log("****MANIFEST=" + manifest);
      console.log("****FILENAME=" + JSON.stringify(media, undefined, 2));
      var data = { 
        "filename": media.filename,
        "manifest": manifest, 
        "auth": auth
      };
        console.log("beep " + JSON.stringify(data));

      media.requestTarget(data, comm, scrapePage);
    }

  };



  console.log("opening " + this.url);



}; */

Video.prototype.requestTarget = function (data, comm, scrapePage) {
  scrapePage.close();

  console.log("Running HDS");
  console.log("boop " + JSON.stringify(data));
  var vidPage = require('webpage').create();
  vidPage.onConsoleMessage = function (msg) {
    console.log(msg);
  };
  fs.write(senateScraper.dataPath + "data.json", JSON.stringify(data, undefined, 2));

  vidPage.onResourceReceived = function (response) {
    console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(response));
  };
  console.log("Opening with: " + data.manifest);
  var postdata = "manifest=" + encodeURIComponent(data.manifest) + "&filename=" + encodeURIComponent(data.filename) + "&auth=" + encodeURIComponent(data.auth);

  vidPage.open(senateScraper.getVidUrl, "post", postdata).then(function (status) {
    console.log(status);
    console.log(vidPage.plainText);
    console.log(comm.tasks);
    comm.tasks--;
  });
};

Committee.prototype.report = function () {
  console.log("Countin' videos");
  console.log(this.hearings.length + " hearings");
  var videos = 0;
  var pdfs = 0;
  var links = 0;
  var witnesses = 0;
  for (var hear of this.hearings) {
    videos += hear.videos.length;
    links += hear.links.length;
    witnesses += hear.witnesses.length;
    pdfs += hear.pdfs.length;
  }
  console.log(videos + " videos, " + links + " links, " + witnesses + " witnesses, and " + pdfs + " pdfs");
};

var intel = new Committee({
  committee: "Intelligence",
  chamber: "senate",
  url: "http://www.intelligence.senate.gov",  
  sessions: [110, 111, 112, 113]
});

intel.getDataFromJSON().then(function (result) {
  console.log("what hey?");

  //return intel.processHearings();
  //intel.fileify();
}).then(function (result) {
  for (var hearing of intel.hearings){
    //hearing.getPdfs();
    hearing.scrapeLinks();
  }
}).then(function(result){
  for (var hearing of intel.hearings){
  hearing.scrapeWitnesses();
  }
}).then(function (result){
  intel.report();

  
  phantom.exit();
});
//intel.getVideosFromJSON();
//intel.processWitnesses();
//intel.scrapeHDS();