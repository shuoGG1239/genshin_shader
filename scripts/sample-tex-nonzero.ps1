Add-Type -AssemblyName System.Drawing
$base = 'C:\Users\Administrator\Desktop\genshin_shader\public\models\fbx\Nahida'
$f = 'Avatar_Loli_Catalyst_Nahida_Tex_Body_Diffuse_A.png'
$img = [System.Drawing.Bitmap]::FromFile((Join-Path $base $f))
$hist = New-Object int[] 16
$max = 0; $maxX = 0; $maxY = 0; $nonzero = 0
for ($y = 0; $y -lt $img.Height; $y++) {
  for ($x = 0; $x -lt $img.Width; $x++) {
    $v = $img.GetPixel($x, $y).R
    $hist[[math]::Min(15, [int]($v / 16))]++
    if ($v -gt 10) { $nonzero++ }
    if ($v -gt $max) { $max = $v; $maxX = $x; $maxY = $y }
  }
}
Write-Output ("nonzero={0} / {1} ({2}%) max={3} at {4},{5}" -f $nonzero, ($img.Width*$img.Height), [math]::Round(100*$nonzero/($img.Width*$img.Height),2), $max, $maxX, $maxY)
Write-Output ("hist16: " + ($hist -join ', '))
$img.Dispose()
