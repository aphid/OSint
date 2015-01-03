//gets hearings from committee website and saves to JSON
Committee.prototype.scrapeSession = function (session) {
  var url = this.baseUrl,
    hearings = [],
    comm = this,
    page = require('webpage').create();
  /* page.onConsoleMessage = function (msg) {
      console.log(msg);
    }); */

  return new Promise(function (pass) {


    console.log("Scraping congress " + session);
    console.log("url: " + (url + '/hearings.cfm?congress=' + session));
    page.open(url + '/hearings.cfm?congress=' + session, function (status) {
      for (var inject of injects) {
        page.injectJs(inject);
      }
      if (status === "success") {
        console.log("Load...successful.");
        hearings = page.evaluate(function () {

          var hears = [],
            links = document.querySelectorAll('a');
          console.log("Evaluating...");
          for (var link of links) {

            var hearingTitle = link.textContent.trim();
            //console.log("...testing a link..." + hearingTitle);
            if (hearingTitle.contains("Open Hearing") && !hearingTitle.contains("Cancelled") && !hearingTitle.contains("Postponed")) {
              //.log("Found actual hearing");
              var data = {},
                thedate, thetime, mom, datetime;
              data.title = hearingTitle.replace("Open Hearing: ", "").trim();
              data.url = link.getAttribute("href");
              thetime = link.parentNode.previousElementSibling.textContent.trim();
              thedate = link.parentNode.previousElementSibling.previousElementSibling.textContent.trim();
              datetime = thedate + " " + thetime;
              //console.log(datetime);
              mom = moment(datetime, "MM-DD-YY hh:mm a").zone('-0400');
              //console.log(mom.format("LLLL"));
              data.timestamp = mom.toDate();
              hears.push(data);
            } else {
              //console.log("not a hearing: " + hearingTitle);
            } // end else
          } //end for
          //console.log("Finished.\n" + JSON.stringify(hears));
          return hears;
        }); //end eval
        page.close();
        console.log("Eval over.");

        for (var hearing of hearings) {
          console.log("Pushing");
          comm.addHearing({
            "url": hearing.url,
            "baseUrl": comm.baseUrl,
            "date": hearing.timestamp,
            "room": hearing.location,
            "session": session,
          }); //end push
        } //end for



      }
      console.log("finally");
      pass(Promise.resolve());
    }); //end page open
  });
};

Hearing.prototype.process = function () {
  //fix this shit to work with grok
  console.log(".");
  var hearing = this;

  if (!hearing.url.contains('http://')) {
    hearing.url = hearing.baseUrl + hearing.url;
  }
  //console.log("Loading " + hearing.url);
  var hearingPage = require('webpage').create();
  hearingPage.open(hearing.url).then(function (status) {
    for (var inject of injects) {
      hearingPage.injectJs(inject);
    }
    if (status === "success") {
      var parsedHearing = hearingPage.evaluate(function () {
        var hear = [];

        for (var td of document.querySelectorAll('.hearingTxt')) {
          if (td.textContent === "Location") {
            hear.location = td.nextElementSibling.textContent.trim();
          }
        }

        for (var a of document.querySelectorAll('a')) {
          var data = filterMedia(a);
          if (data.type !== "filterOut") {
            hear.push(data);
          }
        } //end a
        hear.description = document.querySelector('td.hearingTxtb').textContent;
        return hear;
      }); // end eval
      hearingPage.close();
      //console.log("eval over");
      hearing.room = parsedHearing.location;
      hearing.description = parsedHearing.description;

      //this next part feels liek something from /r/shittyprogramming, oh well
      hearing.grokParsed(parsedHearing);
      delete hearing.panel;
    }
  });

  return new Promise(function (resolve) {
    resolve();
  });
};

Hearing.prototype.grokParsed = function (parsedHearing) {
  var hearing = this,
    links = [],
    videos = [],
    witnesses = [],
    pdfs = [];
  for (data of parsedHearing) {
    if (data) {
      if (!data.url.contains("http")) {
        data.url = (hearing.baseUrl + "/" + data.url).replace(".gov//", ".gov/");
      }
      if (data.type === "pdf") {
        pdfs.push(data);
      } else if (data.type === "witness") {
        if (data.name.trim() === "" && data.title.trim().length > 1) {
          if (data.title.contains("Panel")) {
            hearing.panel = data.title;
          }
        } else {
          if (hearing.panel !== undefined) {
            data.panel = hearing.panel;
          }
          if (data.title.length || data.name.length) {
            witnesses.push(data);
          }
        }

      } else if (data.type === "video") {
        videos.push(data);
      } else if (data.type === "link") {
        links.push(data);
      }
    }
  }
  for (var link of links) {
    hearing.addLink(link);
  }
  for (var pdf of pdfs) {
    hearing.addPdf(pdf);
  }
  for (var witness of witnesses) {
    hearing.addWitness(witness);
  }
  for (var video of videos) {
    console.log(JSON.stringify(video, undefined, 2));
    hearing.addVideo(video);
  }
};

Link.prototype.update = function (hearing) {
  var link = this,
    parsedLink;
  var linkPage = require('webpage').create();
  linkPage.onConsoleMessage = function (message, line, file) {
    console.log(file + " @" + line + ": " + message)
  };
  linkPage.open(this.url).then(function (status) {
    for (var inject of injects) {
      linkPage.injectJs(inject);
    }
    if (status === "success") {
      parsedLink = linkPage.evaluate(function () {
        var hear = [];
        console.log("testing " + document.querySelectorAll('a').length + " links");
        for (var a of document.querySelectorAll('a')) {
          var data = filterWitnesses(a);
          if (data) {
            hear.push(data);
          }
        } //end for
        return hear;
      }); //end eval
      linkPage.close();
      if (parsedLink) {
        console.log(JSON.stringify(parsedLink));
        hearing.grokParsed(parsedLink);
        return new Promise(function (resolve) {
          resolve();
        });
      }
    } //end success
  }); //end open
};
Witness.prototype.update = function (hearing) {
  var wit = this;
  var witnessPage = require('webpage').create();
  witnessPage.onConsoleMessage = function (message, line, file) {
    console.log(file + " @" + line + ": " + message)
  };
  witnessPage.open(this.url).then(function (status) {
    for (var inject of injects) {
      witnessPage.injectJs(inject);
    }
    if (status === "success") {
      var parsedWitness = witnessPage.evaluate(function () {
        var hear = [];
        console.log("testing " + document.querySelectorAll('a').length + " links");
        for (var a of document.querySelectorAll('a')) {
          var data = filterWitnesses(a);
          if (data) {
            hear.push(data);
          }
        }
        return hear;
      }); //end eval
      witnessPage.close();
      if (parsedWitness) {
        hearing.grokParsed(parsedWitness);
        return new Promise(function (resolve) {
          resolve();
        });
      }
    }
  }); //end open
};


Hearing.prototype.sanitizeMedia = function () {
  var hear = this,
    rmurl;
  //Only two hearings have linked video, one of those doesn't work.  Instead replace these procedurally
  if (hear.session < 111) {
    rmurl = "http://www.senate.gov/legacymedia/www/intel" + moment(hear.date).format('MMDDYY') + ".rm";
    //we need to construct a url that looks like this: http://www.senate.gov/legacymedia/www/intel080107.rm where intel is (committee-short), then monthdayyear
    for (vid of hear.videos){
    console.log("it was okay");
    vid.oldUrl = rmurl;
    vid.url = "http://www.senate.gov/legacymedia/www/intel" + moment(hear.date).format('MMDDYY') + ".rm";
    vid.filename = moment(hear.date).format('MMDDYY');
      
    }
    if (!hear.videos.length){
      
      hear.addVideo({
        url: rmurl,
        type: "rm",
        description: "",
        filename: moment(hear.date).format('MMDDYY'),
        note: "guessing"
      });
    }
  } //end if


  //now move 'old' videos from this format: http://www.senate.gov/fplayers/jw57/commMP4Player.cfm?fn=intel013112&st=xxx
  //to this http://www.senate.gov/isvp/?type=live&comm=intel&filename=intel112014&stt=01:05:38",
  for (var vid of hear.videos) {
    if (vid.url.contains('fplayer')) {
      vid.oldurl = vid.url;
      if (!vid.startTime.contains('x' && !vid.startTime.contains(':'))) {
        console.log("trying " + vid.startTime);
        vid.startTime = moment().startOf('day').seconds(vid.startTime).format('H:mm:ss');

      }
      console.log(vid.startTime);
    }
    if (vid.filename === undefined && vid.url.contains('filename') && !vid.url.contains('.r')) {
      var split = vid.url.split("&filename=");
      split = split[1].split('&');
      split = split[0];
      vid.filename = split;
      
    }  else if (vid.filename === undefined && vid.url.contains('fn')) {
      var split = vid.url.split("?fn=");
      split = split[1].split('&');
      split = split[0];
      vid.filename = split;      
    }
    if (vid.url.contains('fplayers') || vid.url.contains('isvp')){
      vid.url = "http://www.senate.gov/isvp/?type=live&comm=intel&filename=" + vid.filename;
      if (!vid.startTime.contains('alid')){
        vid.url = vid.url + "&stt=" + vid.startTime;
      } else {
        delete vid.startTime; 
      }
      console.log(vid.url);
    }
    
  } 

};

Committee.scrapeVids = function () {
  var queue;
  for (var hear of this.hearings) {
    for (var vid of hear.videos) {
      if (video.status !== "complete") {
        queue.push(video);
      }
    }

  }

};


Video.prototype.fetch = function () {
  console.log("fetchin'!");
  var filename, state, data, type;
  filename = this.url.split('/').pop();
  if (this.type === "hds") {
    console.log("DING DING DING");
    var hdsdata = this.getHDSdata().then(function(result){
      
    });
  } else if (this.type === "rm") {
  /*  
  data = "url=" + this.url + "&type=rm" + "&fn=" + filename;
  var webpage = require('webpage').create();
  webpage.open('http://localhost/hearingHandler/video.php', 'post', data, function () { // executed after loading
    if (webpage.content.contains('Nope')) {
      //webpage.open('http://aphid.org/sad.html');
    }
    busy = false;
*/
  }
  console.log(state);
  console.log("gotReal");
  return (true);
}