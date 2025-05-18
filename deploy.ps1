<#
.SYNOPSIS
  Creates deployment assets for embedding either the CSV Dashboard Generator (Viewer) 
  or the CSV Data Editor in a Confluence HTML Macro or similar environment.
  Merges CSS and JS, updates references, and extracts the necessary HTML fragment.
  Explicitly handles UTF-8 encoding WITHOUT BOM for all file operations.

.PARAMETER SourceAppDirectory
  The root directory of the application (e.g., 'csv_visualiser' or 'csv_editor')
  for which to create the deployment assets. This directory should contain
  an 'index.html' (or 'editor.html'), 'config.js' (or 'editor_config_*.js' linked in HTML),
  and 'css/' and 'js/' subfolders.

.DESCRIPTION
  This script prepares a client-side web application for embedding by:
  1. Defining UTF-8 encoding without BOM.
  2. Creating/cleaning a 'deploy' subfolder within the SourceAppDirectory.
  3. Copying the primary configuration file (e.g., config.js or the one linked in editor.html) using binary copy.
  4. Reading the original main HTML file (e.g., index.html or editor.html) explicitly as UTF-8.
  5. Merging linked CSS files into 'deploy/style.css'.
  6. Merging linked JS files (excluding the primary config) into 'deploy/script.js', ensuring correct order for dependencies.
  7. Extracting body content from the main HTML file.
  8. Removing original <link rel="stylesheet"> and local <script src="js/..."> tags from the extracted body.
     It will *keep* <script> tags for external libraries (like Vis.js) and the primary config script tag.
  9. Creating 'deploy/dashboard_fragment.html' (or 'editor_fragment.html') containing the cleaned fragment.

.NOTES
  Run from the parent directory of 'csv_visualiser' and 'csv_editor' (e.g., 'csv_visualiser_public').
  Requires PS 5.1+.
  Update paths in the generated fragment HTML based on Confluence hosting before use.
#>
param(
    [Parameter(Mandatory=$true, HelpMessage="Root directory of the application to deploy (e.g., 'csv_visualiser' or 'csv_editor').")]
    [string]$SourceAppDirectory
)

# --- Configuration ---
$ProjectRoot = $PSScriptRoot # Assuming deploy.ps1 is in the parent of SourceAppDirectory
$SourceDirectoryPath = Join-Path -Path $ProjectRoot -ChildPath $SourceAppDirectory

$MainHtmlFileName = ""
$PrimaryConfigFileName = "" 
$FragmentOutputFileName = ""
$coreJsFiles = @()

if ($SourceAppDirectory -eq "csv_visualiser") {
    $MainHtmlFileName = "index.html"
    $PrimaryConfigFileName = "config.js" # Viewer's main config, directly referenced.
    $FragmentOutputFileName = "dashboard_fragment.html"
    $coreJsFiles = @(
        "js/renderers/renderer-shared.js", # Contains isTruthy, formatTag, sortData, etc.
        "js/config-loader.js",
        "js/data-handler.js", # Depends on shared
        "js/view-manager.js", # Depends on shared, config-loader
        "js/export-handler.js" # Depends on shared
        # app.js and specific view renderers (table, kanban, etc.) will be picked up by regex
    )
    Write-Host "Configuring for CSV Visualiser (Viewer) deployment..." -ForegroundColor Green
} elseif ($SourceAppDirectory -eq "csv_editor") {
    $MainHtmlFileName = "editor.html"
    # PrimaryConfigFileName for editor is determined by parsing editor.html later
    $FragmentOutputFileName = "editor_fragment.html"
    $coreJsFiles = @(
        "js/shared_utils.js",        # Global utilities (isTruthy, readFileContent, sortData, formatTag, loadJsConfigurationFile)
        "js/editor_dom_elements.js", # DOM elements (global var)
        "js/editor_config_handler.js" # Uses loadJsConfigurationFile from shared_utils
        # Other editor scripts like editor_app.js, editor_data_grid.js etc., will be picked up by regex.
        # editor_app.js should be last or near last as it initializes things.
    )
    Write-Host "Configuring for CSV Editor deployment..." -ForegroundColor Green
} else {
    Write-Error "Unsupported SourceAppDirectory: '$SourceAppDirectory'. Expected 'csv_visualiser' or 'csv_editor'."
    exit 1
}

$DeployDirectoryName = "deploy"
$DeployDirectoryPath = Join-Path -Path $SourceDirectoryPath -ChildPath $DeployDirectoryName
$MergedScriptName = "script.js"
$MergedCssName = "style.css"

# --- Script Body ---
Write-Host "Starting fragment deployment process for '$SourceAppDirectory' (UTF-8 No BOM Enforcement)..." -ForegroundColor Cyan

if (-not (Test-Path -Path $SourceDirectoryPath -PathType Container)) {
    Write-Error "Source application directory not found: $SourceDirectoryPath"
    exit 1
}

$utf8NoBomEncoding = New-Object System.Text.UTF8Encoding($false)

if (Test-Path -Path $DeployDirectoryPath) {
    Write-Host "Removing existing deploy directory: $DeployDirectoryPath" -ForegroundColor Yellow
    try { Remove-Item -Path $DeployDirectoryPath -Recurse -Force -ErrorAction Stop }
    catch { Write-Error "Failed to remove existing deploy directory. Error: $($_.Exception.Message)"; exit 1 }
}
Write-Host "Creating deploy directory: $DeployDirectoryPath"
New-Item -Path $DeployDirectoryPath -ItemType Directory -ErrorAction Stop | Out-Null

$originalHtmlPath = Join-Path -Path $SourceDirectoryPath -ChildPath $MainHtmlFileName
if (-not (Test-Path $originalHtmlPath)) { Write-Error "Original HTML file '$MainHtmlFileName' not found in $SourceDirectoryPath."; exit 1 }
Write-Host "Reading original HTML file '$originalHtmlPath' as UTF-8..."
try {
    $originalHtmlContent = [System.IO.File]::ReadAllText($originalHtmlPath, [System.Text.Encoding]::UTF8)
} catch {
    Write-Error "Failed to read original HTML file. Error: $($_.Exception.Message)"; exit 1
}

if ($SourceAppDirectory -eq "csv_editor") {
    $editorConfigScriptTagRegex = '<script\s+src="([^"]*editor_config[^"]*\.js)".*?></script>'
    $match = [regex]::Match($originalHtmlContent, $editorConfigScriptTagRegex)
    if ($match.Success) {
        $PrimaryConfigFileName = Split-Path -Path $match.Groups[1].Value -Leaf
        Write-Host "Determined primary editor config file from HTML: $PrimaryConfigFileName"
    } else {
        Write-Warning "Could not determine embedded editor config file name from '$MainHtmlFileName'. If one is expected, it won't be copied to deploy."
    }
}

if ($PrimaryConfigFileName) {
    Write-Host "Copying primary configuration file: $PrimaryConfigFileName..."
    $sourceConfigFile = Join-Path -Path $SourceDirectoryPath -ChildPath $PrimaryConfigFileName
    $destConfigFile = Join-Path -Path $DeployDirectoryPath -ChildPath $PrimaryConfigFileName
    if (Test-Path $sourceConfigFile) {
        try {
            Copy-Item -Path $sourceConfigFile -Destination $destConfigFile -Force -ErrorAction Stop
            Write-Host "  Copied $PrimaryConfigFileName."
        } catch { Write-Error "Failed to copy $PrimaryConfigFileName. Error: $($_.Exception.Message)" }
    } else { Write-Warning "Source primary configuration file not found: $sourceConfigFile. Skipping copy." }
}

function Get-Utf8FileContent {
    param([string]$FilePath)
    try { return [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8) }
    catch { Write-Warning "  Failed to read '$FilePath' as UTF-8. Error: $($_.Exception.Message)"; return $null }
}

Write-Host "Merging CSS files..." -ForegroundColor Cyan
$mergedCssPath = Join-Path -Path $DeployDirectoryPath -ChildPath $MergedCssName
$cssFilesContentList = [System.Collections.Generic.List[string]]::new()
$cssLinkRegex = '<link\s+rel="stylesheet"\s+href="((?:css/)[^"]+\.css)".*?>' # Ensure it's from css/ folder
$cssMatches = [regex]::Matches($originalHtmlContent, $cssLinkRegex)
if ($cssMatches.Count -eq 0) { Write-Warning "No local CSS links (href=""css/..."") found." }
else {
    Write-Host "Found $($cssMatches.Count) local CSS files to merge:"
    foreach ($match in $cssMatches) {
        $cssRelativePath = $match.Groups[1].Value
        $cssFullPath = Join-Path -Path $SourceDirectoryPath -ChildPath $cssRelativePath
        if (Test-Path $cssFullPath) {
            Write-Host "  Merging CSS: $cssRelativePath"
            $content = Get-Utf8FileContent -FilePath $cssFullPath
            if ($content -ne $null) { $cssFilesContentList.Add($content + "`n") }
            else { Write-Warning "  Skipping CSS file due to read error: $cssFullPath" }
        } else { Write-Warning "  CSS file not found: $cssFullPath. Skipping." }
    }
    if ($cssFilesContentList.Count -gt 0) {
        Write-Host "Writing merged CSS to $MergedCssName (UTF-8 No BOM)..."
        try { [System.IO.File]::WriteAllText($mergedCssPath, ($cssFilesContentList -join ""), $utf8NoBomEncoding) }
        catch { Write-Error "Failed to write merged CSS. Error: $($_.Exception.Message)"; exit 1 }
    } else { Write-Warning "No valid CSS content merged."}
}

Write-Host "Merging local JavaScript files..." -ForegroundColor Cyan
$mergedScriptPath = Join-Path -Path $DeployDirectoryPath -ChildPath $MergedScriptName
$jsFilesContentList = [System.Collections.Generic.List[string]]::new()
$processedJsFiles = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

foreach ($coreFileRelativePath in $coreJsFiles) {
    $coreFileFullPath = Join-Path -Path $SourceDirectoryPath -ChildPath $coreFileRelativePath
    if ($processedJsFiles.Contains($coreFileRelativePath)) { continue } # Already processed

    if (Test-Path $coreFileFullPath) {
        Write-Host "  Adding core JS to merge: $coreFileRelativePath"
        $content = Get-Utf8FileContent -FilePath $coreFileFullPath
        if ($content -ne $null) {
            $jsFilesContentList.Add($content + "`n// --- END OF FILE $coreFileRelativePath ---`n")
            $processedJsFiles.Add($coreFileRelativePath) | Out-Null
        } else { Write-Warning "  Skipping core JS file due to read error: $coreFileFullPath" }
    } else { Write-Warning "  Core JS file not found: $coreFileRelativePath (This might be critical)" }
}

$jsScriptTagRegexBase = if ($SourceAppDirectory -eq "csv_visualiser") {
    '<script\s+src="((?:js/renderers/|js/)[^"]+\.js)".*?></script>'
} else { # csv_editor
    '<script\s+src="(js/[^"]+\.js)".*?></script>'
}
$jsMatches = [regex]::Matches($originalHtmlContent, $jsScriptTagRegexBase)

if ($jsMatches.Count -eq 0 -and $jsFilesContentList.Count -eq 0) { Write-Warning "No JS to merge." }
else {
    Write-Host "Found $($jsMatches.Count) additional JS files via regex to potentially merge:"
    foreach ($match in $jsMatches) {
        $jsRelativePath = $match.Groups[1].Value
        if ($processedJsFiles.Contains($jsRelativePath)) {
            Write-Host "  Skipping already processed file (found by regex): $jsRelativePath"
            continue
        }
        $jsFileNameOnly = Split-Path -Path $jsRelativePath -Leaf
        if (($PrimaryConfigFileName -and ($jsFileNameOnly -eq $PrimaryConfigFileName)) -or `
            ($jsFileNameOnly -match "editor_config.*\.js" -and $SourceAppDirectory -eq "csv_editor") -or `
            ($jsFileNameOnly -eq "config.js" -and $SourceAppDirectory -eq "csv_visualiser" -and $PrimaryConfigFileName -eq "config.js" )) {
            Write-Host "  Skipping primary/embedded config from regex merge: $jsRelativePath"
            continue
        }

        $jsFullPath = Join-Path -Path $SourceDirectoryPath -ChildPath $jsRelativePath
        if (Test-Path $jsFullPath) {
             Write-Host "  Merging (from regex): $jsRelativePath"
             $content = Get-Utf8FileContent -FilePath $jsFullPath
             if ($content -ne $null) {
                 $jsFilesContentList.Add($content + "`n// --- END OF FILE $jsRelativePath ---`n")
                 $processedJsFiles.Add($jsRelativePath) | Out-Null
             }
             else { Write-Warning "  Skipping JS file due to read error: $jsFullPath" }
        } else { Write-Warning "  JS file not found: $jsFullPath. Skipping." }
    }
}

if ($jsFilesContentList.Count -gt 0) {
    Write-Host "Writing merged JS to $MergedScriptName (UTF-8 No BOM)..."
    try { [System.IO.File]::WriteAllText($mergedScriptPath, ($jsFilesContentList -join ""), $utf8NoBomEncoding) }
    catch { Write-Error "Failed to write merged script. Error: $($_.Exception.Message)"; exit 1 }
} else { Write-Warning "No valid JS content merged. $MergedScriptName will be empty or not created."}

Write-Host "Extracting content between <body> tags from '$MainHtmlFileName'..."
$bodyContentRegex = '(?s)<body.*?>(.*?)</body>'
$bodyMatch = [regex]::Match($originalHtmlContent, $bodyContentRegex)
if (-not $bodyMatch.Success) {
     Write-Warning "Could not extract body content."
     $rawBodyContent = "<!-- ERROR: Could not extract body content from $MainHtmlFileName -->"
} else {
     $rawBodyContent = $bodyMatch.Groups[1].Value.Trim()
     Write-Host "  Successfully extracted body content."
}

Write-Host "Cleaning extracted body content..."
$cleanedBodyContent = $rawBodyContent -replace '(?im)\s*<link\s+rel="stylesheet"\s+href="css/[^"]+\.css"[^>]*?>\s*', "`n"
$cleanedBodyContent = $cleanedBodyContent -replace ('(?im)\s*<script\s+src="(?:js/renderers/|js/)[^"]+\.js".*?</script>\s*', "`n")
$cleanedBodyContent = $cleanedBodyContent.Trim()
Write-Host "  Cleaning complete."

# 8. Construct the HTML Fragment
Write-Host "Constructing $FragmentOutputFileName..."
$fragmentCssPath = $MergedCssName
# $PrimaryConfigFileName is the NAME of the config file copied to deploy (e.g., "editor_config_example.js")
# $fragmentPrimaryConfigPath should be used if we were to *explicitly* add a script tag for it here.
# However, the goal is to preserve the <script src="editor_config_example.js"></script> tag
# that is ALREADY in the $cleanedBodyContent (assuming it was in editor.html's body).

$fragmentMergedScriptPath = $MergedScriptName

$fragmentContent = @"
<!-- Start $SourceAppDirectory Fragment -->
<!-- Set Character Encoding -->
<meta charset="UTF-8">
<link rel="stylesheet" href="$fragmentCssPath"><!-- UPDATE PATH IF NEEDED -->
$cleanedBodyContent
<script src="$fragmentMergedScriptPath"></script><!-- UPDATE PATH IF NEEDED -->
<!-- End $SourceAppDirectory Fragment -->
"@ 
# Make sure the closing "@ is on a line by itself and there are no trailing spaces or comments on that line or after it that could be misinterpreted.


$fragmentPath = Join-Path -Path $DeployDirectoryPath -ChildPath $FragmentOutputFileName
Write-Host "Writing HTML fragment to $fragmentPath (UTF-8 No BOM)..."
try {
    [System.IO.File]::WriteAllText($fragmentPath, $fragmentContent, $utf8NoBomEncoding)
    Write-Host "  Successfully created $FragmentOutputFileName"
} catch {
    Write-Error "Failed to write fragment file '$fragmentPath'. Error: $($_.Exception.Message)"; exit 1
}

Write-Host "-----------------------------------------------------" -ForegroundColor Green
Write-Host "Deployment for '$SourceAppDirectory' complete."
Write-Host "Files are in: $DeployDirectoryPath"
Write-Host "Main fragment: $FragmentOutputFileName"
Write-Host "Merged CSS: $MergedCssName"
if ($PrimaryConfigFileName) { Write-Host "Primary Config: $PrimaryConfigFileName (copied)" }
Write-Host "Merged JS: $MergedScriptName"
Write-Host "IMPORTANT: Update paths in '$FragmentOutputFileName' if assets are hosted elsewhere relative to the fragment." -ForegroundColor Yellow
Write-Host "-----------------------------------------------------" -ForegroundColor Green