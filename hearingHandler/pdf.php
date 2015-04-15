<?
error_reporting(E_ALL);
// Turn off all error reporting
error_reporting(1);
header("Content-type: text/plain");
//header('Content-Type: application/json');
$path = "/var/www/html/hearings/";
$hearing = $_POST['date'];
$session = $_POST['session'];
$filename = $_POST['pdf'];
$committee = $_POST['committee'];




$path = $path .$hearing ."/";

if (!is_dir($path)){
  mkdir($path);
}


if ($committee === "intel"){
  $url = "http://www.intelligence.senate.gov/$hearing/$filename.pdf";
}

if (get_headers($url)[0] === "HTTP/1.0 200 OK"){
  $pdffile = $path .$filename .".pdf";
  $mt = filemtime($url);
  $ct = filectime($url);
  $src = fopen($url, 'r');
  $dest = fopen($pdffile, 'w');
  stream_copy_to_stream($src, $dest);
  fclose($src);
  fclose($dest);
  if ($mt != FALSE){
    touch($pdffile, $mt);
  }
} else {
  echo "fail"; 
};

if (file_exists($pdffile)){
  $metafile = $path .$filename .".json";
  $json = shell_exec("exiftool -j $pdffile");
  file_put_contents($metafile, $json);
  echo $json;
} else {
  exit;
  $url = $url;
  $headers = get_headers($url);
  if ($headers[0] == "HTTP/1.0 404 Not Found"){
    die("Nope on <a href='$url'>$url</a>");
  }
  file_put_contents($putdir, fopen($url, 'r'));
  $json = shell_exec("exiftool -j $putdir");
  echo $json;
}
exit;
?>