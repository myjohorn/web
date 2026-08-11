# Script to generate Android Launcher Icons and Splash Screens from JohorN_logo.jpg
Add-Type -AssemblyName System.Drawing

$srcImgPath = "D:\AI\Dev\johorn\temp\JohorN_logo.jpg"
if (!(Test-Path $srcImgPath)) {
    Write-Error "Source image not found: $srcImgPath"
    exit 1
}

$resDir = "D:\AI\Dev\johorn\android\app\src\main\res"
$srcImg = [System.Drawing.Image]::FromFile($srcImgPath)

function Resize-And-Save {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [string]$DestPath
    )
    $destDir = [System.IO.Path]::GetDirectoryName($DestPath)
    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    $destBmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Draw image scaled to fit
    $graphics.DrawImage($Image, 0, 0, $Width, $Height)
    $graphics.Dispose()

    $destBmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Created icon: $DestPath ($Width x $Height)"
}

# 1. Launcher Icons for all densities
$densities = @(
    @{ Folder = "mipmap-mdpi"; Size = 48 },
    @{ Folder = "mipmap-hdpi"; Size = 72 },
    @{ Folder = "mipmap-xhdpi"; Size = 96 },
    @{ Folder = "mipmap-xxhdpi"; Size = 144 },
    @{ Folder = "mipmap-xxxhdpi"; Size = 192 }
)

foreach ($d in $densities) {
    $folder = Join-Path $resDir $d.Folder
    Resize-And-Save -Image $srcImg -Width $d.Size -Height $d.Size -DestPath (Join-Path $folder "ic_launcher.png")
    Resize-And-Save -Image $srcImg -Width $d.Size -Height $d.Size -DestPath (Join-Path $folder "ic_launcher_round.png")
    # For foreground adaptive icon
    Resize-And-Save -Image $srcImg -Width ($d.Size * 1.5 -as [int]) -Height ($d.Size * 1.5 -as [int]) -DestPath (Join-Path $folder "ic_launcher_foreground.png")
}

# 2. Splash Screens (White background with centered logo)
$splashDensities = @(
    @{ Folder = "drawable"; W = 480; H = 480 },
    @{ Folder = "drawable-port-mdpi"; W = 320; H = 480 },
    @{ Folder = "drawable-port-hdpi"; W = 480; H = 800 },
    @{ Folder = "drawable-port-xhdpi"; W = 720; H = 1280 },
    @{ Folder = "drawable-port-xxhdpi"; W = 960; H = 1600 },
    @{ Folder = "drawable-port-xxxhdpi"; W = 1280; H = 1920 }
)

foreach ($s in $splashDensities) {
    $folder = Join-Path $resDir $s.Folder
    $destPath = Join-Path $folder "splash.png"
    
    $destBmp = New-Object System.Drawing.Bitmap($s.W, $s.H)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    # Draw logo centered with max width 45%
    $logoW = [int]($s.W * 0.45)
    $logoH = [int]($logoW * ($srcImg.Height / $srcImg.Width))
    $posX = [int](($s.W - $logoW) / 2)
    $posY = [int](($s.H - $logoH) / 2)

    $graphics.DrawImage($srcImg, $posX, $posY, $logoW, $logoH)
    $graphics.Dispose()

    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Created splash: $destPath ($($s.W) x $($s.H))"
}

$srcImg.Dispose()
Write-Host "`n🎉 All Android Launcher Icons & Splash Screens generated successfully!"
