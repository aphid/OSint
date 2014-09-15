hearing-things
==============

Scraping and Analysis tools for U.S. Senate (and eventually House) Committee hearing videos and associated metadata

hearing-things is built primarily using SlimerJS, a (mostly) headless Gecko-based browser similar to PhantomJS.  

At present, this only (and partially so) works on the Senate Intelligence Committee.  Data format is still in flux.  Current video scraping methodologies work for AdobeHDS and RealMedia, covering all Senate hearings encountered thusfar back to the 110th Congress.

#### (FAQ) Frequently Anticipated Questions

#####Why SlimerJS?  Why not curl or (insert scraping library here)?

SlimerJS was the only obvious solution for getting authentication and manifest strings that depend on a working Flash plugin.  It'a also pretty sweet to be able to target your js to Firefox 33 -- native promise support! for...of loops! ES6  w/no shims or polyfills!
