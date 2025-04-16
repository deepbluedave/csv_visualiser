/**
 * config_builder.js
 * Logic for the Spreadsheet Aggregator Configuration Builder page.
 */

// --- DOM Elements ---
const masterSampleInput = document.getElementById('masterSampleInput');
const masterFileInfo = document.getElementById('masterFileInfo');
const dataSheetSamplesContainer = document.getElementById('dataSheetSamplesContainer');
const addDataTypeButton = document.getElementById('addDataTypeButton');
const outputColumnsText = document.getElementById('outputColumnsText');
const updateMappingUIButton = document.getElementById('updateMappingUIButton');
const masterConfigSection = document.getElementById('masterConfigSection');
const masterFileNameHint = document.getElementById('masterFileNameHint');
const masterAppIdColumn = document.getElementById('masterAppIdColumn');
const masterLookupColumns = document.getElementById('masterLookupColumns');
const dataSheetMappingSection = document.getElementById('dataSheetMappingSection');
const dataSheetMappingPlaceholder = document.getElementById('dataSheetMappingPlaceholder');
const dataSheetMappingsContainer = document.getElementById('dataSheetMappingsContainer');
const maxUniqueValuesInput = document.getElementById('maxUniqueValues');
const generateConfigButton = document.getElementById('generateConfigButton');
const statusLog = document.getElementById('statusLog');

// --- State Variables ---
let masterHeaders = [];
let dataSheetSamples = {}; // Structure: { 'typeName': { file: File, headers: [], hint: '', appIdCol: '' }, ... }
let outputColumns = [];

// --- Utility ---
function logBuilderStatus(message, isError = false) {
    console.log(message);
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    if (isError) {
        logEntry.style.color = 'red';
        console.error(message);
    }
    statusLog.appendChild(logEntry);
    statusLog.scrollTop = statusLog.scrollHeight;
}

// --- Core Logic ---

/**
 * Reads only the header row from an uploaded XLSX file.
 * @param {File} file - The file object.
 * @returns {Promise<string[]>} - A promise resolving to an array of header strings.
 */
function readHeaders(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided."));
            return;
        }
        logBuilderStatus(`Reading headers from: ${file.name}...`);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'array', sheetRows: 1 }); // Read only 1 row
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                    throw new Error(`File '${file.name}' contains no sheets.`);
                }
                const worksheet = workbook.Sheets[firstSheetName];
                // Use header: 1 to get array of arrays, take the first row
                const headerData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                if (!headerData || headerData.length < 1 || !headerData[0] || headerData[0].length < 1) {
                     throw new Error(`Could not read header row from '${file.name}'. Is it empty?`);
                }
                // Process headers: trim, filter out null/empty
                const headers = headerData[0]
                    .map(h => (h ? String(h).trim() : null))
                    .filter(h => h !== null && h !== '');

                if (headers.length === 0) {
                    throw new Error(`No valid header values found in the first row of '${file.name}'.`);
                }

                logBuilderStatus(`Successfully read ${headers.length} headers from ${file.name}.`);
                resolve(headers);
            } catch (error) {
                logBuilderStatus(`Error reading headers from ${file.name}: ${error.message}`, true);
                reject(error);
            }
        };
        reader.onerror = (e) => {
             logBuilderStatus(`File read error for ${file.name}: ${reader.error}`, true);
             reject(new Error(`Failed to read file '${file.name}'.`));
        };
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Updates the UI related to the Master configuration section.
 */
function updateMasterConfigUI() {
    if (masterHeaders.length > 0) {
        masterConfigSection.style.display = 'block';
        // Populate App ID dropdown
        masterAppIdColumn.innerHTML = '<option value="">-- Select Master App ID Column --</option>'; // Reset
        masterHeaders.forEach(header => {
            const option = new Option(header, header);
            masterAppIdColumn.appendChild(option);
        });
        // Populate Lookup Columns checkboxes
        masterLookupColumns.innerHTML = ''; // Reset
        masterHeaders.forEach(header => {
            // Don't offer App ID as a lookup column usually
            // if (header === masterAppIdColumn.value) return; // Re-enable if needed

            const div = document.createElement('div');
            const inputId = `lookup-${header.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = inputId;
            checkbox.value = header;
            checkbox.name = 'lookupColumns';
            const label = document.createElement('label');
            label.htmlFor = inputId;
            label.appendChild(checkbox); // Checkbox first
            label.appendChild(document.createTextNode(` ${header}`)); // Then text
            div.appendChild(label);
            masterLookupColumns.appendChild(div);
        });
    } else {
        masterConfigSection.style.display = 'none';
    }
    checkGenerateButtonState(); // Check if config can be generated
}

/**
 * Handles the Master Sample file selection.
 */
async function handleMasterUpload(event) {
    const file = event.target.files[0];
    masterHeaders = []; // Reset
    masterFileInfo.textContent = '';
    masterConfigSection.style.display = 'none'; // Hide until headers are ready

    if (file) {
        masterFileInfo.textContent = `Selected: ${file.name}`;
        try {
            masterHeaders = await readHeaders(file);
            updateMasterConfigUI();
        } catch (error) {
            masterFileInfo.textContent = `Error reading master sample: ${error.message}`;
        }
    }
    checkGenerateButtonState();
}

/**
 * Adds a new section for uploading a data sheet sample type.
 */
function addDataTypeSection() {
    const typeIndex = Object.keys(dataSheetSamples).length; // Simple index for unique IDs
    const typeIdBase = `dataType${typeIndex}`;

    const div = document.createElement('div');
    div.className = 'data-sheet-type';
    div.id = `${typeIdBase}-section`;

    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = `${typeIdBase}-name`;
    nameLabel.textContent = `Data Sheet Type Name (e.g., WebVulns, InfraScan):`;
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = `${typeIdBase}-name`;
    nameInput.placeholder = 'Short, unique name';
    // Add listener to update state and potentially IDs if name changes later
    nameInput.addEventListener('change', (e) => {
        const oldTypeName = div.dataset.typeName;
        const newTypeName = e.target.value.trim().replace(/\s+/g, '_'); // Basic sanitization

        if (newTypeName && newTypeName !== oldTypeName) {
             if(dataSheetSamples[newTypeName]) {
                 logBuilderStatus(`Error: Type name "${newTypeName}" already exists. Choose a unique name.`, true);
                 e.target.value = oldTypeName || ''; // Revert
                 return;
             }
            // Update state key if exists
            if (oldTypeName && dataSheetSamples[oldTypeName]) {
                dataSheetSamples[newTypeName] = dataSheetSamples[oldTypeName];
                delete dataSheetSamples[oldTypeName];
            } else if (!dataSheetSamples[newTypeName]) {
                dataSheetSamples[newTypeName] = { file: null, headers: [], hint: '', appIdCol: '' };
            }
             div.dataset.typeName = newTypeName; // Update the type name stored on the div
             logBuilderStatus(`Renamed data sheet type to "${newTypeName}". Mapping UI will update.`, false);
            // Regenerate mapping UI needed if name changes affect element IDs
            regenerateMappingUI();
        } else if (!newTypeName && oldTypeName) {
            // Handle removing the type if name is cleared? Or just ignore?
            delete dataSheetSamples[oldTypeName];
             div.dataset.typeName = '';
             logBuilderStatus(`Cleared type name. Removed associated data.`, false);
             regenerateMappingUI();
        } else if (!newTypeName) {
            e.target.value = ''; // Ensure empty if invalid
             div.dataset.typeName = '';
        }
    });


    const fileLabel = document.createElement('label');
    fileLabel.htmlFor = `${typeIdBase}-file`;
    fileLabel.textContent = `Sample File for this Type:`;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = `${typeIdBase}-file`;
    fileInput.accept = '.xlsx';
    fileInput.addEventListener('change', (e) => handleDataSheetUpload(e, div)); // Pass the whole div for context

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.id = `${typeIdBase}-fileInfo`;

    div.appendChild(nameLabel);
    div.appendChild(nameInput);
    div.appendChild(fileLabel);
    div.appendChild(fileInput);
    div.appendChild(fileInfo);

    dataSheetSamplesContainer.appendChild(div);
}

/**
 * Handles Data Sheet Sample file selection for a specific type.
 */
async function handleDataSheetUpload(event, typeDivElement) {
    const file = event.target.files[0];
    const typeName = typeDivElement.dataset.typeName;
    const fileInfo = typeDivElement.querySelector('.file-info');
    fileInfo.textContent = '';

     if (!typeName) {
        logBuilderStatus("Please enter a Type Name before uploading the file.", true);
        event.target.value = ''; // Clear file input
        return;
     }

    // Reset headers for this type
    if (dataSheetSamples[typeName]) {
        dataSheetSamples[typeName].headers = [];
        dataSheetSamples[typeName].file = null;
    } else {
         dataSheetSamples[typeName] = { file: null, headers: [], hint: '', appIdCol: '' };
    }


    if (file) {
        fileInfo.textContent = `Selected: ${file.name}`;
        dataSheetSamples[typeName].file = file;
        try {
            dataSheetSamples[typeName].headers = await readHeaders(file);
            // Need to regenerate mapping UI as headers are now available
            regenerateMappingUI();
        } catch (error) {
            fileInfo.textContent = `Error reading sample: ${error.message}`;
            dataSheetSamples[typeName].headers = []; // Clear headers on error
            dataSheetSamples[typeName].file = null;
            regenerateMappingUI(); // Regenerate to potentially remove options
        }
    } else {
         // File cleared
         dataSheetSamples[typeName].file = null;
         dataSheetSamples[typeName].headers = [];
         regenerateMappingUI();
    }
    checkGenerateButtonState();
}

/**
 * Parses the output columns text area.
 */
function updateOutputColumns() {
    outputColumns = outputColumnsText.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== ''); // Remove empty lines
    logBuilderStatus(`Updated output columns list (${outputColumns.length} columns). Updating mapping UI...`, false);
    regenerateMappingUI(); // Regenerate mapping UI whenever output columns change
}

/**
 * Generates the dynamic mapping configuration section.
 */
function regenerateMappingUI() {
    dataSheetMappingsContainer.innerHTML = ''; // Clear existing
    let canMap = outputColumns.length > 0 && Object.keys(dataSheetSamples).some(key => dataSheetSamples[key].headers.length > 0);

    if (!canMap) {
        dataSheetMappingPlaceholder.style.display = 'block';
        checkGenerateButtonState();
        return;
    }

    dataSheetMappingPlaceholder.style.display = 'none';

    // Sort data sheet types alphabetically for consistent order
    const sortedTypeNames = Object.keys(dataSheetSamples).sort();

    sortedTypeNames.forEach(typeName => {
        const sample = dataSheetSamples[typeName];
        if (!sample || !sample.headers || sample.headers.length === 0) return; // Skip if no headers read for this type

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'data-sheet-mapping-type';
        const title = document.createElement('h3');
        title.textContent = `Mapping for: ${typeName}`;
        sectionDiv.appendChild(title);

        // File Name Hint Input
        const hintGroup = document.createElement('div');
        hintGroup.className = 'config-group';
        const hintLabel = document.createElement('label');
        hintLabel.htmlFor = `hint-${typeName}`;
        hintLabel.textContent = 'File Name Hint:';
        const hintInput = document.createElement('input');
        hintInput.type = 'text';
        hintInput.id = `hint-${typeName}`;
        hintInput.placeholder = `e.g., ${typeName.toLowerCase()}_scan`;
        hintInput.value = sample.hint || ''; // Pre-fill if exists
        hintInput.addEventListener('change', (e) => { sample.hint = e.target.value.trim(); });
        hintGroup.appendChild(hintLabel);
        hintGroup.appendChild(hintInput);
        sectionDiv.appendChild(hintGroup);

        // App ID Column Dropdown
        const appIdGroup = document.createElement('div');
        appIdGroup.className = 'config-group';
        const appIdLabel = document.createElement('label');
        appIdLabel.htmlFor = `appId-${typeName}`;
        appIdLabel.textContent = 'Application ID Column (in this sheet type):';
        const appIdSelect = document.createElement('select');
        appIdSelect.id = `appId-${typeName}`;
        appIdSelect.innerHTML = `<option value="">-- Select ${typeName} Header --</option>`;
        sample.headers.forEach(header => {
            const option = new Option(header, header);
            option.selected = (header === sample.appIdCol); // Pre-select if exists
            appIdSelect.appendChild(option);
        });
        appIdSelect.addEventListener('change', (e) => { sample.appIdCol = e.target.value; });
        appIdGroup.appendChild(appIdLabel);
        appIdGroup.appendChild(appIdSelect);
        sectionDiv.appendChild(appIdGroup);

        // Column Mappings
        const mappingTitle = document.createElement('h4');
        mappingTitle.textContent = 'Map Output Columns to Input Columns:';
        mappingTitle.style.fontSize = '1em';
        mappingTitle.style.marginTop = '15px';
        sectionDiv.appendChild(mappingTitle);

        outputColumns.forEach(outputCol => {
            // Skip meta columns - they aren't mapped from data sheets
             if (outputCol === 'SourceType' || outputCol === 'SourceFile') return;
             // Skip master lookup columns typically
             if (config?.masterSheetIdentifier?.lookupColumns?.includes(outputCol)) return;
             // Skip the primary App ID output column (it's derived from appIdCol)
             if (outputCol === outputColumns[0]) return;


            const itemDiv = document.createElement('div');
            itemDiv.className = 'mapping-item';

            const outLabel = document.createElement('label');
            outLabel.textContent = `${outputCol}:`;
            outLabel.htmlFor = `map-${typeName}-${outputCol}`; // Add for attribute

            const select = document.createElement('select');
            select.id = `map-${typeName}-${outputCol}`; // Add ID
            select.dataset.outputColumn = outputCol; // Store which output col this is for
            select.innerHTML = '<option value="">(No Mapping)</option>'; // Default no mapping
            // Add option for default mapping if names match? Optional.
             // if (sample.headers.includes(outputCol)) {
             //     select.innerHTML += `<option value="${outputCol}">(Default: Use '${outputCol}')</option>`;
             // }
            sample.headers.forEach(header => {
                 // Don't offer the sheet's App ID column as a mapping target for other fields
                 if (header === sample.appIdCol) return;
                const option = new Option(header, header);
                select.appendChild(option);
            });

            itemDiv.appendChild(outLabel);
            itemDiv.appendChild(select);
            sectionDiv.appendChild(itemDiv);
        });

        dataSheetMappingsContainer.appendChild(sectionDiv);
    });
    checkGenerateButtonState();
}

/**
 * Checks if all necessary information is present to enable the Generate button.
 */
function checkGenerateButtonState() {
    let masterReady = masterHeaders.length > 0 && masterFileNameHint.value.trim() !== '' && masterAppIdColumn.value !== '';
    let dataSheetsReady = Object.keys(dataSheetSamples).length > 0 && Object.values(dataSheetSamples).every(ds => ds.headers.length > 0 && ds.hint && ds.appIdCol);
    let outputColsReady = outputColumns.length > 0;

    generateConfigButton.disabled = !(masterReady && dataSheetsReady && outputColsReady);
}

/**
 * Builds the final config object based on UI selections.
 */
function buildConfigObject() {
    logBuilderStatus("Building configuration object...");
    const finalConfig = {};

    // Master Sheet Identifier
    finalConfig.masterSheetIdentifier = {
        fileNameHint: masterFileNameHint.value.trim(),
        appIdColumn: masterAppIdColumn.value,
        lookupColumns: Array.from(masterLookupColumns.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value)
    };

    // Output Columns
    finalConfig.outputColumns = outputColumns;

    // Global Settings
    finalConfig.maxUniqueValuesForDropdown = parseInt(maxUniqueValuesInput.value, 10) || DEFAULT_MAX_UNIQUE_VALUES;


    // Data Sheet Mappings
    finalConfig.dataSheetMappings = [];
    const sortedTypeNames = Object.keys(dataSheetSamples).sort(); // Process in consistent order

    sortedTypeNames.forEach(typeName => {
        const sample = dataSheetSamples[typeName];
        if (!sample || !sample.headers || !sample.headers.length > 0) return; // Should not happen if Generate enabled

        const mappingEntry = {
            name: typeName,
            fileNameHint: sample.hint || document.getElementById(`hint-${typeName}`).value.trim(), // Get current value just in case
            appIdColumn: sample.appIdCol || document.getElementById(`appId-${typeName}`).value,
            columnMapping: {}
        };

        // Get selected mappings for this type
        const mappingSelects = dataSheetMappingsContainer.querySelectorAll(`#dataSheetMappingsContainer .data-sheet-mapping-type select[id^="map-${typeName}-"]`);
        mappingSelects.forEach(select => {
             if (select.value !== "") { // Only include if a mapping was selected
                 const outputCol = select.dataset.outputColumn;
                 mappingEntry.columnMapping[outputCol] = select.value;
             }
        });

        finalConfig.dataSheetMappings.push(mappingEntry);
    });

     // Optional: Add savedFilters (currently empty as this is for *new* configs)
     // finalConfig.savedFilters = { master: {}, dataSheets: {} };

    logBuilderStatus("Configuration object built.");
    return finalConfig;
}

/**
 * Triggers the download of a JSON object as a file.
 */
function downloadJson(jsonObject, baseFilename) {
     let jsonString;
    try {
         jsonString = JSON.stringify(jsonObject, null, 2); // Pretty print
    } catch (e) {
        logBuilderStatus(`Error converting configuration to JSON: ${e.message}`, true);
        return;
    }

    try {
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = baseFilename.endsWith('.json') ? baseFilename : `${baseFilename}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        logBuilderStatus(`Configuration file download started as '${link.download}'.`, false);
    } catch (e) {
        logBuilderStatus(`Error creating download link for configuration: ${e.message}`, true);
    }
}

/**
 * Handles the Generate button click.
 */
function handleGenerateConfig() {
     if (generateConfigButton.disabled) return;
     try {
        const configObject = buildConfigObject();
        downloadJson(configObject, 'config.json');
     } catch (error) {
         logBuilderStatus(`Failed to build or download config: ${error.message}`, true);
     }
}


// --- Event Listeners Setup ---
masterSampleInput.addEventListener('change', handleMasterUpload);
addDataTypeButton.addEventListener('click', addDataTypeSection);
outputColumnsText.addEventListener('input', checkGenerateButtonState); // Check enable state on typing
updateMappingUIButton.addEventListener('click', updateOutputColumns); // Explicit update button
generateConfigButton.addEventListener('click', handleGenerateConfig);
// Add listeners for master config changes to recheck button state
masterFileNameHint.addEventListener('input', checkGenerateButtonState);
masterAppIdColumn.addEventListener('change', checkGenerateButtonState);

// --- Initial Setup ---
logBuilderStatus("Config Builder Initialized.");
addDataTypeSection(); // Add the first data sheet type section automatically