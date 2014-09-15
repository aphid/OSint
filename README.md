hearing-things
==============

scraping U.S. Senate (for now) hearing videos and associated metadata

hearing-things is built primarily using SlimerJS, a (mostly) headless Gecko-based browser similar to PhantomJS.  

At present, this only (and partially so) works on the Senate Intelligence Committee.  

Why SlimerJS?  Why not curl or (insert scraping library here)?

SlimerJS was the only obvious solution for getting authentication and manifest strings that depend on a working Flash plugin.  It'a also pretty sweet to be able to target your js to Firefox 33 -- native promise support! for...of loops! ES6  w/no shims or polyfills!
