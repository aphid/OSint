hearing-things
==============

Scraping and Analysis tools for U.S. Senate (and eventually House) Committee hearing videos and associated metadata

hearing-things is built primarily using SlimerJS, a (mostly) headless Gecko-based browser similar to PhantomJS.  

At present, this only (and partially so) works on the Senate Intelligence Committee.  Data format is still in flux.  Current video scraping methodologies work for AdobeHDS and RealMedia, covering all Senate hearings encountered thusfar back to the 110th Congress.

#### (FAQ) Frequently Anticipated Questions

#####Why SlimerJS?  Why not curl or (insert scraping library here)?

SlimerJS was the only obvious solution for getting authentication and manifest strings that depend on a working Flash plugin.  It'a also pretty sweet to be able to target your js to Firefox 33 -- native promise support! for...of loops! ES6  w/no shims or polyfills!

---

In this increasingly panoptic world in which the practice of everyday life now produces a trail of data sought after gov't intelligence agencies to be mapped, aggregated and queried, questions of what is or can be public, private or secret are crucial.  One of the few civilian bodies with oversight over these programs is the Select Committee on Intelligence in the US Senate.  What then, does it mean that this website for this Committee is less readable than our phone metadata?  

This site is the public face of the committee with pages describing each hearing with links to witness testimony PDFs and  archived videos of each proceeding starting with the 110th Congress (2007-2008).  The HTML that makes up these pages is not to spec[2].  Furthermore, only videos from 2014 onward play in modern browsers.  Many are simply dead links.  

What I propose is less an archive than an excavation, a deep and semantic mapping of the data available about each hearing and its participants.  Media will be captured, analyzed and converted into web-standard formats[3].  Institutional metadata, such as the makeup of the Committee at the time of a given hearing will be extracted from external APIs (Sunlight Labs).  Collections containing the above metadata and related media will be published to the Internet Archive so that publics (myself included) may interrogate them further.  

[1] The Committee's front page produces 23 errors and 5 warnings using the W3C's validator tool.
[2] Patent Unencumbered formats webm (vp8) and theora will be transcoded.  

This proposed project is an attempt to resolve frictions of the 'public', 'private' and 'secret' through an archaeology and excavation of legislative media from the Select Committee on Intellegence in the US Senate between the years of 2007 and 2014 (the 110th-113th Congresses).  

The technical part of project will take the form of a set of javascript ... the written portion will consist of a critique of the existing site and an essay relating the particulars of this practice to prevailing theoretical ideas of the archive and the politics of software {{ bib}}



This specific period represents availibilty of the current iteration of the committee's website, which is due to change with the change in Senate leadership due to November's election.  Given the relative <i>unreliability</i> of the Senate's webmasters, which I will establish shortly, this change in power represents a short window to archive, preserve and analyze the site as it stands.  Because of the streaming technologies involved in serving videos, and the extent to which this site violates web and accessibility standards make this task is quite a bit more complicated than a more traditional site 'scraping' project.


These issues, both technological and conceptual, will be addressed by a set of automated scripts that walk through each open hearing page, mapping metadata, such as: the time and location of the hearing, its title and description, names and titles of witnesses.  Links to pieces of media are detected and downloaded.  All hearings' content and metadata will be uploaded to the Internet Archive as collections.

Technologies Involved:
SllimerJS (githib)
mencoder (mplayer.hu)


