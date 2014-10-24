 
var data = "http://localhost/~aphid/senate_intel/113_senate_intelligence.json";

var getJSON = function(url) {
  var promise = new Promise(function(resolve, reject){
    var client = new XMLHttpRequest();
    client.open("GET", url);
    client.onreadystatechange = handler;
    client.responseType = "json";
    client.setRequestHeader("Accept", "application/json");
    client.send();

    function handler() {
      if (this.readyState === this.DONE) {
        console.log(this.status);
        if (this.status === 200) { resolve(this.response); }
        else { reject(this); }
      }
    };
  });

  return promise;
};

$(document).ready(function(){
  
  $("<a/>", { text: "json", "href": data }).appendTo('body');

  getJSON(data).then(function(json) {
    for (var hearing of json.hearings){
      var parent = $('<div/>', { "class": "hearing"}).appendTo('body'); 
      var title = $('<a/>', { href: hearing.url, text: hearing.description }).appendTo(parent);
      $('<a/>', { "href": hearing.url}).wrap(title);

      $('<h3/>', { text: "Witnesses" }).appendTo(parent);
      
      
      for (var wit of hearing.witnesses){
        var witdiv = $('<ul/>', { "class": "witness" }).appendTo(parent);
        var witli = $('<li/>').appendTo(witdiv);
        $('<span/>', { "text": wit.name + " " + wit.title }).appendTo(witli);
        $('<a/>', { "text": "(link)", "href": wit.url}).appendTo(witli);
      }
     $('<h5/>', { text: "Media" }).appendTo(parent);

      
      for (var med of hearing.media){
        console.log("media!");
        var meddiv = $('<ul/>', { "class": "media" }).appendTo(parent);
        var medli = $('<li/>').appendTo(meddiv);
        var medinfo = $('<span/>', { "text": "Title: " + med.description + " Format: " + med.type + " "  }).appendTo(medli);
        console.log(med.witnessRef);
        if (med.witnessRef){
         medinfo.text(medinfo.text() + "Witness: " +  med.witnessRef); 
        }
        $('<a/>', { "text": " (link)", "href": med.url}).appendTo(medli);
        
        
      }
    }
  }, function(error) {
    console.log("oh noes!");
  });
});
