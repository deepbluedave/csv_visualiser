// editor_config_handler.js

let currentEditorConfig = null;
let currentViewerConfig = null;

async function loadJsConfigurationFile(file, expectedGlobalVarName) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error("No file provided for configuration."));
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const scriptContent = e.target.result;
            try {
                const priorGlobal = window[expectedGlobalVarName];
                let newConfig = null;

                try {
                    const modifiedScriptContent = `
                        window.__tempConfigVar__ = (function(){
                            ${scriptContent}
                            return typeof ${expectedGlobalVarName} !== 'undefined' ? ${expectedGlobalVarName} : undefined;
                        })();
                    `;

                    const scriptTag = document.createElement('script');
                    scriptTag.textContent = modifiedScriptContent;
                    document.body.appendChild(scriptTag);

                    newConfig = window.__tempConfigVar__;
                    delete window.__tempConfigVar__;
                    document.body.removeChild(scriptTag);

                } catch (executionError) {
                    if (priorGlobal !== undefined) window[expectedGlobalVarName] = priorGlobal;
                    // else delete window[expectedGlobalVarName]; // This might not effectively delete 'let' declared globals
                    return reject(new Error(`Error executing configuration script ${file.name}: ${executionError.message}`));
                }

                if (typeof newConfig === 'object' && newConfig !== null) {
                    if (priorGlobal !== undefined) {
                        window[expectedGlobalVarName] = priorGlobal;
                    }
                    resolve(JSON.parse(JSON.stringify(newConfig)));
                } else {
                     let errorMsg = `Configuration script did not make the expected variable '${expectedGlobalVarName}' available as an object, or it was null.`;
                     if (typeof newConfig === 'undefined') {
                         errorMsg += ` Variable '${expectedGlobalVarName}' was not defined globally or returned. Check the config file structure.`;
                     }
                    reject(new Error(errorMsg));
                }
            } catch (error) {
                reject(new Error(`Error processing configuration script ${file.name}: ${error.message}`));
            }
        };
        reader.onerror = () => reject(new Error(`Error reading configuration file ${file.name}.`));
        reader.readAsText(file);
    });
}

function getEditorConfig() {
    return currentEditorConfig;
}

function getViewerConfig() {
    return currentViewerConfig;
}

function setEditorConfig(config) {
    if (!config || !Array.isArray(config.columns) || config.columns.length === 0) {
        currentEditorConfig = null;
        throw new Error("Invalid editor configuration: Must be an object with a non-empty 'columns' array.");
    }
    currentEditorConfig = config;
    console.log("Editor config set:", currentEditorConfig);
}

function setViewerConfig(config) {
    if (!config || !config.generalSettings) {
        currentViewerConfig = null;
        throw new Error("Invalid viewer configuration: Must be an object with 'generalSettings'.");
    }
    currentViewerConfig = config;
    console.log("Viewer config set:", currentViewerConfig);
}

function clearAllConfigs() { // Renamed for clarity
    currentEditorConfig = null;
    currentViewerConfig = null;
    console.log("All configurations cleared.");
}