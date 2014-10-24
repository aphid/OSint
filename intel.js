
//gets hearings from committee website and saves to JSON
Committee.prototype.scrapeSession = function(session) {
  var url = this.baseUrl,
    hearings = [],
    comm = this,
    page = require('webpage').create();
    /* page.onConsoleMessage = function (msg) {
      console.log(msg);
    }); */

  return new Promise(function(pass){
    

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
  return new Promise(function(resolve){

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
              } else if (data.type === "video"){
                hear.videos.push(data); 
              } else if (data.type === "link"){
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
            if (witness.title.contains("Panel")){
              hearing.panel = witness.title;
            }
            //hearing.addHappening(witness);
          } else {
            if (hearing.panel !== undefined){
              witness.panel = hearing.panel;
            }
            if (witness.title.length || witness.name.length){
              hearing.addWitness(witness);
            }
          }
        }
        //this next part feels liek something from /r/shittyprogramming, oh well
        
        for (var link of parsedHearing.links){
          if (!link.url.contains("http://")){
            link.url = hearing.baseUrl + "/" + link.url;
            link.url = link.url.replace(".gov//", ".gov/");
          }
          hearing.addLink(link);
        }
        for (var pdf of parsedHearing.pdfs){
          if (!pdf.url.contains("http://")){
            pdf.url = hearing.baseUrl + "/" + pdf.url;
          }
          hearing.addPdf(pdf); 
        }
        for (var video of parsedHearing.videos){
           if (!video.url.contains("http://")){
            video.url = hearing.baseUrl + "/" + video.url;
          }
          hearing.addVideo(video); 
        }
        console.log("......done");
        //done
        delete hearing.panel;

        resolve(true);
      }
    });
  });
};


Link.prototype.update = function (comm) {
  var media = this;
  var witnessPage = require('webpage').create();
  witnessPage.onConsoleMessage = function (msg) {
    console.log(msg);
  };
  if (this.url.contains('pdf') || this.url.contains('ivsp')) {
    return new Promise(function(resolve){
      resolve(true);
      
    });
  }

  console.log("Opening " + this.url);
  witnessPage.open(this.url).then(function (status) {
    for (var inject of injects) {
      witnessPage.injectJs(inject);
    }
    if (status === "success") {
      var parsedWitness = witnessPage.evaluate(function () {
        console.log("Evaluating...");

        var hear = [];
        console.log("testing " + document.querySelectorAll('a').length + " links");
        for (var a of document.querySelectorAll('a')) {

          var data = filterWitnesses(a);
          if (data) {
            console.log(JSON.stringify(data));
            hear.push(data);
          }
        } //end a

        return hear;

      }); //end eval
      if (parsedWitness) {
        parsedWitness = parsedWitness[0];

        media.url = parsedWitness.url;
        console.log(media.url);
        media.type = parsedWitness.type;
        console.log(media.type);
        media.filename = parsedWitness.filename;
        media.startTime = parsedWitness.startTime;
        console.log(media.startTime);
        media.description = parsedWitness.description;
        console.log('done parsing it');
      } else {
        console.log("killing media");
        console.log(JSON.stringify(media));
        media = null;
      }
      return new Promise(function(resolve){
        resolve();
      });

    } //end success
  }); //end open

};

Witness.prototype.update = function (comm, hearing) {
  var watness = this;
  var witnessPage = require('webpage').create();
  witnessPage.onConsoleMessage = function (msg) {
    console.log(msg);
  };
  if (this.url.contains('pdf')) {
    return new Promise(function(resolve){
      resolve(true);
    });
  }
  console.log("Opening " + this.url);
  witnessPage.open(this.url).then(function (status) {
    for (var inject of injects) {
      witnessPage.injectJs(inject);
    }
    if (status === "success") {
      console.log(witnessPage.url);
      var parsedWitness = witnessPage.evaluate(function () {
        console.log("Evaluating...");

        var hear = [];
        console.log("testing " + document.querySelectorAll('a').length + " links");
        for (var a of document.querySelectorAll('a')) {

          var data = filterWitnesses(a);
          if (data) {
            console.log(JSON.stringify(data));
            hear.push(data);

          }
        } //end a

        return hear;

      }); //end eval
      for (var m of parsedWitness) {
        if (!m.url.contains("http://")) {
          console.log("tweaking url");
          m.url = comm.baseUrl + m.url;
        }
        if (watness.name.length){
          m.witnessRef = watness.witnessId;
        }
        hearing.addMedia(m);
      }
      return new Promise(function(resolve){
        resolve(true);
      });
    } //end success
  }); //end open

};
