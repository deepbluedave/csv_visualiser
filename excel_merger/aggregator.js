const configInput = document.getElementById('configInput');
const folderInput = document.getElementById('folderInput');
const fileCountSpan = document.getElementById('fileCount');
const processButton = document.getElementById('processButton');
const downloadButton = document.getElementById('downloadButton');
const statusLog = document.getElementById('statusLog');

let config = null;
let uploadedFiles = null;
let aggregatedWorkbook = null; // To store the final workbook object

// --- Logging Utility ---
function logStatus(message, isError = false) {
    console.log(message);
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    if (isError) {
        logEntry.style.color = 'red';
        console.error(message);
    }
    statusLog.appendChild(logEntry);
    statusLog.scrollTop = statusLog.scrollHeight; // Auto-scroll
}

// --- Enable/Disable Process Button ---
function checkEnableProcessButton() {
    processButton.disabled = !(config && uploadedFiles && uploadedFiles.length > 0);
}

// --- Event Listeners ---
configInput.addEventListener('change', handleConfigUpload);
folderInput.addEventListener('change', handleFolderUpload);
processButton.addEventListener('click', processFiles);
downloadButton.addEventListener('click', downloadOutput);

// --- Handlers ---
function handleConfigUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        logStatus('No configuration file selected.', true);
        return;
    }
    if (!file.name.endsWith('.json')) {
        logStatus('Configuration file must be a .json file.', true);
        configInput.value = ''; // Clear selection
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            config = JSON.parse(e.target.result);
            // Basic config validation (can be expanded)
            if (!config.masterSheetIdentifier || !config.outputColumns || !config.sheetMappings) {
               throw new Error("Config file missing required keys: masterSheetIdentifier, outputColumns, sheetMappings");
            }
            if (!config.sheetMappings.find(m => m.name === config.masterSheetIdentifier.name)) {
                throw new Error(`Config validation failed: No sheetMapping found with name matching masterSheetIdentifier.name ('${config.masterSheetIdentifier.name}')`);
            }
            logStatus(`Configuration '${file.name}' loaded successfully.`);
            checkEnableProcessButton();
        } catch (error) {
            logStatus(`Error parsing config file: ${error.message}`, true);
            config = null;
            configInput.value = ''; // Clear selection
            checkEnableProcessButton();
        }
    };
    reader.onerror = () => {
        logStatus(`Error reading config file: ${reader.error}`, true);
        config = null;
        checkEnableProcessButton();
    };
    reader.readAsText(file);
}

function handleFolderUpload(event) {
    console.log('handleFolderUpload triggered.'); // 1. Does the function even run?
    console.log('Raw event.target.files:', event.target.files); // 2. What does the browser initially give us?

    const allFiles = Array.from(event.target.files);
    console.log('All selected items (converted to Array):', allFiles); // 3. What's in the array before filtering?

    // Log details for each file before filtering
    allFiles.forEach((file, index) => {
        console.log(`File ${index}: Name='${file.name}', Type='${file.type}', Lowercase Name='${file.name.toLowerCase()}', endsWith('.xlsx')=${file.name.toLowerCase().endsWith('.xlsx')}, startsWith('~$')=${file.name.startsWith('~$')}`);
    });

    // The filter logic
    uploadedFiles = allFiles.filter(file =>
        file.name.toLowerCase().endsWith('.xlsx') && !file.name.startsWith('~$')
    );
    console.log('Filtered uploadedFiles:', uploadedFiles); // 4. What files remain after filtering?

    const count = uploadedFiles.length;
    fileCountSpan.textContent = `${count} file${count !== 1 ? 's' : ''} selected`;

    if (count === 0 && event.target.files.length > 0) {
         logStatus('No .xlsx files (excluding temp files starting with ~$) found in the selected items.', true); // More specific message
    } else if (count > 0) {
        logStatus(`${count} spreadsheet file(s) ready.`);
    } else {
         logStatus('No spreadsheet files selected or detected.');
    }

    downloadButton.style.display = 'none';
    aggregatedWorkbook = null;
    checkEnableProcessButton();
}

async function processFiles() {
    if (!config || !uploadedFiles || uploadedFiles.length === 0) {
        logStatus('Configuration and spreadsheet files must be loaded first.', true);
        return;
    }

    logStatus('Starting aggregation process...');
    processButton.disabled = true;
    downloadButton.style.display = 'none';
    aggregatedWorkbook = null;
    // Clear previous logs slightly
    statusLog.innerHTML = '';
    logStatus('Processing started...');


    const aggregatedData = {}; // Store data keyed by unique ID: { uniqueId: {outputCol1: val1, outputCol2: val2, ...} }
    let masterFileProcessed = false;
    let masterMapping = null;

    // --- Find Master Sheet Mapping ---
    masterMapping = config.sheetMappings.find(m => m.name === config.masterSheetIdentifier.name);
    if (!masterMapping) {
         // This check is technically redundant due to config validation, but good practice
        logStatus(`Critical Error: Master sheet mapping ('${config.masterSheetIdentifier.name}') not found in sheetMappings.`, true);
        processButton.disabled = false; // Re-enable button on critical failure
        return;
    }
    logStatus(`Using mapping '${masterMapping.name}' for Master Sheet.`);

    // --- Process Master Sheet First ---
    const masterFile = uploadedFiles.find(f => f.name.includes(config.masterSheetIdentifier.fileNameHint));
    if (!masterFile) {
        logStatus(`Master sheet (containing '${config.masterSheetIdentifier.fileNameHint}') not found in uploaded files. Processing stopped.`, true);
        processButton.disabled = false;
        return;
    }

    logStatus(`Processing Master File: ${masterFile.name}...`);
    try {
        const masterData = await readFileData(masterFile);
        const masterUniqueIdCol = config.masterSheetIdentifier.uniqueIdColumn; // Use the specific ID from masterSheetIdentifier
        const masterOutputIdCol = config.outputColumns[0]; // Assuming the first output column is the ID

        masterData.forEach((row, index) => {
            const uniqueId = row[masterUniqueIdCol];
            if (uniqueId === undefined || uniqueId === null || String(uniqueId).trim() === '') {
                logStatus(`Warning: Row ${index + 2} in Master file '${masterFile.name}' has a missing or empty Unique ID ('${masterUniqueIdCol}'). Skipping row.`, true);
                return;
            }
             if (aggregatedData[uniqueId]) {
                logStatus(`Warning: Duplicate Unique ID '${uniqueId}' found in Master file '${masterFile.name}' (Row ${index + 2}). Prior row data may be overwritten during master processing.`, true);
                // Allow overwrite within master processing itself, but log it.
            }

            aggregatedData[uniqueId] = {}; // Initialize object for this ID

            // Map columns from master based on its mapping
            for (const [outputCol, inputCol] of Object.entries(masterMapping.columnMapping)) {
                 if (config.outputColumns.includes(outputCol)) { // Only map if it's a desired output column
                    aggregatedData[uniqueId][outputCol] = row[inputCol];
                 }
            }
            // Ensure the primary ID column is correctly populated using the master's value
             aggregatedData[uniqueId][masterOutputIdCol] = uniqueId;

            // Add source info
            aggregatedData[uniqueId]['SourceFile'] = masterFile.name;
            aggregatedData[uniqueId]['SourceSheetType'] = masterMapping.name;
        });
        masterFileProcessed = true;
        logStatus(`Master file '${masterFile.name}' processed. ${Object.keys(aggregatedData).length} unique records initialized.`);

    } catch (error) {
        logStatus(`Error processing master file ${masterFile.name}: ${error.message}`, true);
        processButton.disabled = false; // Re-enable on error
        return; // Stop processing if master fails
    }

    // --- Process Other Data Sheets ---
    for (const file of uploadedFiles) {
        if (file === masterFile) continue; // Skip the already processed master file

        const mapping = findSheetMapping(file.name, config);
        if (!mapping) {
            logStatus(`Warning: No mapping found for file '${file.name}'. Skipping file.`, true);
            continue;
        }

        logStatus(`Processing Data File: ${file.name} (using mapping '${mapping.name}')...`);
        try {
            const fileData = await readFileData(file);
            const fileUniqueIdCol = mapping.uniqueIdColumn; // ID column name for *this* sheet type
            let processedRowCount = 0;
            let skippedOrphanCount = 0;

            fileData.forEach((row, index) => {
                const uniqueId = row[fileUniqueIdCol];
                 if (uniqueId === undefined || uniqueId === null || String(uniqueId).trim() === '') {
                    logStatus(`Warning: Row ${index + 2} in '${file.name}' has missing or empty Unique ID ('${fileUniqueIdCol}'). Skipping row.`, true);
                    return;
                 }


                if (aggregatedData[uniqueId]) {
                    // Record exists from master, merge/overwrite data based on mapping
                    for (const [outputCol, inputCol] of Object.entries(mapping.columnMapping)) {
                         // Don't overwrite the primary ID column from data sheets
                        if (outputCol !== config.outputColumns[0] && config.outputColumns.includes(outputCol)) {
                             // Add/overwrite data for mapped columns *if* the value exists in the input row
                             if (row[inputCol] !== undefined) {
                                aggregatedData[uniqueId][outputCol] = row[inputCol];
                             }
                        }
                    }
                    // Optionally update source info if needed, e.g., create a list
                    // aggregatedData[uniqueId]['SourceFiles'] = (aggregatedData[uniqueId]['SourceFiles'] || [masterFile.name]).concat(file.name);
                    processedRowCount++;
                } else {
                    // ID from this sheet not found in master sheet's IDs
                    logStatus(`Info: ID '${uniqueId}' from file '${file.name}' (Row ${index + 2}) not found in master sheet records. Skipping row.`, false); // Log as info, not error
                    skippedOrphanCount++;
                }
            });
             logStatus(`File '${file.name}' processed. Merged data for ${processedRowCount} matching records. Skipped ${skippedOrphanCount} orphan records.`);

        } catch (error) {
            logStatus(`Error processing file ${file.name}: ${error.message}`, true);
            // Decide whether to continue or stop on single file error
            // continue; // Continue with next file
             logStatus(`Processing stopped due to error in file ${file.name}.`, true);
             processButton.disabled = false; // Re-enable on error
             return; // Stop processing entirely
        }
    }

    // --- Prepare Final Output ---
    logStatus("Preparing final output data...");
    const finalOutputArray = [];
    // Use the order of IDs as they appeared in the master file (or just object keys)
    const masterIds = Object.keys(aggregatedData);

    for (const id of masterIds) {
        const record = aggregatedData[id];
        const outputRow = {};
        // Ensure all defined output columns exist in each row
        for (const header of config.outputColumns) {
            // Provide a default value (e.g., null or empty string) if data wasn't found
            outputRow[header] = record[header] !== undefined ? record[header] : null;
        }
        finalOutputArray.push(outputRow);
    }

    if (finalOutputArray.length === 0) {
         logStatus("Aggregation complete, but no data rows were generated.", true);
         processButton.disabled = false;
         return;
    }

    // --- Generate Excel Workbook ---
    try {
        const ws = XLSX.utils.json_to_sheet(finalOutputArray, { header: config.outputColumns });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Aggregated_Data");
        aggregatedWorkbook = wb; // Store workbook for download

        logStatus(`Aggregation successful! ${finalOutputArray.length} records compiled.`);
        downloadButton.style.display = 'inline-block'; // Show download button
    } catch (error) {
         logStatus(`Error generating final Excel file: ${error.message}`, true);
    } finally {
        processButton.disabled = false; // Re-enable process button
    }
}


function downloadOutput() {
    if (!aggregatedWorkbook) {
        logStatus('No aggregated data available to download.', true);
        return;
    }
    logStatus('Preparing download...');
    try {
        // Generate filename (e.g., aggregated_YYYYMMDD_HHMMSS.xlsx)
        const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
        const filename = `aggregated_output_${timestamp}.xlsx`;

        XLSX.writeFile(aggregatedWorkbook, filename);
        logStatus(`Download started as '${filename}'.`);
    } catch (error) {
        logStatus(`Error triggering download: ${error.message}`, true);
    }
}

// --- Helper Functions ---

// Reads an Excel file and returns data from the first sheet as an array of objects
function readFileData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                    reject(new Error(`File '${file.name}' contains no sheets.`));
                    return;
                }
                const worksheet = workbook.Sheets[firstSheetName];
                // header: 1 tells sheet_to_json to use the first row as headers
                // defval: null ensures missing cells become null instead of undefined
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                // Convert array of arrays to array of objects
                if (jsonData.length < 1) {
                    resolve([]); // Empty sheet
                    return;
                }
                const headers = jsonData[0].map(h => String(h).trim()); // Trim header whitespace
                const dataRows = jsonData.slice(1).map(rowArray => {
                    const rowObject = {};
                    headers.forEach((header, index) => {
                         if (header) { // Only map columns with actual headers
                             rowObject[header] = rowArray[index];
                         }
                    });
                    return rowObject;
                });

                resolve(dataRows);
            } catch (error) {
                reject(new Error(`Failed to parse sheet data in '${file.name}': ${error.message}`));
            }
        };
        reader.onerror = (e) => {
            reject(new Error(`Failed to read file '${file.name}': ${reader.error}`));
        };
        reader.readAsArrayBuffer(file); // Read as ArrayBuffer for SheetJS
    });
}

// Finds the correct mapping configuration for a given filename
function findSheetMapping(fileName, configData) {
     // Prioritize matching master first if the filename hints at it
    if (fileName.includes(configData.masterSheetIdentifier.fileNameHint)) {
        const masterMap = configData.sheetMappings.find(m => m.name === configData.masterSheetIdentifier.name);
        if (masterMap) return masterMap;
    }
     // Then try other mappings based on their hints
    for (const mapping of configData.sheetMappings) {
        // Skip the master mapping check if already done or not applicable
        if (mapping.name === configData.masterSheetIdentifier.name && fileName.includes(configData.masterSheetIdentifier.fileNameHint)) {
            continue;
        }
        if (mapping.fileNameHint && fileName.includes(mapping.fileNameHint)) {
            return mapping;
        }
    }
    // Fallback: maybe add a regex match or exact filename match later if needed
    return null; // No mapping found
}