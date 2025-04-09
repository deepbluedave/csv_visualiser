<#
.SYNOPSIS
  Creates a deployment package for the CSV Dashboard Generator.
  Copies essential files, merges all JS files into script.js, merges all CSS files into style.css,
  and updates index.html to reference the merged files. Ensures UTF-8 without BOM encoding for generated files.

.DESCRIPTION
  This script prepares the project for deployment by:
  1. Creating a 'deploy' subfolder (or removing the existing one).
  2. Copying config.js to the 'deploy' folder. (index.html is copied initially but then modified).
  3. Reading the original index.html to determine the correct load order for CSS and JS files (assuming UTF-8).
  4. Finding all .css files linked within the 'css/' directory in index.html.
  5. Concatenating the content of these .css files into a single 'deploy/style.css' (UTF-8 without BOM).
  6. Finding all .js files linked within the 'js/' directory in index.html.
  7. Concatenating the content of these .js files into a single 'deploy/script.js' (UTF-8 without BOM).
  8. Modifying 'deploy/index.html' (read as UTF-8) to:
     - Remove individual <link rel="stylesheet"> tags for files under 'css/' and replace them with a single tag for 'style.css'.
     - Remove individual <script> tags for files under 'js/' and replace them with a single tag for 'script.js'.
  9. Saving the modified index.html as UTF-8 without BOM.

.NOTES
  Run this script from the root directory of the project (where index.html resides).
  Ensure source files (JS, CSS, HTML) are saved as UTF-8 for best results.
  Uses .NET methods for file writing to ensure UTF-8 without BOM, compatible with PS 5.1+.
#>

# --- Configuration ---
$SourceDirectory = $PSScriptRoot # Assumes script is in the project root
$DeployDirectoryName = "deploy"
$DeployDirectoryPath = Join-Path -Path $SourceDirectory -ChildPath $DeployDirectoryName
$MergedScriptName = "script.js"
$MergedCssName = "style.css"

# --- Script Body ---
Write-Host "Starting deployment process..." -ForegroundColor Cyan

# Define the UTF-8 Encoding *without* BOM
$utf8NoBomEncoding = New-Object System.Text.UTF8Encoding($false)

# 1. Create/Clean Deploy Directory
if (Test-Path -Path $DeployDirectoryPath) {
    Write-Host "Removing existing deploy directory: $DeployDirectoryPath" -ForegroundColor Yellow
    try {
        Remove-Item -Path $DeployDirectoryPath -Recurse -Force -ErrorAction Stop
    } catch {
        Write-Error "Failed to remove existing deploy directory. Please check permissions or close any open files/handles. Error: $($_.Exception.Message)"
        exit 1
    }
}

Write-Host "Creating deploy directory: $DeployDirectoryPath"
New-Item -Path $DeployDirectoryPath -ItemType Directory -ErrorAction Stop | Out-Null

# 2. Copy Config and Initial Index.html
# style.css is NOT copied, it will be generated. index.html is copied then modified.
$FilesToCopy = @(
    "index.html",
    "config.js"
)

Write-Host "Copying essential files..."
foreach ($file in $FilesToCopy) {
    $sourceFile = Join-Path -Path $SourceDirectory -ChildPath $file
    $destFile = Join-Path -Path $DeployDirectoryPath -ChildPath $file
    if (Test-Path $sourceFile) {
        Write-Host "  Copying $file..."
        Copy-Item -Path $sourceFile -Destination $destFile -ErrorAction Stop
    } else {
        Write-Warning "  Source file not found: $sourceFile. Skipping."
    }
}

# 3. Read Original index.html to Get File Order
$originalIndexPath = Join-Path -Path $SourceDirectory -ChildPath "index.html"
if (-not (Test-Path $originalIndexPath)) {
    Write-Error "Original index.html not found at $originalIndexPath. Cannot determine CSS/JS order."
    exit 1
}

Write-Host "Reading original index.html as UTF-8 to determine file order..."
try {
    $originalIndexContent = Get-Content -Path $originalIndexPath -Raw -Encoding UTF8 -ErrorAction Stop
} catch {
    Write-Error "Failed to read original index.html '$originalIndexPath' as UTF8. Error: $($_.Exception.Message)"
    exit 1
}

# 4. & 5. Identify CSS Files in Order and Merge Them
Write-Host "Merging CSS files..." -ForegroundColor Cyan
$mergedCssPath = Join-Path -Path $DeployDirectoryPath -ChildPath $MergedCssName
$cssFilesContent = [System.Collections.Generic.List[string]]::new()

# Regex to find link tags loading from the 'css/' directory
$cssLinkRegex = '<link\s+rel="stylesheet"\s+href="(css/[^"]+\.css)".*?>'
$cssMatches = [regex]::Matches($originalIndexContent, $cssLinkRegex)

if ($cssMatches.Count -eq 0) {
    Write-Warning "No stylesheet links loading from 'css/' found in original index.html. Merged CSS file will be empty."
} else {
    Write-Host "Found $($cssMatches.Count) CSS files to merge in order:"
    foreach ($match in $cssMatches) {
        $cssRelativePath = $match.Groups[1].Value
        $cssFullPath = Join-Path -Path $SourceDirectory -ChildPath $cssRelativePath
        if (Test-Path $cssFullPath) {
            Write-Host "  Merging: $cssRelativePath (reading as UTF-8)"
            try {
                 $cssFileContent = Get-Content -Path $cssFullPath -Raw -Encoding UTF8 -ErrorAction Stop
                 # Add content + a newline for separation in the merged file
                 $cssFilesContent.Add($cssFileContent + "`n")
            } catch {
                 Write-Warning "  Failed to read CSS file '$cssFullPath' as UTF8. Skipping. Error: $($_.Exception.Message)"
            }
        } else {
            Write-Warning "  CSS file not found: $cssFullPath (referenced in index.html). Skipping."
        }
    }

    # Write the merged content using .NET to ensure UTF-8 *without* BOM
    Write-Host "Writing merged content to $MergedCssName (UTF-8 without BOM)"
    try {
        [System.IO.File]::WriteAllText($mergedCssPath, ($cssFilesContent -join ""), $utf8NoBomEncoding)
    } catch {
        Write-Error "Failed to write merged CSS file '$mergedCssPath'. Error: $($_.Exception.Message)"
        exit 1
    }
}

# 6. & 7. Identify JS Files in Order and Merge Them
Write-Host "Merging JavaScript files..." -ForegroundColor Cyan
$mergedScriptPath = Join-Path -Path $DeployDirectoryPath -ChildPath $MergedScriptName
$jsFilesContent = [System.Collections.Generic.List[string]]::new()

# Regex to find script tags loading from the 'js/' directory
$scriptTagRegex = '<script\s+src="(js/[^"]+\.js)".*?></script>'
$jsMatches = [regex]::Matches($originalIndexContent, $scriptTagRegex)

if ($jsMatches.Count -eq 0) {
    Write-Warning "No script tags loading from 'js/' found in original index.html. Merged script file will be empty."
} else {
    Write-Host "Found $($jsMatches.Count) JS files to merge in order:"
    foreach ($match in $jsMatches) {
        $jsRelativePath = $match.Groups[1].Value
        $jsFullPath = Join-Path -Path $SourceDirectory -ChildPath $jsRelativePath
        if (Test-Path $jsFullPath) {
            Write-Host "  Merging: $jsRelativePath (reading as UTF-8)"
            try {
                 $jsFileContent = Get-Content -Path $jsFullPath -Raw -Encoding UTF8 -ErrorAction Stop
                 # Add content + a newline for separation
                 $jsFilesContent.Add($jsFileContent + "`n")
            } catch {
                 Write-Warning "  Failed to read JS file '$jsFullPath' as UTF8. Skipping. Error: $($_.Exception.Message)"
            }
        } else {
            Write-Warning "  JS file not found: $jsFullPath (referenced in index.html). Skipping."
        }
    }

    # Write the merged content using .NET to ensure UTF-8 *without* BOM
    Write-Host "Writing merged content to $MergedScriptName (UTF-8 without BOM)"
    try {
        [System.IO.File]::WriteAllText($mergedScriptPath, ($jsFilesContent -join ""), $utf8NoBomEncoding)
    } catch {
        Write-Error "Failed to write merged script file '$mergedScriptPath'. Error: $($_.Exception.Message)"
        exit 1
    }
}

# 8. & 9. Modify Deployed index.html for CSS and JS
Write-Host "Updating CSS and JS references in deployed index.html..." -ForegroundColor Cyan
$deployedIndexPath = Join-Path -Path $DeployDirectoryPath -ChildPath "index.html"

# Read deployed index content - Assume UTF8 based on copy, but explicitly read
Write-Host "Reading deployed index.html as UTF-8..."
try {
    $deployedIndexContent = Get-Content -Path $deployedIndexPath -Raw -Encoding UTF8 -ErrorAction Stop
} catch {
    Write-Error "Failed to read deployed index.html at '$deployedIndexPath' as UTF8. Error: $($_.Exception.Message)"
    exit 1
}

# --- Modify CSS Links ---
$replacementCssLink = '<link rel="stylesheet" href="{0}">' -f $MergedCssName
# Regex to find the entire block of link tags loading from 'css/'
# Assumes the block starts with base.css and ends with view-table.css as per your structure
# Adjust the start/end hrefs if your index.html structure changes significantly
$regexToReplaceCssBlock = '(?s)(<link\s+rel="stylesheet"\s+href="css/base\.css".*?>\s*).*?(<link\s+rel="stylesheet"\s+href="css/view-table\.css".*?>)'

$modifiedIndexContent = $deployedIndexContent # Start with the original deployed content

Write-Host "Attempting to replace CSS link block..."
if ($modifiedIndexContent -match $regexToReplaceCssBlock) {
    $modifiedIndexContent = $modifiedIndexContent -replace $regexToReplaceCssBlock, $replacementCssLink
    Write-Host "  CSS link block found and replaced with single link to $MergedCssName."
} else {
    Write-Warning "  Could not find the expected block of 'css/' link tags in deployed index.html."
    Write-Warning "  Expected block starts around '<link...href=`"css/base.css`"...' and ends with '<link...href=`"css/view-table.css`"...'."
    # Fallback: Try inserting before </head>
    if ($modifiedIndexContent -match '</head>') {
         Write-Host "  Attempting fallback: Inserting merged CSS link tag before </head>..."
         $modifiedIndexContent = $modifiedIndexContent -replace '</head>', ("`t" + $replacementCssLink + "`n</head>") # Add indentation
         Write-Host "  Inserted CSS link tag before </head>. Please verify deploy/index.html."
    } else {
        Write-Warning "  Could not find </head> tag either. CSS link modification failed. Manual adjustment needed."
    }
}

# --- Modify JS Scripts ---
$replacementScriptTag = '<script src="{0}"></script>' -f $MergedScriptName
# Regex to find the entire block of script tags loading from 'js/'
# Assumes the block starts with renderer-shared.js and ends with app.js as per your structure
# Adjust the start/end src if your index.html structure changes significantly
$regexToReplaceJsBlock = '(?s)(<script\s+src="js/renderers/renderer-shared\.js".*?</script>\s*).*?(<script\s+src="js/app\.js".*?</script>)'

Write-Host "Attempting to replace JS script block..."
if ($modifiedIndexContent -match $regexToReplaceJsBlock) {
    # Replace the entire matched block with the single new script tag
    $modifiedIndexContent = $modifiedIndexContent -replace $regexToReplaceJsBlock, $replacementScriptTag
    Write-Host "  JS script block found and replaced with single script tag for $MergedScriptName."
} else {
    Write-Warning "  Could not find the expected block of 'js/' script tags in deployed index.html."
    Write-Warning "  Expected block starts around '<script src=`"js/renderers/renderer-shared.js`"...' and ends with '<script src=`"js/app.js`"...'."
    # Fallback: Try inserting before </body>
    if ($modifiedIndexContent -match '</body>') {
         Write-Host "  Attempting fallback: Inserting merged script tag before </body>..."
         $modifiedIndexContent = $modifiedIndexContent -replace '</body>', ("`t" + $replacementScriptTag + "`n</body>") # Add indentation
         Write-Host "  Inserted script tag before </body>. Please verify deploy/index.html."
    } else {
         Write-Warning "  Could not find </body> tag either. JS script modification failed. Manual adjustment needed."
    }
}

# --- Write Final Modified index.html ---
Write-Host "Saving final updated $deployedIndexPath (UTF-8 without BOM)"
try {
    [System.IO.File]::WriteAllText($deployedIndexPath, $modifiedIndexContent, $utf8NoBomEncoding)
    Write-Host "  Successfully updated $deployedIndexPath"
} catch {
    Write-Error "Failed to write final modified index.html '$deployedIndexPath'. Error: $($_.Exception.Message)"
    exit 1
}

Write-Host "Deployment process finished successfully." -ForegroundColor Green
Write-Host "Deploy package created in: $DeployDirectoryPath"