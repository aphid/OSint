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
  this.path = senateScraper.hearingPath + "/" + this.shortdate;
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
  return hearing;
};

Committee.prototype.fetchVids = function () {
  console.log(">>>");
  if (senateScraper.busy === false) {
    console.log("selecting a video");
    var vid = this.pickVid();
    if (!vid) {
      console.log("WE DONE FETCHIN!");
      return new Promise(resolve);
    } else {
      senateScraper.busy = true;

      this.fileify();
      vid.fetch();
      console.log("attempting to fetch " + vid.filename);
      this.fetchVids();
    }
  } else {
    console.log("busy");
    slimer.wait(5000);
    this.fetchVids();
  }
};

Committee.prototype.fetchPdfs = function () {
  var comm = this;
  console.log(">>> ");
  if (senateScraper.busy === false) {
    var hear = this.pickHearing();
    if (!hear) {
      console.log("Guess we're done");
      return new Promise(resolve);
    }
    senateScraper.busy = true;
    var count = 0;
    for (var pdf of hear.pdfs) {
      count++;
      console.log(count + " of " + hear.pdfs.length);
      console.log("Trying " + pdf.filename);
      slimer.wait(3000);
      var data = "short=" + escape(hear.shortdate) + "&filename=" + escape(pdf.filename) + "&url=" + escape(pdf.url);
      var webpage = require('webpage').create();
      console.log("Opening " + senateScraper.pdfurl);
      webpage.open(senateScraper.pdfurl, 'post', data, function () {
        var json = webpage.evaluate(function () {
          return document.querySelector("body").textContent;
        });
   
        var metadata = JSON.parse(json)[0];
          webpage.close();
   
        delete metadata.SourceFile;
        delete metadata.Directory;
        pdf.metadata = metadata;
        console.log(JSON.stringify(metadata, undefined, 2));
        pdf.status = 1;
        if (count === hear.pdfs.length ) {
          console.log("all of them");
          comm.fileify();
          senateScraper.busy = false;
   
          comm.fetchPdfs();
        }

      }); //webpage open
    } // done with pdfs
  } else {
    console.log("busy");
    slimer.wait(5000);
    this.fetchPdfs();
  }
};

Committee.prototype.pickHearing = function () {
  for (var hear of this.hearings) {
    for (var pdf of hear.pdfs) {
      if ((pdf.status === undefined || pdf.status === 0) && senateScraper.checked.indexOf(hear.dateReadable) < 0) {
        senateScraper.checked.push(hear.dateReadable);
        return hear;
      }
    }
  }
};

Committee.prototype.pickVid = function () {
  for (var hear of this.hearings) {
    for (var vid of hear.videos) {
      if (!vid.status) {
        senateScraper.checked.push(vid.filename);
        return vid;
      }
    }
  }
  return false;
};

Committee.prototype.fileify = function () {
  var comm = this;
  console.log("Starting file save...");
  return new Promise(function (resolve) {
    var hearings = comm.hearings;
    var thing = JSON.parse(JSON.stringify(comm));
    thing.meta.writeTime = moment().format('MMMM Do YYYY, h:mm:ss a');
    thing.hearings = hearings;
    var data = JSON.stringify(thing, undefined, 2);
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
  this.startTime = options.startTime || "0";
  this.filename = options.filename;
  this.witnessRef = options.witnessRef;
  if (options.metadata) {
    this.metadata = options.metadata;
  } else {
    this.metadata = {};
  }
  if (options.status) {
    this.status = options.status;
  }
  if (options.note) {
    this.note = options.note;
  }

};

var Pdf = function (options) {
  this.url = options.url;
  this.description = options.description;
  this.filename = options.filename || this.url.split('/').pop().replace(".pdf", "");
  this.witnessRef = options.witnessRef;
  if (options.metadata) {
    this.metadata = options.metadata;
  }
};

Hearing.prototype.getPdfs = function () {
  var hear = this;
  console.log("getting pdfs");
  return Promise.all(this.pdfs.map(function (a) {
    return a.scrape(hear.shortdate, hear.session);
  }));
 
};

Pdf.prototype.scrape = function(shortdate, session){
  var that = this;
  if (senateScraper.currentSocks < senateScraper.maxSocks){
    
    senateScraper.currentSocks = senateScraper.currentSocks + 1;
    return new Promise(function(resolve,reject){

      var pdfpage = require('webpage').create();
      pdfpage.onConsoleMessage = function (message, line, file) {
        console.log("pdfscraper: " + file + " @" + line + ": " + message)
      };
      var data = "date=" + shortdate + "&session=" + session + "&pdf=" + that.filename + "&committee=" + "intel" + "&url=" + encodeURI(that.url);
      console.log(data);
      pdfpage.open(senateScraper.pdfurl, "post", data).then(function (status) {
        console.log(pdfpage.content);
        pdfpage.close();
        senateScraper.currentSocks = senateScraper.currentSocks - 1;
        resolve();
      });
    });
  } else {
    
   slimer.wait(100);
     console.log("...");
     that.scrape(shortdate, session);
     
  }
  
};

Pdf.prototype.fetchMetadata = function () {
  //exec exiftool return json 
  //no, the php needs to do this

};


var Link = function (options) {
  this.url = options.url;
  this.description = options.description;
  this.parentLink = options.parentLink;
  this.witnessRef = options.witnessRef;
};

Hearing.prototype.addVideo = function (options) {
  //expect type, url, description
  for (var vid of this.videos) {
    if (options.url === vid.url) {
      console.log("Blocked duplicate video " + options.url + " vs " + vid.url);
      //do some things to add any other missing metadata
      return false;
    }
  }
  var video = new Video(options);
  //console.log(JSON.stringify(video));
  this.videos.push(video);
};

Hearing.prototype.addPdf = function (options) {
  for (var pdf of this.pdfs) {
    if (options.url === pdf.url) {
      //console.log("Blocked duplicate pdf " + options.url + " vs " + pdf.url);
      //do some things to add any other missing metadata
      return false;
    }
  }
  pdf = new Pdf(options);
  this.pdfs.push(pdf);
};

Hearing.prototype.addLink = function (options) {
  if (!options.url.contains('http')) {
    options.url = this.baseUrl + options.url;
  }
  for (var link of this.links) {
    if (options.url === link.url) {
      console.log("Blocked duplicate link " + options.url + " vs " + link.url);
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
    console.log(">>> " + a.shortdate);
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
      baseUrl: hear.baseUrl,
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

    } //if
  } //for
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

Video.prototype.fetch = function () {
  var vid = this;
  console.log("fetchin'!");
  if (this.type === "hds") {
    console.log("it's a HDS!");
    var hdsdata = this.getHDSdata().then(function (result) {
      console.log("result: " + JSON.stringify(result));
      var data = "type=hds&fn=" + escape(vid.filename) + "&auth=" + escape(result.auth) + "&manifest=" + escape(result.manifest);
      var webpage = require('webpage').create();
      console.log("Opening " + senateScraper.getVidUrl);
      webpage.open(senateScraper.getVidUrl, 'post', data, function () { // executed after loading
        var json = webpage.evaluate(function () {
          return document.querySelector("pre").textContent;
        });
        var metadata = JSON.parse(json)[0];
        delete metadata['SourceFile'];
        delete metadata['Directory'];
        vid.metadata = metadata;
        console.log(JSON.stringify(metadata, undefined, 2));

        vid.status = 1;
        senateScraper.busy = false;
        webpage.close();
      });
    }, function (reject) {
      console.log("reject: " + reject);
      vid.type = "flv";
      vid.status = -1;
      senateScraper.busy = false;
      webpage.close();
    });

  } else if (this.type === "rm") {
    console.log("it's a RM!");
    var data = "type=rm" + "&fn=" + this.filename;

    var webpage = require('webpage').create();
    console.log(senateScraper.getVidUrl);
    webpage.open(senateScraper.getVidUrl, 'post', data, function () { // executed after loading
      if (webpage.content.contains('ope')) {
        console.log("something went wrong remote");
        vid.status = -1;
        senateScraper.busy = false;
        webpage.close();
        //webpage.open('http://aphid.org/sad.html');
      } else {
        console.log("ok woo");
        var json = webpage.evaluate(function () {
          return document.querySelector("pre").textContent;
        });
        var metadata = JSON.parse(json)[0];
        delete metadata['SourceFile'];
        delete metadata['Directory'];
        console.log(JSON.stringify(metadata, undefined, 2));

        vid.metadata = metadata;
        vid.status = 1;
        senateScraper.busy = false;
        webpage.close();
      }

    });
  } else if (this.type === "flv") {
    console.log("Skipping FLV");
    vid.status = -1;
    senateScraper.busy = false;
  }
};

Video.prototype.exists = function(){
  
  
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

Video.prototype.getHDSdata = function () {
  var vid = this;
  var url = this.url;
  console.log(url);
  return new Promise(function (resolve, reject) {
    var data = {};
    var page = require('webpage').create();

    page.open(url, function () { // executed after loading
      console.log("<<<<<<");
    });
    page.onResourceReceived = function (response) {
      if (response.url.contains('flv')) {
        vid.type = "flv";
        page.close();
        console.log('Not HDS, FLV');
        reject('flv');
      };
      if (response.status === 200 && (response.url.contains('manifest')) && (!response.url.contains('gif'))) {
        console.log(">>>>>>>>>>  " + response.status);
        url = response.url;
        console.log(url);
        data.manifest = url;
      }
      if (response.status === 200 && response.url.contains('Frag')) {
        data.auth = response.url.split('?').pop();

      }
      if (data.auth && data.manifest) {
        page.close();
        resolve(data);
      }
    };
  });


};

Committee.sortHearings = function(){
  hearings.sort(function(a,b) {
  if (a.shortdate < b.shortdate)
     return -1;
  if (a.shortdate > b.shortdate)
    return 1;
  return 0;
});
  
};