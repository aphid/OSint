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
  return hearing;
};

Committee.prototype.fetchVids = function () {
  console.log("ok, here we go!");
  if (senateScraper.busy === false) {
    console.log("selecting a video");
    var vid = this.pickVid();
    if (!vid) {
      console.log("WE DONE FETCHIN!");
      return true;
    } else {
      vid.fetch();
      console.log("attempting to fetch " + vid.filename);
      senateScraper.busy = true;
      this.fetchVids();
    }
  } else {
    console.log("busy");
    slimer.wait(5000);
    this.fetchVids();
  }
};

Committee.prototype.pickVid = function () {
  for (var hear of this.hearings) {
    for (var vid of hear.videos) {
      if (!vid.status && hear.dateReadable.contains("2014")) {
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
  this.metadata = {};
  if (options.note) {
    this.note = options.note;
  }
  if (this.url.contains("isvp")) {
    this.type = "hds";
  } else if (this.url.contains("fplayer")) {
    this.type = "flv";
  } else if (this.url.contains(".ram")) {
    this.type = "rm";
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
  for (var pdf of this.pdfs) {
    var pdfpage = require('webpage').create();
    var data = "date=" + this.shortdate + "&session=" + hear.session + "&pdf=" + pdf.filename;
    console.log(senateScraper.pdfurl + "   " + JSON.stringify(data));

    pdfpage.open(senateScraper.pdfurl, "post", data).then(function (status) {


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
    }, function (reject) {
      console.log("reject: " + reject);
      vid.type = "flv";
      vid.status = -1;
      senateScraper.busy = false;
      webpage.close();
    });
    /*
      if (result === 'flv'){
        console.log("caught the rejection");
       
      } else {
        console.log("OK TO GO");
      }
    }, function(reject){
      console.log("wahhhh");
     */
  } else if (this.type === "rm") {
    console.log("it's a RM!");
    var data = "type=rm" + "&fn=" + this.filename;

    var webpage = require('webpage').create();
    console.log(senateScraper.getVidUrl);
    webpage.open(senateScraper.getVidUrl, 'post', data, function () { // executed after loading
      console.log(webpage.content);
      if (webpage.content.contains('ope')) {
        console.log("something went wrong remote");
        //webpage.open('http://aphid.org/sad.html');
      } else if (webpage.content.contains('success')) {
        console.log("ok woo");
        vid.status = 1;
        senateScraper.busy = false;
        webpage.close();
      }

    });
  }
};
/*
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
}; */

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