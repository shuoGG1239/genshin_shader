Add-Type -AssemblyName System.Drawing
$base = 'C:\Users\Administrator\Desktop\genshin_shader\public\models\fbx\Nahida'
$files = @(
  'Avatar_Loli_Catalyst_Nahida_Tex_Body_Diffuse.png',
  'Avatar_Loli_Catalyst_Nahida_Tex_Body_Diffuse_A.png',
  'Avatar_Loli_Catalyst_Nahida_Tex_Hair_Diffuse.png',
  'Avatar_Loli_Catalyst_Nahida_Tex_Hair_Diffuse_A.png',
  'Avatar_Loli_Catalyst_Nahida_Tex_Face_Diffuse.png',
  'Avatar_Loli_Catalyst_Nahida_Tex_Face_Diffuse_A.png',
  'Avatar_Loli_Catalyst_Nahida_Tex_Body_Lightmap_G.png',
  'Avatar_Loli_Catalyst_Nahida_Tex_Body_Lightmap_R.png'
)
foreach ($f in $files) {
  $img = [System.Drawing.Bitmap]::FromFile((Join-Path $base $f))
  $sumR = 0; $sumG = 0; $sumB = 0; $sumA = 0; $n = 0; $zeros = 0
  for ($y = 0; $y -lt $img.Height; $y += 16) {
    for ($x = 0; $x -lt $img.Width; $x += 16) {
      $c = $img.GetPixel($x, $y)
      $sumR += $c.R; $sumG += $c.G; $sumB += $c.B; $sumA += $c.A
      $n++
      if ($c.R -lt 10) { $zeros++ }
    }
  }
  Write-Output ("{0} | {1}x{2} | R={3} G={4} B={5} A={6} | zeroR%={7}" -f `
    $f, $img.Width, $img.Height, `
    [math]::Round($sumR / $n, 1), `
    [math]::Round($sumG / $n, 1), `
    [math]::Round($sumB / $n, 1), `
    [math]::Round($sumA / $n, 1), `
    [math]::Round(100 * $zeros / $n, 1))
  $img.Dispose()
}
