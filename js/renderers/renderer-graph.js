// --- START OF FILE js/renderers/renderer-graph.js ---

/**
 * Extracts the styling configuration for a specific value from indicatorStyles.
 * Replicates logic from formatTag but returns the style object, not HTML.
 * Prioritizes styleRules over valueMap.
 * @param {string} value The value to find the style for.
 * @param {string} columnName The column name.
 * @param {object} indicatorStyles The global indicatorStyles configuration.
 * @returns {object|null} The style object ({bgColor, textColor, etc.}) or null if no style found.
 */
function getNodeStyleConfig(value, columnName, indicatorStyles) {
    const stringValue = String(value || '');
    const columnStyleConfig = indicatorStyles ? indicatorStyles[columnName] : null;

    if (!columnStyleConfig || (columnStyleConfig.type !== 'tag' && columnStyleConfig.type !== 'icon')) {
        return null; // Only handle tags/icons for color/style info
    }

    let style = null;

    // 1. Check styleRules (for tags)
    if (columnStyleConfig.type === 'tag' && Array.isArray(columnStyleConfig.styleRules)) {
        for (const rule of columnStyleConfig.styleRules) {
            let match = false;
             try {
                if (rule.matchType === 'regex' && rule.pattern) {
                    if (new RegExp(rule.pattern).test(stringValue)) match = true;
                } else if (rule.matchType === 'exact' && stringValue === rule.value) {
                    match = true;
                }
            } catch (e) { console.error(`Error in getNodeStyleConfig regex for ${columnName}:`, e); }

            if (match && rule.style) {
                style = rule.style;
                break;
            }
        }
        if (!style) style = columnStyleConfig.defaultStyle || null; // Use defaultStyle if rules exist but none matched
    }

    // 2. Fallback to valueMap (for tags or icons) if no styleRules matched or defined
    if (!style && columnStyleConfig.valueMap) {
        const lowerValue = stringValue.toLowerCase();
        style = columnStyleConfig.valueMap.hasOwnProperty(stringValue) ? columnStyleConfig.valueMap[stringValue] :
                columnStyleConfig.valueMap.hasOwnProperty(lowerValue) ? columnStyleConfig.valueMap[lowerValue] :
                columnStyleConfig.valueMap['default'];
    }

    // 3. Fallback to trueCondition (for icons) if still no style
     if (!style && columnStyleConfig.type === 'icon' && columnStyleConfig.trueCondition) {
         // Simplified: Assume trueCondition applies if value is truthy.
         // We don't have access to the global isTruthy here easily, so approximate.
         // For node coloring, this might be less critical.
         // A better approach might require passing isTruthy or the global config.
         // For now, let's return null if only trueCondition exists, as mapping color
         // from just 'true' state is ambiguous without knowing the value.
         // Consider enhancing this if icon color mapping is crucial.
         return null;
     }


    return style; // Return the found style object or null
}


/**
 * Renders data into a Network Graph view using Vis.js.
 * Implements the "Hub-and-Spoke" model: Primary nodes connected to Category nodes.
 * @param {object[]} filteredData The data rows already filtered for this tab.
 * @param {object} tabConfig The configuration object for this specific graph tab.
 * @param {object} globalConfig The global application configuration.
 * @param {HTMLElement} targetElement The container element for this tab.
 * @param {Function} showMessage Function to display messages.
 */
function renderGraph(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
    console.log(`Rendering Graph Tab: ${tabConfig.id}`);
    if (typeof vis === 'undefined') {
        showMessage(`Graph library (Vis.js) not loaded. Cannot render tab "${tabConfig.title}".`, tabConfig.id);
        console.error("Vis.js library not found!");
        return;
    }

    if (!targetElement) {
        console.error("renderGraph: Target element not provided.");
        return;
    }
    targetElement.innerHTML = ''; // Clear previous content
    // Ensure the container is visible and has some default size if needed
    targetElement.style.display = 'block';
    targetElement.style.minHeight = '400px'; // Ensure container has height for vis.js
    setMessagePlaceholder(tabConfig.id, '', false); // Ensure placeholder exists but is hidden initially

    // --- Config Validation ---
    const graphConf = tabConfig.config;
    const primaryIdCol = graphConf?.primaryNodeIdColumn;
    const primaryLabelCol = graphConf?.primaryNodeLabelColumn;
    const categoryCols = graphConf?.categoryNodeColumns;
    const validHeaders = globalConfig.csvHeaders || [];

    if (!primaryIdCol || !validHeaders.includes(primaryIdCol)) {
        showMessage(`Graph tab "${tabConfig.title}" 'primaryNodeIdColumn' is missing or invalid.`, tabConfig.id); return;
    }
    if (!primaryLabelCol || !validHeaders.includes(primaryLabelCol)) {
        showMessage(`Graph tab "${tabConfig.title}" 'primaryNodeLabelColumn' is missing or invalid.`, tabConfig.id); return;
    }
    if (!categoryCols || !Array.isArray(categoryCols) || categoryCols.length === 0) {
        showMessage(`Graph tab "${tabConfig.title}" requires 'categoryNodeColumns' array.`, tabConfig.id); return;
    }
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches filter for tab "${tabConfig.title}".`, tabConfig.id); return;
    }

    // --- Data Processing ---
    const nodes = [];
    const edges = [];
    const primaryNodeIds = new Set();
    const categoryNodes = {}; // Use map for unique category nodes: { 'CategoryCol::Value': nodeObject }

    try {
        filteredData.forEach(row => {
            const primaryId = row[primaryIdCol];
            const primaryLabel = row[primaryLabelCol] || `[No ${primaryLabelCol}]`;

            if (primaryId === null || typeof primaryId === 'undefined' || primaryId === '') {
                console.warn("Skipping row due to missing/empty primary ID:", row);
                return; // Skip rows without a valid primary ID
            }

            // --- Create/Add Primary Node ---
            if (!primaryNodeIds.has(primaryId)) {
                // Tooltip
                let tooltip = `<b>${primaryLabel}</b> (ID: ${primaryId})<br/>-----------<br/>`;
                (graphConf.nodeTooltipColumns || []).forEach(col => {
                     if (validHeaders.includes(col) && row[col] !== null && typeof row[col] !== 'undefined') {
                        tooltip += `<b>${col}:</b> ${Array.isArray(row[col]) ? row[col].join(', ') : row[col]}<br/>`;
                     }
                });

                // Color (using helper function)
                let nodeColor = { background: '#97C2FC', border: '#2B7CE9' }; // Default color
                const colorCol = graphConf.nodeColorColumn;
                if (colorCol && validHeaders.includes(colorCol)) {
                    const styleInfo = getNodeStyleConfig(row[colorCol], colorCol, globalConfig.indicatorStyles);
                    if (styleInfo && styleInfo.bgColor) {
                         nodeColor.background = styleInfo.bgColor;
                         nodeColor.border = styleInfo.borderColor || styleInfo.bgColor; // Use border or bg
                         if(styleInfo.textColor) nodeColor.font = { color: styleInfo.textColor };
                    }
                }

                nodes.push({
                    id: primaryId,
                    label: primaryLabel.length > 30 ? primaryLabel.substring(0, 27) + '...' : primaryLabel, // Truncate long labels
                    title: tooltip, // HTML tooltip
                    color: nodeColor,
                    shape: graphConf.nodeShape || 'ellipse'
                });
                primaryNodeIds.add(primaryId);
            }

            // --- Create/Add Category Nodes and Edges ---
            categoryCols.forEach(catCol => {
                if (validHeaders.includes(catCol)) {
                    let categoryValues = row[catCol];
                    // Ensure categoryValues is an array, handle multi-value columns
                    if (!Array.isArray(categoryValues)) {
                        categoryValues = (categoryValues === null || typeof categoryValues === 'undefined' || String(categoryValues).trim() === '') ? [] : [String(categoryValues)];
                    } else {
                        // Filter out empty strings if it's already an array from multi-value parsing
                        categoryValues = categoryValues.map(String).filter(v => v.trim() !== '');
                    }


                    categoryValues.forEach(catVal => {
                        const categoryNodeId = `${catCol}::${catVal}`; // Unique ID for category node

                        // Add category node if it doesn't exist
                        if (!categoryNodes[categoryNodeId]) {
                            let catNodeColor = (graphConf.categoryNodeStyle?.color) || { background: '#f0f0f0', border: '#cccccc' };
                            let catNodeFont = (graphConf.categoryNodeStyle?.font) || { color: '#555555', size: 11 };
                            categoryNodes[categoryNodeId] = {
                                id: categoryNodeId,
                                label: catVal,
                                title: `Category: ${catCol}<br/>Value: ${catVal}`,
                                color: catNodeColor,
                                shape: graphConf.categoryNodeStyle?.shape || 'box',
                                font: catNodeFont,
                                margin: graphConf.categoryNodeStyle?.margin || 5, // Adjust margin if needed
                                group: catCol // Assign group for potential clustering/styling
                            };
                        }

                        // Add Edge from primary node to this category node
                        edges.push({
                            from: primaryId,
                            to: categoryNodeId,
                            arrows: graphConf.edgeDirection === 'directed' ? 'to' : undefined,
                            color: graphConf.edgeColor || '#cccccc'
                        });
                    });
                }
            }); // End categoryCols.forEach
        }); // End filteredData.forEach

        // Combine primary nodes and unique category nodes
        const finalNodes = nodes.concat(Object.values(categoryNodes));

        if (finalNodes.length === 0) {
             showMessage(`No nodes could be generated for graph tab "${tabConfig.title}". Check config and data.`, tabConfig.id);
             return;
        }

        // --- Vis.js Initialization ---
        const nodesDataSet = new vis.DataSet(finalNodes);
        const edgesDataSet = new vis.DataSet(edges);
        const data = { nodes: nodesDataSet, edges: edgesDataSet };

        // Map config options to Vis.js options
        const options = {
            layout: {
                // hierarchical: graphConf.layoutEngine === 'hierarchical' ? { enabled: true, sortMethod: 'hubsize' } : false
                 // Add other layout options based on config if needed
            },
            physics: {
                enabled: graphConf.physicsEnabled !== false, // Enabled by default
                solver: 'forceAtlas2Based', // A common solver
                forceAtlas2Based: {
                     gravitationalConstant: -50,
                     centralGravity: 0.01,
                     springLength: 100,
                     springConstant: 0.08,
                     damping: 0.4
                 },
                 stabilization: { 
                    enabled: true,
                    iterations: 1000, // Or adjust as needed
                    updateInterval: 50,
                    onlyDynamicEdges: false,
                    fit: false // <-- IMPORTANT: Set Vis.js internal fit during stabilization to false, we'll do it manually after                }
                    // Adjust physics settings as needed
                 }
            },
            nodes: {
                 // Default node styles (can be overridden by individual node colors/shapes)
                 // shape: graphConf.nodeShape || 'ellipse',
                 // font: { size: 12, color: '#333' },
                 // borderWidth: 1
            },
            edges: {
                 // Default edge styles
                 // width: 0.5,
                 // color: { inherit: 'from' },
                 smooth: { type: 'dynamic' } // Or dynamic
            },
            interaction: {
                 tooltipDelay: 200,
                 hideEdgesOnDrag: true,
                 navigationButtons: true // Add zoom/fit buttons
            }
        };
         // Specific layout mapping
        if(graphConf.layoutEngine === 'hierarchical') {
             options.layout.hierarchical = { enabled: true, sortMethod: 'directed', direction: 'UD' }; // Example hierarchical settings
             options.physics.enabled = false; // Often disable physics with hierarchical
             options.layout.hierarchical.levelSeparation = 250; // Adjust as needed
        } else {
             // Default to force-directed implied by physics settings
        }


        // Create the network
        const network = new vis.Network(targetElement, data, options);

        network.on("stabilizationProgress", function(params) {
            // Optional: Show loading progress
            // console.log(`Stabilization progress: ${Math.round(params.iterations/params.total*100)}%`);
        });
        network.once("stabilizationIterationsDone", function() {
            // Optional: Actions after layout stabilization
             console.log(`Graph layout stabilized for tab: ${tabConfig.id}`);
             network.fit({
                animation: false 
            }); // Fit network to view after stabilization
        });

         network.on("showPopup", function (params) {
             // Override default popup with custom HTML content if needed
             // document.getElementById('popup-content').innerHTML = params.title; // Assuming you have a div with id 'popup-content'
             // Can use the nodeTooltipColumns logic here again if the default is not sufficient
         });
         network.on("hidePopup", function () {
             // Clear custom popup content
         });

        hideMessages(tabConfig.id); // Hide placeholder on success

    } catch (error) {
        console.error(`Error rendering graph for tab "${tabConfig.title}":`, error);
        showMessage(`Error rendering graph: ${error.message}. Check console.`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-graph.js ---