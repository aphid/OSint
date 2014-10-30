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
  console.log("trying a hearing");
  var hearing = this;
  return new Promise(function (resolve) {

    if (!hearing.url.contains('http://')) {
      hearing.url = hearing.baseUrl + hearing.url;
    }
    console.log("Loading " + hearing.url);
    var hearingPage = require('webpage').create();
    hearingPage.open(hearing.url).then(function (status) {
      for (var inject of injects) {
        hearingPage.injectJs(inject);
      }
      if (status === "success") {
        var parsedHearing = hearingPage.evaluate(function () {
          var hear = {};
          hear.witnesses = [];
          hear.pdfs = [];
          hear.videos = [];
          hear.links = [];
          for (var td of document.querySelectorAll('.hearingTxt')) {
            if (td.textContent === "Location") {
              hear.location = td.nextElementSibling.textContent.trim();
            }
          }

          for (var a of document.querySelectorAll('a')) {
            var data = filterMedia(a);
            if (data) {
              if (data.type === "pdf") {
                hear.pdfs.push(data);
              } else if (data.type === "witness") {
                hear.witnesses.push(data);
              } else if (data.type === "video") {
                hear.videos.push(data);
              } else if (data.type === "link") {
                hear.links.push(data);
              } else {
                console.log("UHHH WAT IS THIS");
                console.log(JSON.stringify(data));
              }
            }
          } //end a
          hear.description = document.querySelector('td.hearingTxtb').textContent;
          return hear;
        }); // end eval
        hearingPage.close();
        //console.log("eval over");
        hearing.room = parsedHearing.location;
        hearing.description = parsedHearing.description;
        for (var witness of parsedHearing.witnesses) {
          if (!witness.testimonyURL.contains('http')) {
            witness.testimonyURL = hearing.baseUrl + witness.testimonyURL;
          }
          if (witness.name.trim() === "" && witness.title.trim().length > 1) {
            if (witness.title.contains("Panel")) {
              hearing.panel = witness.title;
            }
            //hearing.addHappening(witness);
          } else {
            if (hearing.panel !== undefined) {
              witness.panel = hearing.panel;
            }
            if (witness.title.length || witness.name.length) {
              hearing.addWitness(witness);
            }
          }
        }
        //this next part feels liek something from /r/shittyprogramming, oh well

        hearing.grokParsed(parsedHearing);
        delete hearing.panel;

        resolve(true);
      }
    });
  });
};

Hearing.prototype.grokParsed = function (parsedHearing) {
  var hearing = this, 
    links = [],
    videos = [],
    witnesses = [],
    pdfs = [];
  
  for (data of parsedHearing) {
    data.url = hearing.baseUrl + "/" + data.url;
    data.url = data.url.replace(".gov//", ".gov/");

    if (data.type === "pdf") {
      pdfs.push(data);
    } else if (data.type === "witness") {
      witnesses.push(data);
    } else if (data.type === "video") {
      videos.push(data);
    } else if (data.type === "link") {
      links.push(data);
    }
    /* 
    } else {
      hear.links.push(data);
    }*/
  }
  console.log("******************************");
  console.log("PARSING");
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
    hearing.addVideo(video);
    console.log("BOKBOKBOK");
  }
  console.log("...and scene!");
};

Link.prototype.update = function (hearing) {
  var link = this, parsedLink;
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
      if (parsedLink) {
        console.log(JSON.stringify(parsedLink));
        hearing.grokParsed(parsedLink);
        return new Promise(function (resolve) {
          resolve();
        });
      }
    } //end success
  }); //end openx
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
      if (parsedWitness) {
        hearing.grokParsed(parsedWitness);
        return new Promise(function (resolve) {
          resolve();
        });
      }
    }
  }); //end open
};