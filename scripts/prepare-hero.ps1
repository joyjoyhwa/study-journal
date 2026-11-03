param([Parameter(Mandatory=$true)][string]$Source)
$ErrorActionPreference = 'Stop'
# Only technical resizing/encoding; the generated composition is not edited.
Add-Type -AssemblyName System.Drawing
$image = [Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$destination = Join-Path $PSScriptRoot '../public/images'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$encoder = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
try {
  foreach ($width in @(480,960,1672)) {
    $height = [int][Math]::Round($image.Height * $width / $image.Width)
    $bitmap = [Drawing.Bitmap]::new($width,$height)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $parameters = [Drawing.Imaging.EncoderParameters]::new(1)
    try {
      $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.DrawImage($image,0,0,$width,$height)
      $parameters.Param[0] = [Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality,[long]82)
      $bitmap.Save((Join-Path $destination "threshold-$width.jpg"),$encoder,$parameters)
    } finally { $parameters.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
  }
} finally { $image.Dispose() }
