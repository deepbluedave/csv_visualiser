Okay, here is a `README.md` file for your project. You can save this content as `README.md` in the root of your `spreadsheet-aggregator` folder.

```markdown
# Spreadsheet Aggregator Utility

A browser-based utility to combine data from multiple `.xlsx` spreadsheets in a folder into a single, aggregated view. It uses a master sheet to define the primary records and a configuration file (`config.json`) to map columns from various source sheets to a defined output structure.

## Features

*   **Folder-Based Processing:** Select a folder containing all your `.xlsx` source files.
*   **Master Sheet Concept:** Uses one sheet (identified by filename hint) as the definitive list of records.
*   **Configurable Mapping:** A `config.json` file defines:
    *   Which file is the master.
    *   The unique ID column in the master and each data sheet type.
    *   Which columns to include in the final output.
    *   How to map differently named columns from source sheets to the standard output columns.
*   **Source Tracking:** Automatically adds columns to the output indicating the source file and configured sheet type for each master record.
*   **Client-Side Processing:** Runs entirely in your web browser using HTML, CSS, JavaScript, and the SheetJS library. No server needed.
*   **Simple UI:** Provides status updates during processing and a download button for the result.
*   **Output Format:** Generates a new `.xlsx` file containing the aggregated data.

## Prerequisites

*   A modern web browser (Chrome, Firefox, Edge recommended) that supports folder selection (`<input type="file" webkitdirectory>`).
*   Your source `.xlsx` spreadsheet files organized in a single folder.
*   A correctly configured `config.json` file.

## Project Structure

```
spreadsheet-aggregator/
├── index.html         # The main UI page
├── style.css          # Basic styling
├── aggregator.js      # Core JavaScript logic
├── config.json        # Configuration file (YOU MUST EDIT THIS)
├── README.md          # This file
└── lib/               # Optional: Folder for local libraries
    └── xlsx.full.min.js # SheetJS library (if not using CDN)
```

## Setup

1.  **Get the Files:** Download or clone this project repository.
2.  **Get SheetJS:**
    *   **Option 1 (CDN - Recommended):** The `index.html` file is already configured to use the SheetJS CDN. Ensure you have an internet connection when using the tool.
    *   **Option 2 (Local):** Download the "Full Version" of SheetJS (`xlsx.full.min.js`) from [https://sheetjs.com/](https://sheetjs.com/). Place it inside the `lib` folder. Uncomment the local script tag and comment out the CDN tag in `index.html`:
        ```html
        <!-- Load SheetJS library -->
        <!-- Option 1: Local file -->
         <script src="lib/xlsx.full.min.js"></script>
        <!-- Option 2: CDN -->
        <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script> -->
        ```
3.  **Configure `config.json`:** This is the most crucial step. Edit `config.json` according to your specific spreadsheets and desired output (see details below).
4.  **Prepare Spreadsheets:** Place all your `.xlsx` files (including the one designated as the master) into a single folder on your computer.

## Configuration (`config.json`)

This JSON file tells the aggregator how to process your files.

```json
{
  "masterSheetIdentifier": {
    "name": "MasterData",
    "fileNameHint": "master_sheet",
    "uniqueIdColumn": "ID"
  },
  "outputColumns": [
    "ID",
    "IssueName",
    "RiskLevel",
    "SourceFile",
    "SourceSheetType"
  ],
  "sheetMappings": [
    {
      "name": "MasterData",
      "fileNameHint": "master_sheet",
      "uniqueIdColumn": "ID",
      "columnMapping": {
        "ID": "ID",
        "IssueName": "Name",
        "RiskLevel": "Severity"
      }
    },
    {
      "name": "SystemA_Issues",
      "fileNameHint": "system_a",
      "uniqueIdColumn": "UniqueID",
      "columnMapping": {
        "ID": "UniqueID",
        "IssueName": "Title",
        "RiskLevel": "Level"
      }
    },
    {
      "name": "SystemB_Findings",
      "fileNameHint": "system_b",
      "uniqueIdColumn": "Record Key",
      "columnMapping": {
        "ID": "Record Key",
        "IssueName": "Finding Description",
        "RiskLevel": "Impact Rating"
      }
    }
  ]
}
```

**Explanation:**

*   **`masterSheetIdentifier`**: Defines the primary spreadsheet.
    *   `"name"`: An internal reference name for the master configuration. This *must* match the `name` of one of the entries in `sheetMappings`.
    *   `"fileNameHint"`: A unique piece of text found in the filename of your master spreadsheet (e.g., "master", "main_list"). The script uses this hint to identify which uploaded file is the master.
    *   `"uniqueIdColumn"`: The **exact** column header name in the *master spreadsheet* that contains the unique identifier for each record.
*   **`outputColumns`**: An array of strings defining the exact column headers and their order in the final aggregated output file.
    *   The first column listed here (`"ID"` in the example) is treated as the primary key for the output.
    *   `"SourceFile"` and `"SourceSheetType"` are recommended columns automatically populated by the script to track data origin based on the master file initially.
*   **`sheetMappings`**: An array where you define how to handle *each type* of spreadsheet you will upload, **including the master sheet**.
    *   Each object in the array represents one type of sheet format.
    *   `"name"`: A unique name you give to this specific sheet type/mapping configuration (e.g., "MasterData", "SystemA_Issues", "AuditLog"). One of these *must* match the `masterSheetIdentifier.name`.
    *   `"fileNameHint"`: A piece of text found in the filenames of sheets that should use *this* specific mapping (e.g., "system_a", "audit", "_findings"). This helps the script apply the correct mapping rules to the right files. Ensure hints are specific enough to avoid conflicts.
    *   `"uniqueIdColumn"`: The **exact** column header name in *sheets of this type* that contains the unique identifier. This ID will be used to match records back to the master list.
    *   `"columnMapping"`: An object defining how columns from *this input sheet type* map to your desired `outputColumns`.
        *   **Key:** The name of the column in the final output (must be one of the strings from the `outputColumns` array).
        *   **Value:** The **exact** column header name from the *source spreadsheet* of this type.
        *   **Important:** Only columns listed as *keys* in this mapping will have their data potentially pulled from this sheet type. The script uses the *value* to find the data in the input file. If a column defined in `outputColumns` is not present as a key here, data for that output column will *not* be sourced from this sheet type.

## Usage

1.  **Open the Tool:** Open the `index.html` file in your web browser.
2.  **Upload Configuration:** Click "Upload Configuration File" and select your edited `config.json` file. Check the Status area for confirmation or errors.
3.  **Select Spreadsheet Folder:** Click "Select Spreadsheet Folder". Your browser will open a folder selection dialog. **Select the folder** containing your `.xlsx` files (do *not* go inside the folder and select individual files). Grant permission if the browser asks. The UI will update with the number of `.xlsx` files found.
4.  **Process:** Once both the config and spreadsheet files are loaded, the "Process Files" button will become active. Click it.
5.  **Monitor:** Watch the "Status" log for detailed information about the process, including which files are being processed, matching records, skipped orphan records, and any warnings or errors.
6.  **Download:** If processing completes successfully, the "Download Aggregated File" button will appear. Click it to save the generated `aggregated_output_YYYYMMDD_HHMMSS.xlsx` file.

## How It Works (Simplified)

1.  Loads and validates the `config.json`.
2.  Reads the list of files selected via the folder input.
3.  Identifies the master file using `masterSheetIdentifier.fileNameHint`.
4.  Reads the master file using SheetJS. Creates an initial data structure (JavaScript object) where keys are the unique IDs from the master file's `uniqueIdColumn`. Populates initial data based on the master file's mapping in `sheetMappings`.
5.  Iterates through the remaining `.xlsx` files.
6.  For each file, finds the corresponding mapping in `sheetMappings` using its `fileNameHint`.
7.  Reads the data sheet using SheetJS.
8.  For each row in the data sheet:
    *   Extracts the unique ID using the `uniqueIdColumn` defined in its mapping.
    *   Checks if this ID exists as a key in the aggregated data structure (meaning it was present in the master file).
    *   If it exists, it iterates through the `columnMapping` for this sheet type. For each `OutputColumn: InputColumn` pair, it takes the value from the `InputColumn` in the current row and updates the `OutputColumn` field for that unique ID in the aggregated data. (Data from later files can overwrite data from earlier files for the same ID and output column).
    *   If the ID does *not* exist in the master list (it's an "orphan"), the row is skipped, and a message is logged.
9.  After processing all files, converts the aggregated data object into an array suitable for SheetJS.
10. Ensures all columns defined in `outputColumns` are present in the final array (adding nulls if data was missing).
11. Uses SheetJS (`XLSX.utils.json_to_sheet` and `XLSX.writeFile`) to generate the final `.xlsx` file and trigger the download.

## Troubleshooting

*   **`Failed to load resource: net::ERR_FILE_NOT_FOUND` for `aggregator.js` or `style.css`:** Ensure these files are in the *same directory* as `index.html` and their names match exactly (case-sensitive).
*   **No files selected / "0 files selected":**
    *   Make sure your files have the `.xlsx` extension (not `.xls`, `.csv`, etc., unless you modify the script's filter). Check hidden extensions in your OS.
    *   Ensure you are selecting the *folder*, not the files *inside* the folder.
    *   Check browser permissions for folder access.
    *   Ensure the files are not temporary Excel files (starting with `~$`). Close them in Excel.
*   **Error Parsing Config File:** Check your `config.json` for syntax errors (missing commas, brackets, quotes). Use a JSON validator online if needed. Ensure all required keys (`masterSheetIdentifier`, `outputColumns`, `sheetMappings`) are present.
*   **Master Sheet Not Found:** Double-check that the `fileNameHint` in `masterSheetIdentifier` correctly matches a unique part of your master sheet's filename and that the file is present in the selected folder.
*   **No Mapping Found for File X:** Ensure every type of spreadsheet you upload has a corresponding entry in `sheetMappings` with a `fileNameHint` that correctly matches part of its filename.
*   **Incorrect Data / Missing Columns in Output:**
    *   Verify that the `uniqueIdColumn` names in `config.json` **exactly** match the column headers in your spreadsheets (case-sensitive!).
    *   Verify that the input column names used as *values* in the `columnMapping` sections **exactly** match the headers in the corresponding source spreadsheets.
    *   Ensure all desired output columns are listed in the `outputColumns` array.
    *   Ensure the mappings in `columnMapping` correctly link the source columns to the desired `outputColumns`.
*   **Check the Status Log:** The log provides detailed information during processing, often indicating which file or row caused an issue.
*   **Browser Console (F12):** Look for JavaScript errors in the developer console.

```