<#
.SYNOPSIS
  Creates deployment assets for embedding the CSV Dashboard Generator in a Confluence HTML Macro.
  Merges CSS and JS, updates references, removes original script/link tags, and extracts the necessary HTML fragment.
  Explicitly handles UTF-8 encoding WITHOUT BOM for all file operations.

.DESCRIPTION
  This script prepares the project for Confluence embedding by:
  1. Defining UTF-8 encoding without BOM.
  2. Creating/cleaning the 'deploy' subfolder.
  3. Copying config.js using binary copy (avoids encoding issues).
  4. Reading the original index.html explicitly as UTF-8.
  5. Merging linked CSS files (read as UTF-8) into 'deploy/style.css' (written as UTF-8 without BOM).
  6. Merging linked JS files (read as UTF-8, excluding config.js) into 'deploy/script.js' (written as UTF-8 without BOM).
  7. Extracting body content from index.html.
  8. Removing original <link> and <script> tags from the extracted body content.
  9. Creating 'deploy/dashboard_fragment.html' (written as UTF-8 without BOM) containing the cleaned fragment structure.

.NOTES
  Run from the project root. Assumes source files are UTF-8 (ideally without BOM).
  Uses .NET methods for precise UTF-8 without BOM writing. Requires PS 5.1+.
  Update paths in 'dashboard_fragment.html' based on Confluence hosting before use.
#>

# --- Configuration ---
$SourceDirectory = $PSScriptRoot
$DeployDirectoryName = "deploy"
$DeployDirectoryPath = Join-Path -Path $SourceDirectory -ChildPath $DeployDirectoryName
$MergedScriptName = "script.js"
$MergedCssName = "style.css"
$FragmentFileName = "dashboard_fragment.html"
$ConfigFileName = "config.js"

# --- Script Body ---
Write-Host "Starting Confluence fragment deployment process (UTF-8 No BOM Enforcement)..." -ForegroundColor Cyan

# 1. Define the UTF-8 Encoding *without* BOM (Crucial!)
$utf8NoBomEncoding = New-Object System.Text.UTF8Encoding($false)

# 2. Create/Clean Deploy Directory
# (No changes needed here)
if (Test-Path -Path $DeployDirectoryPath) {
    Write-Host "Removing existing deploy directory..." -ForegroundColor Yellow
    try { Remove-Item -Path $DeployDirectoryPath -Recurse -Force -ErrorAction Stop }
    catch { Write-Error "Failed to remove existing deploy directory. Error: $($_.Exception.Message)"; exit 1 }
}
Write-Host "Creating deploy directory: $DeployDirectoryPath"
New-Item -Path $DeployDirectoryPath -ItemType Directory -ErrorAction Stop | Out-Null

# 3. Copy Config using Binary Copy (Safest for encoding)
Write-Host "Copying $ConfigFileName..."
$sourceConfigFile = Join-Path -Path $SourceDirectory -ChildPath $ConfigFileName
$destConfigFile = Join-Path -Path $DeployDirectoryPath -ChildPath $ConfigFileName
if (Test-Path $sourceConfigFile) {
    # Use Copy-Item without -Encoding; it performs a binary copy preserving original encoding (or lack thereof)
    try {
        Copy-Item -Path $sourceConfigFile -Destination $destConfigFile -Force -ErrorAction Stop
        Write-Host "  Copied $ConfigFileName."
    } catch {
        Write-Error "Failed to copy $ConfigFileName. Error: $($_.Exception.Message)"; exit 1
    }
} else { Write-Warning "Source file not found: $sourceConfigFile. Skipping." }


# 4. Read Original index.html (Explicit UTF-8 Read)
$originalIndexPath = Join-Path -Path $SourceDirectory -ChildPath "index.html"
if (-not (Test-Path $originalIndexPath)) { Write-Error "Original index.html not found."; exit 1 }
Write-Host "Reading original index.html as UTF-8..."
try {
    # Use .NET method for potentially more reliable UTF-8 reading if Get-Content causes issues
    $originalIndexContent = [System.IO.File]::ReadAllText($originalIndexPath, [System.Text.Encoding]::UTF8)
    # Fallback to Get-Content if needed, though ReadAllText is often robust
    # $originalIndexContent = Get-Content -Path $originalIndexPath -Raw -Encoding UTF8 -ErrorAction Stop
} catch {
    Write-Error "Failed to read original index.html. Error: $($_.Exception.Message)"; exit 1
}

# --- Helper Function to Read Files Explicitly as UTF-8 ---
# Reduces repetition and ensures consistency
function Get-Utf8FileContent {
    param(
        [Parameter(Mandatory=$true)]
        [string]$FilePath
    )
    try {
        # Use .NET method for reading
        return [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
    } catch {
        Write-Warning "  Failed to read '$FilePath' as UTF-8. Error: $($_.Exception.Message)"
        return $null # Return null on failure
    }
}

# 5. Merge CSS Files (Read UTF-8, Write UTF-8 No BOM)
Write-Host "Merging CSS files..." -ForegroundColor Cyan
$mergedCssPath = Join-Path -Path $DeployDirectoryPath -ChildPath $MergedCssName
$cssFilesContent = [System.Collections.Generic.List[string]]::new()
$cssLinkRegex = '<link\s+rel="stylesheet"\s+href="(css/[^"]+\.css)".*?>'
$cssMatches = [regex]::Matches($originalIndexContent, $cssLinkRegex)
if ($cssMatches.Count -eq 0) { Write-Warning "No CSS links found." }
else {
    Write-Host "Found $($cssMatches.Count) CSS files to merge:"
    foreach ($match in $cssMatches) {
        $cssFullPath = Join-Path -Path $SourceDirectory -ChildPath $match.Groups[1].Value
        if (Test-Path $cssFullPath) {
            Write-Host "  Merging: $($match.Groups[1].Value)"
            $content = Get-Utf8FileContent -FilePath $cssFullPath
            if ($content -ne $null) {
                 $cssFilesContent.Add($content + "`n")
            } else { Write-Warning "  Skipping file due to read error: $cssFullPath" }
        } else { Write-Warning "  CSS file not found: $cssFullPath. Skipping." }
    }
    if ($cssFilesContent.Count -gt 0) {
        Write-Host "Writing merged CSS to $MergedCssName (UTF-8 No BOM)..."
        try { [System.IO.File]::WriteAllText($mergedCssPath, ($cssFilesContent -join ""), $utf8NoBomEncoding) }
        catch { Write-Error "Failed to write merged CSS file. Error: $($_.Exception.Message)"; exit 1 }
    } else { Write-Warning "No valid CSS content merged. $MergedCssName will be empty or not created."}
}

# 6. Merge JS Files (Read UTF-8, Write UTF-8 No BOM)
Write-Host "Merging JavaScript files (excluding $ConfigFileName)..." -ForegroundColor Cyan
$mergedScriptPath = Join-Path -Path $DeployDirectoryPath -ChildPath $MergedScriptName
$jsFilesContent = [System.Collections.Generic.List[string]]::new()
$scriptTagRegex = '<script\s+src="(js/(?!' + [regex]::Escape($ConfigFileName) + ')[^"]+\.js)".*?></script>'
$jsMatches = [regex]::Matches($originalIndexContent, $scriptTagRegex)
if ($jsMatches.Count -eq 0) { Write-Warning "No JS scripts (excluding $ConfigFileName) found." }
else {
    Write-Host "Found $($jsMatches.Count) JS files to merge:"
    foreach ($match in $jsMatches) {
        $jsFullPath = Join-Path -Path $SourceDirectory -ChildPath $match.Groups[1].Value
        if (Test-Path $jsFullPath) {
             Write-Host "  Merging: $($match.Groups[1].Value)"
             $content = Get-Utf8FileContent -FilePath $jsFullPath
             if ($content -ne $null) {
                  $jsFilesContent.Add($content + "`n")
             } else { Write-Warning "  Skipping file due to read error: $jsFullPath" }
        } else { Write-Warning "  JS file not found: $jsFullPath. Skipping." }
    }
     if ($jsFilesContent.Count -gt 0) {
        Write-Host "Writing merged JS to $MergedScriptName (UTF-8 No BOM)..."
        try { [System.IO.File]::WriteAllText($mergedScriptPath, ($jsFilesContent -join ""), $utf8NoBomEncoding) }
        catch { Write-Error "Failed to write merged script file. Error: $($_.Exception.Message)"; exit 1 }
    } else { Write-Warning "No valid JS content merged. $MergedScriptName will be empty or not created."}
}

# 7. Extract Body Content
Write-Host "Extracting content between <body> tags..."
$bodyContentRegex = '(?s)<body.*?>(.*?)</body>'
$bodyMatch = [regex]::Match($originalIndexContent, $bodyContentRegex)
if (-not $bodyMatch.Success) {
     Write-Warning "Could not extract content between <body> tags."
     $rawBodyContent = "<!-- ERROR: Could not extract body content -->"
} else {
     $rawBodyContent = $bodyMatch.Groups[1].Value.Trim()
     Write-Host "  Successfully extracted body content."
}

# 8. Clean Extracted Body Content
Write-Host "Cleaning extracted body content (removing original script/link tags)..."
$cleanedBodyContent = $rawBodyContent -replace '(?i)\s*<link\s+rel="stylesheet"\s+href="css/[^"]+\.css".*?>\s*', "`n"
$cleanedBodyContent = $cleanedBodyContent -replace ('(?i)\s*<script\s+src="js/[^"]+\.js".*?</script>\s*', "`n")
$cleanedBodyContent = $cleanedBodyContent -replace ('(?i)\s*<script\s+src="' + [regex]::Escape($ConfigFileName) + '".*?</script>\s*', "`n")
$cleanedBodyContent = $cleanedBodyContent.Trim()
Write-Host "  Cleaning complete."

# 9. Construct the HTML Fragment
Write-Host "Constructing $FragmentFileName..." -ForegroundColor Cyan
# --- IMPORTANT: Update these paths based on Confluence hosting ---
$confluenceCssPath = $MergedCssName      # e.g., "./style.css"
$confluenceConfigPath = $ConfigFileName  # e.g., "./config.js"
$confluenceScriptPath = $MergedScriptName # e.g., "./script.js"
# --- End Update Paths ---

$fragmentContent = @"
<!-- Start CSV Dashboard Fragment -->
<!-- Set Character Encoding -->
<meta charset="UTF-8">
<link rel="stylesheet" href="$confluenceCssPath"><!-- UPDATE PATH -->
$cleanedBodyContent
<script src="$confluenceConfigPath"></script><!-- UPDATE PATH -->
<script src="$confluenceScriptPath"></script><!-- UPDATE PATH -->
<!-- End CSV Dashboard Fragment -->
"@

# 10. Save the Fragment File (Write UTF-8 No BOM)
$fragmentPath = Join-Path -Path $DeployDirectoryPath -ChildPath $FragmentFileName
Write-Host "Writing HTML fragment to $FragmentFileName (UTF-8 No BOM)..."
try {
    [System.IO.File]::WriteAllText($fragmentPath, $fragmentContent, $utf8NoBomEncoding)
    Write-Host "  Successfully created $FragmentFileName"
} catch {
    Write-Error "Failed to write fragment file '$fragmentPath'. Error: $($_.Exception.Message)"
    exit 1
}

# --- Final Output ---
# (No changes needed here)
Write-Host "-----------------------------------------------------" -ForegroundColor Green
# ... rest of final messages ...