<?
// Report all PHP errors (see changelog)
//"date=090310&session=111&pdf=responses"

error_reporting(E_ALL);
$data_dir = "/var/www/html/hearings/";

$date = $_POST['date'];
$fn = $_POST['pdf'];
$ses = $_POST['session'];


$committee = "intelligence";
$path = $data_dir ."data/senate_" .$committee .".json";
$json = file_get_contents($path);
$hearings = json_decode($json, true);
foreach($hearings['hearings'] as $hearing){
  if ($hearing['shortdate'] == $date){
    foreach($hearing['pdfs'] as $pdf){
      if ($pdf['filename'] == $fn){
       $path = $data_dir . $ses ."/" .$date ."/" .$pdf['filename'] .".pdf";
       if(!file_exists($path)){
         $thepdf = file_get_contents($pdf['url']);   
          file_put_contents($path, $thepdf);
       }
      }
    }
  }
}

?>
