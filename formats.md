##adobeHDS

these are effectively h.264 video and AAC audio in a .flv container which are then dynamically sliced up into tiny bits that the client requests individually and assembles.

remuxing to .mp4 makes these compliant in most html5 supporting browsers

these follow pattern of http://senate.gov/ivts/shortcommitteename-YYMMDD/

1) get manifest and authentication key from video page
2) rip video with AdobeHDS.php (via http://)
3) repeat per video (note: authentication keys have a duration &will expire)
4) extract metadata (exiftool)
5) use ffmpeg to remux as .mp4


##realMedia

Yes, really.

Unfortunately, these multirate .rm files are very difficult to convert.  
As far as we know, only working methodology is to use a 32 bit mplayer (mencoder) with a particular binary codec from this package:
see trac.mplayer...

1) get .ram file, it's tiny and contains url to actual .rm file
2) download .rm file.
3) extract metadata (exiftool) and retranscode with mencoder // mencoder intel092308.rm -oac mp3lame -ovc lavc -o crap.avi -ac rasipr -noskip -mc 0

##silverlight/mms

sniff network connection for request with ASX in it. response will have a mms:// link in it
pass mms link to ffmpeg, replacing mms with mmsh (example: )

##USTREAM

sniff network connection for request with flv.
download it.  

