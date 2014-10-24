<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-type: text/plain");

// tell php to automatically flush after every output
// including lines of output produced by shell commands
disable_ob();


$file = '/Users/aphid/Sites/senate_intel/incoming/data.json';
$json = file_get_contents($file);
$data = json_decode($json, true);

$manifest = $data['manifest'];
$auth = $data['auth'];
$name = $data['filename'];
 /*
$auth = "als=0,3,NaN,0,0,NaN,0,0,0,31,f,0,11676.43,f,s,KVIQVJRLLFFR,3.1.0,31&hdcore=3.1.0&plugin=aasp-3.1.0.43.124";
$manifest = "http://intel-f.akamaihd.net/z/intel060514_1@76456/manifest.f4m?g=KVIQVJRLLFFR&hdcore=3.1.0&plugin=aasp-3.1.0.43.124";
$name = "skidoo.mp4"; 
 */ 
  if (filter_var($manifest, FILTER_VALIDATE_URL) !== false) {
  
  //$command = "php AdobeHDS.php --quality high --rename --delete --manifest ".escapeshellarg($manifest) ." --auth " .escapeshellarg($auth) ."--debug --play | /usr/local/bin/ffmpeg -re -i - -c:a copy -c:v copy " .escapeshellarg($name) ." 2>&1";

  $command = "php AdobeHDS.php --quality high --rename --delete --manifest " .escapeshellarg($manifest) ." --auth " .escapeshellarg($auth) ."--debug --outfile " .escapeshellarg($name);  
  
  echo "\n" .$command ."\n";
  echo system($command);
  
  $command = "ffmpeg -i " .escapeshellarg($name) .".flv -c:a copy -c:v copy " .escapeshellarg($name) .".mp4 2>&1";
    echo system($command);
    
  
  }


function disable_ob() {
    // Turn off output buffering
    ini_set('output_buffering', 'off');
    // Turn off PHP output compression
    ini_set('zlib.output_compression', false);
    // Implicitly flush the buffer(s)
    ini_set('implicit_flush', true);
    ob_implicit_flush(true);
    // Clear, and turn off output buffering
    while (ob_get_level() > 0) {
        // Get the curent level
        $level = ob_get_level();
        // End the buffering
        ob_end_clean();
        // If the current level has not changed, abort
        if (ob_get_level() == $level) break;
    }
    // Disable apache output buffering/compression
    if (function_exists('apache_setenv')) {
        apache_setenv('no-gzip', '1');
        apache_setenv('dont-vary', '1');
    }
}

?>