# Script to generate Android Adaptive Icons & Splash Screens with Safe Zone Padding
Add-Type -AssemblyName System.Drawing

$rootDir = (Resolve-Path "$PSScriptRoot\..").Path
$srcImgPath = Join-Path $rootDir "temp\JohorN_logo.jpg"
if (!(Test-Path $srcImgPath)) {
    Write-Error "Source image not found: $srcImgPath"
    exit 1
}

$resDir = Join-Path $rootDir "android\app\src\main\res"
$srcImg = [System.Drawing.Image]::FromFile($srcImgPath)

function Draw-Padded-Icon {
    param(
        [System.Drawing.Image]$Image,
        [int]$CanvasWidth,
        [int]$CanvasHeight,
        [double]$PaddingRatio = 0.62,
        [string]$BgType = "White",
        [string]$DestPath
    )
    $destDir = [System.IO.Path]::GetDirectoryName($DestPath)
    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    $destBmp = New-Object System.Drawing.Bitmap($CanvasWidth, $CanvasHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    
    if ($BgType -eq "Transparent") {
        $graphics.Clear([System.Drawing.Color]::Transparent)
    } else {
        $graphics.Clear([System.Drawing.Color]::White)
    }

    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Calculate padded logo dimensions keeping aspect ratio
    $maxTargetW = $CanvasWidth * $PaddingRatio
    $maxTargetH = $CanvasHeight * $PaddingRatio

    $imgRatio = $Image.Width / $Image.Height

    if ($maxTargetW / $maxTargetH -gt $imgRatio) {
        $logoH = $maxTargetH
        $logoW = $logoH * $imgRatio
    } else {
        $logoW = $maxTargetW
        $logoH = $logoW / $imgRatio
    }

    $posX = [int](($CanvasWidth - $logoW) / 2)
    $posY = [int](($CanvasHeight - $logoH) / 2)

    $graphics.DrawImage($Image, $posX, $posY, [int]$logoW, [int]$logoH)
    $graphics.Dispose()

    $destBmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Created padded icon: $DestPath ($CanvasWidth x $CanvasHeight)"
}

# 1. Launcher Icons for all densities (Safe Zone 62% applied)
$densities = @(
    @{ Folder = "mipmap-mdpi"; BaseSize = 48 },
    @{ Folder = "mipmap-hdpi"; BaseSize = 72 },
    @{ Folder = "mipmap-xhdpi"; BaseSize = 96 },
    @{ Folder = "mipmap-xxhdpi"; BaseSize = 144 },
    @{ Folder = "mipmap-xxxhdpi"; BaseSize = 192 }
)

foreach ($d in $densities) {
    $folder = Join-Path $resDir $d.Folder
    $size = $d.BaseSize

    # Legacy & Round Icons (White background, padded logo)
    Draw-Padded-Icon -Image $srcImg -CanvasWidth $size -CanvasHeight $size -PaddingRatio 0.75 -BgType "White" -DestPath (Join-Path $folder "ic_launcher.png")
    Draw-Padded-Icon -Image $srcImg -CanvasWidth $size -CanvasHeight $size -PaddingRatio 0.75 -BgType "White" -DestPath (Join-Path $folder "ic_launcher_round.png")

    # Adaptive Icon Foreground (Canvas is 108dp equivalent -> Size * 2.25 or standard 1.5 multiplier with 55% safe ratio)
    $fgSize = [int]($size * 2.25)
    Draw-Padded-Icon -Image $srcImg -CanvasWidth $fgSize -CanvasHeight $fgSize -PaddingRatio 0.55 -BgType "Transparent" -DestPath (Join-Path $folder "ic_launcher_foreground.png")
}

# 2. Splash Screens (Centered logo)
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
    Draw-Padded-Icon -Image $srcImg -CanvasWidth $s.W -CanvasHeight $s.H -PaddingRatio 0.50 -BgType "White" -DestPath $destPath
}

$srcImg.Dispose()
Write-Host "`n🎉 Perfect Adaptive Android Launcher Icons & Splash Screens generated!"
