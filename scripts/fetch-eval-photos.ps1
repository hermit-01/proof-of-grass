# Downloads the eval photos listed in eval/SOURCES.txt from Wikimedia Commons (512 px wide thumbnails).
# The photos are not committed; each keeps its own licence (see eval/SOURCES.txt).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/fetch-eval-photos.ps1
$evalDir = Join-Path $PSScriptRoot '..\eval'
$out = Join-Path $evalDir 'photos'
New-Item -ItemType Directory -Force $out | Out-Null
$ua = @{ 'User-Agent' = 'proof-of-grass-eval/1.0 (https://github.com/hermit-01/proof-of-grass)' }
foreach ($line in Get-Content (Join-Path $evalDir 'SOURCES.txt')) {
  if ($line -notmatch '^(\S+\.jpg)\s+https://commons\.wikimedia\.org/wiki/(File:\S+)') { continue }
  $name = $Matches[1]
  $title = [uri]::UnescapeDataString($Matches[2])
  $file = Join-Path $out $name
  if (Test-Path $file) { continue }
  $api = 'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=512&format=json&titles=' + [uri]::EscapeDataString($title)
  $page = (Invoke-RestMethod -Headers $ua -TimeoutSec 60 $api).query.pages.PSObject.Properties.Value | Select-Object -First 1
  Invoke-WebRequest -Headers $ua -TimeoutSec 60 -Uri $page.imageinfo[0].thumburl -OutFile $file -UseBasicParsing
  "fetched $name"
  Start-Sleep -Seconds 3  # Commons answers 429 to fast requests
}
"done: $((Get-ChildItem $out -Filter *.jpg).Count) photos in eval/photos"
