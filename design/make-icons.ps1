# Draws the Money Ledger icon (dark squircle, white yuan mark, green dot) and saves PNG + ICO files.
Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [bool]$square = $false) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $s = $size / 1024.0

  # rounded square with a soft top-to-bottom gradient
  $r = $(if ($square) { 1 } else { 230 * $s }); $w = $size
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc(0, 0, 2*$r, 2*$r, 180, 90)
  $path.AddArc($w - 2*$r, 0, 2*$r, 2*$r, 270, 90)
  $path.AddArc($w - 2*$r, $w - 2*$r, 2*$r, 2*$r, 0, 90)
  $path.AddArc(0, $w - 2*$r, 2*$r, 2*$r, 90, 90)
  $path.CloseFigure()
  $rect = New-Object System.Drawing.RectangleF 0, 0, $w, $w
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 46, 52, 78)), ([System.Drawing.Color]::FromArgb(255, 11, 11, 15)), 90
  $g.FillPath($grad, $path)

  # yuan mark
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), (68 * $s)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $v = New-Object System.Drawing.Drawing2D.GraphicsPath
  $v.AddLines([System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF (352*$s), (300*$s)),
    (New-Object System.Drawing.PointF (512*$s), (515*$s)),
    (New-Object System.Drawing.PointF (672*$s), (300*$s))))
  $g.DrawPath($pen, $v)
  $g.DrawLine($pen, (512*$s), (515*$s), (512*$s), (770*$s))
  $g.DrawLine($pen, (392*$s), (570*$s), (632*$s), (570*$s))
  $g.DrawLine($pen, (392*$s), (680*$s), (632*$s), (680*$s))

  # green dot
  $dot = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 70, 199, 127))
  $d = 104 * $s
  $g.FillEllipse($dot, (780*$s - $d/2), (250*$s - $d/2), $d, $d)

  $g.Dispose()
  return $bmp
}

$out = $PSScriptRoot
$big = New-Icon 1024
$big.Save((Join-Path $out "money-ledger-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# iPhone home screen icons want a full square (iOS rounds the corners itself)
$sq = New-Icon 1024 $true
$sq.Save((Join-Path $out "money-ledger-iphone.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# Windows .ico with PNG images inside (256, 64, 48, 32, 16)
$sizes = 256, 64, 48, 32, 16
$pngs = foreach ($z in $sizes) { $b = New-Icon $z; $ms = New-Object System.IO.MemoryStream; $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); ,($ms.ToArray()) }
$fs = [System.IO.File]::Create((Join-Path $out "money-ledger.ico"))
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $z = $sizes[$i]; $len = $pngs[$i].Length
  $bw.Write([byte]($(if ($z -ge 256) { 0 } else { $z }))); $bw.Write([byte]($(if ($z -ge 256) { 0 } else { $z })))
  $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([UInt16]1); $bw.Write([UInt16]32)
  $bw.Write([UInt32]$len); $bw.Write([UInt32]$offset); $offset += $len
}
foreach ($p in $pngs) { $bw.Write($p) }
$bw.Close()
"done"
