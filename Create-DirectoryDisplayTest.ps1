#requires -Version 5.1
<#
.SYNOPSIS
    Crée un répertoire de test complet pour DirectoryDisplayApp.

.DESCRIPTION
    Génère de vrais fichiers dans plusieurs catégories :
    - textes, données structurées et code source ;
    - images raster et vectorielles ;
    - PDF, RTF et formats Microsoft Office Open XML ;
    - audio WAV et vidéo MP4 si FFmpeg est disponible ;
    - archives ZIP, GZ et TAR si tar.exe est disponible ;
    - e-mail, calendrier et contact ;
    - fichiers limites : vide, 1 octet, 1 Ko, 1 Mo et 1 Mo + 1 octet ;
    - noms Unicode, espaces, nom long, fichier caché, lecture seule ;
    - dossiers imbriqués, dossier vide, raccourci Windows et lien symbolique
      lorsque Windows autorise sa création.

.PARAMETER Destination
    Dossier à créer. Par défaut : .\DirectoryDisplayApp-Test

.PARAMETER Force
    Supprime le dossier existant avant de le recréer.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Create-DirectoryDisplayTest.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Create-DirectoryDisplayTest.ps1 `
        -Destination "C:\Temp\DirectoryDisplayApp-Test" -Force
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$Destination = (Join-Path -Path (Get-Location) -ChildPath "DirectoryDisplayApp-Test"),

    [Parameter()]
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Utf8NoBom = New-Object -TypeName System.Text.UTF8Encoding -ArgumentList $false

function Write-Utf8File {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Content
    )

    $parent = Split-Path -Path $Path -Parent
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    [System.IO.File]::WriteAllText($Path, $Content, $script:Utf8NoBom)
}

function Write-AsciiFile {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Content
    )

    $parent = Split-Path -Path $Path -Parent
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.Encoding]::ASCII)
}

function Write-ByteFile {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [byte[]]$Bytes
    )

    $parent = Split-Path -Path $Path -Parent
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    [System.IO.File]::WriteAllBytes($Path, $Bytes)
}

function New-SizedFile {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [ValidateRange(0, 104857600)]
        [int]$Size
    )

    $bytes = New-Object byte[] $Size

    # Les fichiers de taille limite n'ont pas besoin d'un contenu complexe.
    # On ne remplit que le début pour éviter une boucle PowerShell lente sur 1 Mo.
    $prefixLength = [Math]::Min($Size, 256)
    for ($index = 0; $index -lt $prefixLength; $index++) {
        $bytes[$index] = [byte]($index % 251)
    }

    Write-ByteFile -Path $Path -Bytes $bytes
}

function New-SimplePdf {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    $streamText = "BT`n/F1 22 Tf`n72 720 Td`n(DirectoryDisplayApp - fichier PDF de test) Tj`n0 -36 Td`n/F1 12 Tf`n(Apercu, taille, defilement et caracteres simples.) Tj`nET"
    $streamLength = [System.Text.Encoding]::ASCII.GetByteCount($streamText)

    $objects = @(
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Length $streamLength >>`nstream`n$streamText`nendstream"
    )

    $builder = New-Object System.Text.StringBuilder
    [void]$builder.Append("%PDF-1.4`n")

    $offsets = New-Object System.Collections.Generic.List[int]

    for ($index = 0; $index -lt $objects.Count; $index++) {
        $offsets.Add([System.Text.Encoding]::ASCII.GetByteCount($builder.ToString()))
        [void]$builder.Append(("{0} 0 obj`n{1}`nendobj`n" -f ($index + 1), $objects[$index]))
    }

    $xrefOffset = [System.Text.Encoding]::ASCII.GetByteCount($builder.ToString())

    [void]$builder.Append("xref`n")
    [void]$builder.Append(("0 {0}`n" -f ($objects.Count + 1)))
    [void]$builder.Append("0000000000 65535 f `n")

    foreach ($offset in $offsets) {
        [void]$builder.Append(("{0:D10} 00000 n `n" -f $offset))
    }

    [void]$builder.Append("trailer`n")
    [void]$builder.Append(("<< /Size {0} /Root 1 0 R >>`n" -f ($objects.Count + 1)))
    [void]$builder.Append("startxref`n")
    [void]$builder.Append("$xrefOffset`n")
    [void]$builder.Append("%%EOF`n")

    Write-AsciiFile -Path $Path -Content $builder.ToString()
}

function New-SineWaveWav {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter()]
        [int]$Frequency = 440,

        [Parameter()]
        [double]$DurationSeconds = 2.0
    )

    $sampleRate = 44100
    $channels = 1
    $bitsPerSample = 16
    $sampleCount = [int]($sampleRate * $DurationSeconds)
    $dataLength = $sampleCount * ($bitsPerSample / 8) * $channels

    $stream = [System.IO.File]::Create($Path)
    $writer = New-Object -TypeName System.IO.BinaryWriter -ArgumentList $stream

    try {
        $writer.Write([System.Text.Encoding]::ASCII.GetBytes("RIFF"))
        $writer.Write([int](36 + $dataLength))
        $writer.Write([System.Text.Encoding]::ASCII.GetBytes("WAVE"))
        $writer.Write([System.Text.Encoding]::ASCII.GetBytes("fmt "))
        $writer.Write([int]16)
        $writer.Write([int16]1)
        $writer.Write([int16]$channels)
        $writer.Write([int]$sampleRate)
        $writer.Write([int]($sampleRate * $channels * ($bitsPerSample / 8)))
        $writer.Write([int16]($channels * ($bitsPerSample / 8)))
        $writer.Write([int16]$bitsPerSample)
        $writer.Write([System.Text.Encoding]::ASCII.GetBytes("data"))
        $writer.Write([int]$dataLength)

        for ($sample = 0; $sample -lt $sampleCount; $sample++) {
            $value = [Math]::Sin(2.0 * [Math]::PI * $Frequency * $sample / $sampleRate)
            $pcm = [int16]($value * 12000)
            $writer.Write($pcm)
        }
    }
    finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}

function New-OpenXmlPackage {
    param(
        [Parameter(Mandatory)]
        [string]$TargetPath,

        [Parameter(Mandatory)]
        [hashtable]$Files
    )

    $tempRoot = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ("DirectoryDisplay-" + [guid]::NewGuid().ToString("N"))
    $tempZip = "$tempRoot.zip"

    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

    try {
        foreach ($entry in $Files.GetEnumerator()) {
            $relativePath = $entry.Key.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $fullPath = Join-Path -Path $tempRoot -ChildPath $relativePath
            Write-Utf8File -Path $fullPath -Content ([string]$entry.Value)
        }

        Compress-Archive -Path (Join-Path $tempRoot "*") -DestinationPath $tempZip -CompressionLevel Optimal -Force
        Move-Item -LiteralPath $tempZip -Destination $TargetPath -Force
    }
    finally {
        if (Test-Path -LiteralPath $tempRoot) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force
        }

        if (Test-Path -LiteralPath $tempZip) {
            Remove-Item -LiteralPath $tempZip -Force
        }
    }
}

function New-TestDocx {
    param([Parameter(Mandatory)][string]$Path)

    $files = @{
        "[Content_Types].xml" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
'@
        "_rels/.rels" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@
        "word/document.xml" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
        <w:t>DirectoryDisplayApp</w:t>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>Document DOCX de test créé sans Microsoft Word.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Il vérifie l’icône, les métadonnées et l’aperçu du document.</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>
'@
    }

    New-OpenXmlPackage -TargetPath $Path -Files $files
}

function New-TestXlsx {
    param([Parameter(Mandatory)][string]$Path)

    $files = @{
        "[Content_Types].xml" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>
'@
        "_rels/.rels" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
'@
        "xl/workbook.xml" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Fichiers" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>
'@
        "xl/_rels/workbook.xml.rels" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>
'@
        "xl/worksheets/sheet1.xml" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Type</t></is></c>
      <c r="B1" t="inlineStr"><is><t>Test</t></is></c>
      <c r="C1" t="inlineStr"><is><t>Résultat attendu</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>XLSX</t></is></c>
      <c r="B2" t="inlineStr"><is><t>Aperçu</t></is></c>
      <c r="C2" t="inlineStr"><is><t>Lisible</t></is></c>
    </row>
    <row r="3">
      <c r="A3" t="inlineStr"><is><t>Taille</t></is></c>
      <c r="B3"><v>1048576</v></c>
      <c r="C3" t="inlineStr"><is><t>1 Mo</t></is></c>
    </row>
  </sheetData>
</worksheet>
'@
    }

    New-OpenXmlPackage -TargetPath $Path -Files $files
}

function New-TestPptx {
    param([Parameter(Mandatory)][string]$Path)

    $files = @{
        "[Content_Types].xml" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>
'@
        "_rels/.rels" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>
'@
        "ppt/presentation.xml" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>
'@
        "ppt/_rels/presentation.xml.rels" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>
'@
        "ppt/slides/slide1.xml" = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Titre"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="1371600"/>
            <a:ext cx="10363200" cy="1828800"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
          <a:ln><a:noFill/></a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="fr-FR" sz="2800" b="1"/>
              <a:t>DirectoryDisplayApp</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:r>
              <a:rPr lang="fr-FR" sz="1600"/>
              <a:t>Présentation PPTX de test</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>
'@
    }

    New-OpenXmlPackage -TargetPath $Path -Files $files
}

function New-TestImages {
    param(
        [Parameter(Mandatory)]
        [string]$Folder
    )

    Write-Utf8File -Path (Join-Path $Folder "image-vectorielle.svg") -Content @'
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="#dbeafe"/>
      <stop offset="1" stop-color="#bfdbfe"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="115" cy="180" r="72" fill="#2563eb"/>
  <rect x="230" y="105" width="330" height="150" rx="18" fill="#ffffff"/>
  <text x="260" y="170" font-family="Segoe UI, sans-serif" font-size="34" fill="#111827">DirectoryDisplayApp</text>
  <text x="260" y="215" font-family="Segoe UI, sans-serif" font-size="22" fill="#4b5563">Image SVG de test</text>
</svg>
'@

    try {
        Add-Type -AssemblyName System.Drawing

        $bitmap = New-Object -TypeName System.Drawing.Bitmap -ArgumentList 640, 360
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $background = New-Object -TypeName System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(236, 244, 255))
        $shapeBrush = New-Object -TypeName System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(37, 99, 235))
        $textBrush = New-Object -TypeName System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(17, 24, 39))
        $fontLarge = New-Object -TypeName System.Drawing.Font -ArgumentList "Segoe UI", 26, ([System.Drawing.FontStyle]::Bold)
        $fontSmall = New-Object -TypeName System.Drawing.Font -ArgumentList "Segoe UI", 15, ([System.Drawing.FontStyle]::Regular)

        try {
            $graphics.FillRectangle($background, 0, 0, 640, 360)
            $graphics.FillEllipse($shapeBrush, 55, 110, 140, 140)
            $graphics.DrawString("DirectoryDisplayApp", $fontLarge, $textBrush, 235, 125)
            $graphics.DrawString("Image raster de test - 640 x 360", $fontSmall, $textBrush, 237, 185)

            $bitmap.Save((Join-Path $Folder "image-test.png"), [System.Drawing.Imaging.ImageFormat]::Png)
            $bitmap.Save((Join-Path $Folder "image-test.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $bitmap.Save((Join-Path $Folder "image-test.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
            $bitmap.Save((Join-Path $Folder "image-test.gif"), [System.Drawing.Imaging.ImageFormat]::Gif)
        }
        finally {
            $fontSmall.Dispose()
            $fontLarge.Dispose()
            $textBrush.Dispose()
            $shapeBrush.Dispose()
            $background.Dispose()
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }
    catch {
        Write-Utf8File -Path (Join-Path $Folder "ERREUR-IMAGES-RASTER.txt") -Content @"
Les images PNG, JPG, BMP et GIF n'ont pas pu être créées avec System.Drawing.

Erreur :
$($_.Exception.Message)

Le fichier SVG a tout de même été créé.
Exécutez ce script avec Windows PowerShell 5.1 pour obtenir tous les formats raster.
"@
    }
}

function New-OptionalVideo {
    param(
        [Parameter(Mandatory)]
        [string]$Folder
    )

    $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue

    if (-not $ffmpeg) {
        Write-Utf8File -Path (Join-Path $Folder "VIDEO-NON-CREE.txt") -Content @'
FFmpeg n'a pas été trouvé dans le PATH.

Pour ajouter un vrai fichier MP4 au jeu de test :
1. installez FFmpeg ;
2. relancez ce script avec -Force.
'@
        return
    }

    $output = Join-Path $Folder "video-test.mp4"

    try {
        & $ffmpeg.Source `
            -hide_banner `
            -loglevel error `
            -y `
            -f lavfi `
            -i "testsrc=duration=2:size=640x360:rate=25" `
            -f lavfi `
            -i "sine=frequency=440:duration=2" `
            -shortest `
            -pix_fmt yuv420p `
            $output

        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output)) {
            throw "FFmpeg a retourné le code $LASTEXITCODE."
        }
    }
    catch {
        Write-Utf8File -Path (Join-Path $Folder "VIDEO-ERREUR.txt") -Content @"
FFmpeg est installé, mais le MP4 n'a pas pu être créé.

Erreur :
$($_.Exception.Message)
"@
    }
}

function New-TestShortcut {
    param(
        [Parameter(Mandatory)]
        [string]$Folder,

        [Parameter(Mandatory)]
        [string]$TargetPath
    )

    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut((Join-Path $Folder "Raccourci vers le fichier texte.lnk"))
        $shortcut.TargetPath = $TargetPath
        $shortcut.WorkingDirectory = Split-Path -Path $TargetPath -Parent
        $shortcut.Description = "Raccourci de test pour DirectoryDisplayApp"
        $shortcut.Save()
    }
    catch {
        Write-Utf8File -Path (Join-Path $Folder "RACCOURCI-NON-CREE.txt") -Content $_.Exception.Message
    }
}

function New-OptionalSymbolicLink {
    param(
        [Parameter(Mandatory)]
        [string]$Folder,

        [Parameter(Mandatory)]
        [string]$TargetPath
    )

    try {
        New-Item `
            -ItemType SymbolicLink `
            -Path (Join-Path $Folder "lien-symbolique-vers-texte.txt") `
            -Target $TargetPath `
            -ErrorAction Stop | Out-Null
    }
    catch {
        Write-Utf8File -Path (Join-Path $Folder "LIEN-SYMBOLIQUE-NON-CREE.txt") -Content @"
Windows n'a pas autorisé la création du lien symbolique.

Cela peut nécessiter le mode développeur Windows ou des droits élevés.

Erreur :
$($_.Exception.Message)
"@
    }
}

$Destination = [System.IO.Path]::GetFullPath($Destination)

if (Test-Path -LiteralPath $Destination) {
    if (-not $Force) {
        throw "Le dossier existe déjà : $Destination. Utilisez -Force pour le recréer."
    }

    Remove-Item -LiteralPath $Destination -Recurse -Force
}

New-Item -ItemType Directory -Path $Destination -Force | Out-Null

$folders = @{
    TextCode   = Join-Path $Destination "01-Texte-et-code"
    Images     = Join-Path $Destination "02-Images"
    Documents  = Join-Path $Destination "03-Documents"
    Media      = Join-Path $Destination "04-Audio-et-video"
    Archives   = Join-Path $Destination "05-Archives"
    Personal   = Join-Path $Destination "06-Email-calendrier-contact"
    EdgeCases  = Join-Path $Destination "07-Cas-limites"
    Structure  = Join-Path $Destination "08-Dossiers-et-liens"
}

foreach ($folder in $folders.Values) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}

# ---------------------------------------------------------------------------
# 01 - Texte, données structurées et code
# ---------------------------------------------------------------------------

Write-Utf8File (Join-Path $folders.TextCode "texte-simple.txt") @'
DirectoryDisplayApp — fichier texte de test

Accents : é è ê ë à â ç î ï ô ö ù û ü œ
Symboles : € CHF £ ¥ © ® ™ ✓ → ←
Emoji : 📁 🔍 🖼️ 🎵

Ligne courte.
Ligne volontairement beaucoup plus longue afin de vérifier le retour automatique à la ligne, le défilement horizontal et la façon dont l’aperçu réagit à un contenu dépassant la largeur disponible dans le panneau.
'@

Write-Utf8File (Join-Path $folders.TextCode "README.md") @'
# DirectoryDisplayApp

## Objectif

Ce fichier vérifie l’affichage du Markdown.

- liste simple ;
- texte **gras** ;
- texte *italique* ;
- lien : <https://example.com> ;
- code : `const visible = true;`.

```js
console.log("Aperçu Markdown");
```
'@

Write-Utf8File (Join-Path $folders.TextCode "donnees.json") @'
{
  "application": "DirectoryDisplayApp",
  "version": "test",
  "preview": true,
  "maximumBytes": 1048576,
  "languages": ["fr", "en", "de"],
  "nested": {
    "accented": "Genève",
    "unicode": "📁"
  }
}
'@

Write-Utf8File (Join-Path $folders.TextCode "configuration.yaml") @'
application: DirectoryDisplayApp
preview:
  enabled: true
  maximumBytes: 1048576
formats:
  - text
  - image
  - pdf
  - audio
'@

Write-Utf8File (Join-Path $folders.TextCode "configuration.toml") @'
application = "DirectoryDisplayApp"
version = "test"

[preview]
enabled = true
maximum_bytes = 1048576
'@

Write-Utf8File (Join-Path $folders.TextCode "tableau.csv") @'
id;nom;type;taille
1;Document texte;txt;512
2;Image;png;4096
3;Document PDF;pdf;8192
'@

Write-Utf8File (Join-Path $folders.TextCode "tableau.tsv") "id`tname`ttype`n1`tDirectoryDisplayApp`ttest"

Write-Utf8File (Join-Path $folders.TextCode "document.xml") @'
<?xml version="1.0" encoding="UTF-8"?>
<directory-display-app>
  <preview enabled="true" maximum-bytes="1048576"/>
  <file type="text">texte-simple.txt</file>
  <file type="image">image-test.png</file>
</directory-display-app>
'@

Write-Utf8File (Join-Path $folders.TextCode "page.html") @'
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>DirectoryDisplayApp</title>
  <style>
    body { font-family: system-ui; margin: 3rem; background: #f3f4f6; }
    article { max-width: 650px; padding: 2rem; background: white; border-radius: 16px; }
  </style>
</head>
<body>
  <article>
    <h1>Fichier HTML de test</h1>
    <p>Ce document permet de contrôler l’aperçu HTML.</p>
    <button type="button">Bouton inactif</button>
  </article>
</body>
</html>
'@

Write-Utf8File (Join-Path $folders.TextCode "styles.css") @'
:root {
  color-scheme: light dark;
  --panel-width: 420px;
}

.preview-panel {
  width: var(--panel-width);
  overflow: auto;
}
'@

Write-Utf8File (Join-Path $folders.TextCode "script.js") @'
export function describeFile(file) {
  return {
    name: file.name,
    size: file.size,
    extension: file.name.split(".").pop()?.toLowerCase() ?? null
  };
}
'@

Write-Utf8File (Join-Path $folders.TextCode "typescript.ts") @'
interface FilePreview {
  name: string;
  size: number;
  visible: boolean;
}

const preview: FilePreview = {
  name: "document.txt",
  size: 1024,
  visible: true
};

export default preview;
'@

Write-Utf8File (Join-Path $folders.TextCode "module.mjs") @'
const formats = new Set(["txt", "md", "json", "png", "pdf"]);
console.log([...formats]);
'@

Write-Utf8File (Join-Path $folders.TextCode "donnees.ndjson") @'
{"id":1,"name":"texte.txt"}
{"id":2,"name":"image.png"}
{"id":3,"name":"document.pdf"}
'@

Write-Utf8File (Join-Path $folders.TextCode "requete.sql") @'
CREATE TABLE files (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mime_type TEXT
);

INSERT INTO files (name, size_bytes, mime_type)
VALUES ('texte-simple.txt', 512, 'text/plain');
'@

Write-Utf8File (Join-Path $folders.TextCode "schema.graphql") @'
type FileEntry {
  id: ID!
  name: String!
  sizeBytes: Int!
  mimeType: String
}

type Query {
  files: [FileEntry!]!
}
'@

Write-Utf8File (Join-Path $folders.TextCode "configuration.ini") @'
[application]
name=DirectoryDisplayApp
mode=test

[preview]
enabled=true
maximumBytes=1048576
'@

Write-Utf8File (Join-Path $folders.TextCode "journal.log") @'
2026-07-24T07:00:00+02:00 INFO  Application démarrée
2026-07-24T07:00:01+02:00 INFO  Répertoire de test chargé
2026-07-24T07:00:02+02:00 WARN  Exemple d’avertissement
2026-07-24T07:00:03+02:00 ERROR Exemple d’erreur sans conséquence
'@

Write-Utf8File (Join-Path $folders.TextCode "script.ps1") @'
param([string]$Name = "DirectoryDisplayApp")
Write-Host "Test PowerShell : $Name"
'@

Write-AsciiFile (Join-Path $folders.TextCode "script.bat") @'
@echo off
echo Test DirectoryDisplayApp
pause
'@

Write-Utf8File (Join-Path $folders.TextCode "script.py") @'
from pathlib import Path

root = Path(__file__).parent
print(f"Répertoire : {root}")
'@

Write-Utf8File (Join-Path $folders.TextCode "programme.c") @'
#include <stdio.h>

int main(void) {
    puts("DirectoryDisplayApp");
    return 0;
}
'@

Write-Utf8File (Join-Path $folders.TextCode "programme.cpp") @'
#include <iostream>

int main() {
    std::cout << "DirectoryDisplayApp\n";
    return 0;
}
'@

Write-Utf8File (Join-Path $folders.TextCode "Programme.java") @'
public final class Programme {
    public static void main(String[] args) {
        System.out.println("DirectoryDisplayApp");
    }
}
'@

Write-Utf8File (Join-Path $folders.TextCode "sans-extension") @'
Ce fichier ne possède aucune extension.
DirectoryDisplayApp doit tout de même pouvoir afficher son nom, sa taille et ses métadonnées.
'@

# ---------------------------------------------------------------------------
# 02 - Images
# ---------------------------------------------------------------------------

New-TestImages -Folder $folders.Images

# ---------------------------------------------------------------------------
# 03 - Documents
# ---------------------------------------------------------------------------

New-SimplePdf -Path (Join-Path $folders.Documents "document-test.pdf")

Write-Utf8File (Join-Path $folders.Documents "document-test.rtf") @'
{\rtf1\ansi\deff0
{\fonttbl{\f0 Segoe UI;}}
\f0\fs32\b DirectoryDisplayApp\b0\par
\fs22 Document RTF de test.\par
Accents : \u233? \u232? \u224? \u231?.\par
}
'@

New-TestDocx -Path (Join-Path $folders.Documents "document-test.docx")
New-TestXlsx -Path (Join-Path $folders.Documents "tableur-test.xlsx")
New-TestPptx -Path (Join-Path $folders.Documents "presentation-test.pptx")

# ---------------------------------------------------------------------------
# 04 - Audio et vidéo
# ---------------------------------------------------------------------------

New-SineWaveWav -Path (Join-Path $folders.Media "son-test-440-hz.wav")
New-OptionalVideo -Folder $folders.Media

# ---------------------------------------------------------------------------
# 05 - Archives
# ---------------------------------------------------------------------------

$archiveSource = Join-Path $folders.Archives "_contenu-temporaire"
New-Item -ItemType Directory -Path $archiveSource -Force | Out-Null
Write-Utf8File (Join-Path $archiveSource "fichier-a.txt") "Premier fichier de l'archive."
Write-Utf8File (Join-Path $archiveSource "fichier-b.json") '{"archive":true,"count":2}'

Compress-Archive `
    -Path (Join-Path $archiveSource "*") `
    -DestinationPath (Join-Path $folders.Archives "archive-test.zip") `
    -CompressionLevel Optimal `
    -Force

$gzipSource = Join-Path $archiveSource "fichier-a.txt"
$gzipTarget = Join-Path $folders.Archives "texte-test.txt.gz"
$inputStream = [System.IO.File]::OpenRead($gzipSource)
$outputStream = [System.IO.File]::Create($gzipTarget)
$gzipStream = New-Object `
    -TypeName System.IO.Compression.GZipStream `
    -ArgumentList $outputStream, ([System.IO.Compression.CompressionMode]::Compress)

try {
    $inputStream.CopyTo($gzipStream)
}
finally {
    $gzipStream.Dispose()
    $outputStream.Dispose()
    $inputStream.Dispose()
}

$tar = Get-Command tar.exe -ErrorAction SilentlyContinue
if (-not $tar) {
    $tar = Get-Command tar -ErrorAction SilentlyContinue
}

if ($tar) {
    Push-Location $archiveSource
    try {
        & $tar.Source -cf (Join-Path $folders.Archives "archive-test.tar") "fichier-a.txt" "fichier-b.json"
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Utf8File (Join-Path $folders.Archives "TAR-NON-CREE.txt") "tar.exe n'a pas été trouvé."
}

Remove-Item -LiteralPath $archiveSource -Recurse -Force

# ---------------------------------------------------------------------------
# 06 - E-mail, calendrier et contact
# ---------------------------------------------------------------------------

Write-Utf8File (Join-Path $folders.Personal "message-test.eml") @'
From: test@example.com
To: utilisateur@example.com
Subject: Test DirectoryDisplayApp
Date: Fri, 24 Jul 2026 07:00:00 +0200
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

Bonjour,

Ceci est un fichier EML de test pour DirectoryDisplayApp.

Cordialement,
Le générateur de fichiers
'@

Write-Utf8File (Join-Path $folders.Personal "evenement-test.ics") @'
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DirectoryDisplayApp//Test//FR
BEGIN:VEVENT
UID:directory-display-test-20260724@example.com
DTSTAMP:20260724T050000Z
DTSTART:20260724T080000Z
DTEND:20260724T090000Z
SUMMARY:Test DirectoryDisplayApp
DESCRIPTION:Événement de calendrier de test
LOCATION:Genève
END:VEVENT
END:VCALENDAR
'@

Write-Utf8File (Join-Path $folders.Personal "contact-test.vcf") @'
BEGIN:VCARD
VERSION:3.0
FN:Utilisateur Test
N:Test;Utilisateur;;;
ORG:DirectoryDisplayApp
EMAIL:test@example.com
TEL:+41220000000
NOTE:Contact de test
END:VCARD
'@

# ---------------------------------------------------------------------------
# 07 - Cas limites
# ---------------------------------------------------------------------------

New-SizedFile -Path (Join-Path $folders.EdgeCases "taille-0-octet.bin") -Size 0
New-SizedFile -Path (Join-Path $folders.EdgeCases "taille-1-octet.bin") -Size 1
New-SizedFile -Path (Join-Path $folders.EdgeCases "taille-1-ko.bin") -Size 1024
New-SizedFile -Path (Join-Path $folders.EdgeCases "taille-exactement-1-Mo.bin") -Size 1048576
New-SizedFile -Path (Join-Path $folders.EdgeCases "taille-1-Mo-plus-1-octet.bin") -Size 1048577

$randomBytes = New-Object byte[] 4096
$randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $randomGenerator.GetBytes($randomBytes)
}
finally {
    $randomGenerator.Dispose()
}
Write-ByteFile -Path (Join-Path $folders.EdgeCases "binaire-aleatoire.bin") -Bytes $randomBytes

Write-Utf8File (Join-Path $folders.EdgeCases "fichier avec plusieurs espaces dans le nom.txt") "Nom contenant plusieurs espaces."
Write-Utf8File (Join-Path $folders.EdgeCases "éèàç-中文-العربية-🚀.txt") "Nom Unicode complet."
Write-Utf8File (Join-Path $folders.EdgeCases ("nom-tres-long-" + ("x" * 90) + ".txt")) "Nom de fichier volontairement long."
Write-Utf8File (Join-Path $folders.EdgeCases ".gitignore") "node_modules/`n.env`ndist/"

$hiddenFile = Join-Path $folders.EdgeCases "fichier-cache.txt"
Write-Utf8File $hiddenFile "Ce fichier possède l'attribut Windows Caché."
(Get-Item -LiteralPath $hiddenFile).Attributes = (Get-Item -LiteralPath $hiddenFile).Attributes -bor [System.IO.FileAttributes]::Hidden

$readOnlyFile = Join-Path $folders.EdgeCases "fichier-lecture-seule.txt"
Write-Utf8File $readOnlyFile "Ce fichier possède l'attribut Lecture seule."
(Get-Item -LiteralPath $readOnlyFile).IsReadOnly = $true

# ---------------------------------------------------------------------------
# 08 - Structure des dossiers, raccourci et lien symbolique
# ---------------------------------------------------------------------------

New-Item -ItemType Directory -Path (Join-Path $folders.Structure "dossier-vide") -Force | Out-Null
$deepFolder = Join-Path $folders.Structure "niveau-1\niveau-2\niveau-3\niveau-4"
New-Item -ItemType Directory -Path $deepFolder -Force | Out-Null
Write-Utf8File (Join-Path $deepFolder "fichier-profond.txt") "Fichier situé dans quatre niveaux de dossiers."

$shortcutTarget = Join-Path $folders.TextCode "texte-simple.txt"
New-TestShortcut -Folder $folders.Structure -TargetPath $shortcutTarget
New-OptionalSymbolicLink -Folder $folders.Structure -TargetPath $shortcutTarget

# ---------------------------------------------------------------------------
# Documentation et manifeste
# ---------------------------------------------------------------------------

Write-Utf8File (Join-Path $Destination "LISEZ-MOI.txt") @"
RÉPERTOIRE DE TEST DIRECTORYDISPLAYAPP
======================================

Créé le : $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Chemin   : $Destination

Le répertoire contient :

01-Texte-et-code
  TXT, Markdown, JSON, YAML, TOML, CSV, TSV, XML, HTML, CSS,
  JavaScript, TypeScript, MJS, NDJSON, SQL, GraphQL, INI, LOG,
  PowerShell, BAT, Python, C, C++, Java et fichier sans extension.

02-Images
  SVG, PNG, JPG, BMP et GIF.
  Les formats raster nécessitent System.Drawing, disponible normalement
  dans Windows PowerShell 5.1.

03-Documents
  PDF, RTF, DOCX, XLSX et PPTX.

04-Audio-et-video
  WAV généré localement.
  MP4 généré seulement si FFmpeg est installé.

05-Archives
  ZIP, GZ et TAR si tar.exe est disponible.

06-Email-calendrier-contact
  EML, ICS et VCF.

07-Cas-limites
  Fichiers de 0 octet, 1 octet, 1 Ko, exactement 1 Mo et 1 Mo + 1 octet.
  Fichier binaire, noms avec espaces, Unicode, nom long, fichier caché
  et fichier en lecture seule.

08-Dossiers-et-liens
  Dossier vide, structure profonde, raccourci Windows et tentative de
  création d'un lien symbolique.

Le fichier manifeste.csv contient la liste finale des fichiers créés.
"@

$manifest = Get-ChildItem -LiteralPath $Destination -File -Recurse -Force |
    Sort-Object FullName |
    ForEach-Object {
        [pscustomobject]@{
            RelativePath = $_.FullName.Substring($Destination.Length).TrimStart("\")
            Extension    = if ($_.Extension) { $_.Extension.ToLowerInvariant() } else { "(aucune)" }
            SizeBytes    = $_.Length
            Hidden       = [bool]($_.Attributes -band [System.IO.FileAttributes]::Hidden)
            ReadOnly     = $_.IsReadOnly
            LastWrite    = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        }
    }

$manifest |
    Export-Csv `
        -LiteralPath (Join-Path $Destination "manifeste.csv") `
        -Delimiter ";" `
        -NoTypeInformation `
        -Encoding UTF8

$summary = $manifest |
    Group-Object Extension |
    Sort-Object Name |
    ForEach-Object {
        "{0,-12} {1,4} fichier(s)" -f $_.Name, $_.Count
    }

Write-Host ""
Write-Host "Répertoire de test créé :" -ForegroundColor Green
Write-Host "  $Destination"
Write-Host ""
Write-Host ("Nombre de fichiers : {0}" -f ((Get-ChildItem -LiteralPath $Destination -File -Recurse -Force).Count))
Write-Host ("Nombre de dossiers : {0}" -f ((Get-ChildItem -LiteralPath $Destination -Directory -Recurse -Force).Count))
Write-Host ""
Write-Host "Formats générés :"
$summary | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "Ouvrez ce dossier dans DirectoryDisplayApp pour commencer les tests."
