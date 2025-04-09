# Define a function to recursively display the file structure.
function Show-FileStructure {
    [CmdletBinding()]
    param (
        # The current folder to process.
        [Parameter(Mandatory=$true)]
        [string]$Path,
        # The prefix used for the output. For subdirectories the prefix accumulates.
        [string]$Prefix = ""
    )
    
    # Get all items in the current directory.
    # Sorting ensures a consistent order: folders and then files.
    $items = Get-ChildItem -Path $Path -Force | Sort-Object { -not $_.PSIsContainer }, Name

    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            # For directories, if we're in the root (empty prefix) then display with a leading slash.
            # Otherwise, append the directory name with a slash to the current prefix.
            if ($Prefix -eq "") {
                $displayPath = "/$($item.Name)"
            }
            else {
                $displayPath = "$Prefix/$($item.Name)"
            }
            
            Write-Output $displayPath
            
            # Recursively call the function for child items, using the updated prefix.
            Show-FileStructure -Path $item.FullName -Prefix $displayPath
        }
        else {
            # For files, output the relative path.
            if ($Prefix -eq "") {
                $displayPath = "$($item.Name)"
            }
            else {
                $displayPath = "$Prefix/$($item.Name)"
            }
            
            Write-Output $displayPath
        }
    }
}

# Set the root folder (change this to your target directory)
$rootPath = "."

# Call the function to display the file structure.
Show-FileStructure -Path $rootPath
