Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Awais\.gemini\antigravity-ide\brain\97ea15ba-8390-4e7b-b400-a17232ed1d26\fims_app_logo_1785929618566.png"
$publicIcoPath = "d:\web\fan-management-system\public\icon.ico"
$buildIcoPath = "d:\web\fan-management-system\build\icon.ico"
$buildDir = "d:\web\fan-management-system\build"

if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir -Force
}

$img = [System.Drawing.Image]::FromFile($srcPath)
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.DrawImage($img, 0, 0, 256, 256)
$g.Dispose()
$img.Dispose()

$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

$pngBytes = $ms.ToArray()
$ms.Dispose()

# Create ICO Header and Directory Entry for 256x256 PNG-compressed ICO
$header = [byte[]]@(
    0x00, 0x00, # Reserved
    0x01, 0x00, # Type (1=ICO)
    0x01, 0x00, # Image Count (1)

    0x00,       # Width (0 = 256)
    0x00,       # Height (0 = 256)
    0x00,       # Color palette (0 = no palette)
    0x00,       # Reserved
    0x01, 0x00, # Planes (1)
    0x20, 0x00  # BPP (32)
)

$sizeBytes = [System.BitConverter]::GetBytes([uint32]$pngBytes.Length)
$offsetBytes = [System.BitConverter]::GetBytes([uint32]22)

$icoBytes = $header + $sizeBytes + $offsetBytes + $pngBytes

[System.IO.File]::WriteAllBytes($publicIcoPath, $icoBytes)
[System.IO.File]::WriteAllBytes($buildIcoPath, $icoBytes)

Write-Host "Successfully generated 256x256 ICO at:"
Write-Host " - $publicIcoPath ($($icoBytes.Length) bytes)"
Write-Host " - $buildIcoPath ($($icoBytes.Length) bytes)"
