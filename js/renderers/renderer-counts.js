// --- START OF FILE js/renderers/renderer-counts.js ---

/**
 * Evaluates if a data row matches the filter criteria specified in a counter's configuration.
 * Supports both the legacy single-condition format ({ column, filterType, filterValue })
 * and the new multi-condition format ({ logic, conditions: [...] }).
 * Uses the shared checkCondition helper for individual condition checks.
 *
 * @param {object} row The data row object to evaluate.
 * @param {object} counterConfig The configuration object for the specific counter.
 * @param {object} globalConfig The global application configuration.
 * @returns {boolean} True if the row matches the counter's criteria, false otherwise.
 */
function evaluateCounterConditions(row, counterConfig, globalConfig) {
    if (!counterConfig) {
        console.warn("evaluateCounterConditions: Missing counterConfig.");
        return false;
    }

    // --- New Multi-Condition Format ---
    if (Array.isArray(counterConfig.conditions) && counterConfig.conditions.length > 0) {
        const logic = (counterConfig.logic || 'AND').toUpperCase(); // Default to AND
        const conditions = counterConfig.conditions;

        if (logic === 'OR') {
            // Check if *any* condition is met
            return conditions.some(condition => {
                if (!condition || !condition.column) {
                     console.warn("evaluateCounterConditions: Invalid condition within 'OR' logic:", condition);
                     return false; // Treat invalid conditions as false in OR
                }
                // Use the shared helper for the actual check
                return checkCondition(row, condition, globalConfig);
            });
        } else { // Default to AND
            // Check if *all* conditions are met
            return conditions.every(condition => {
                 if (!condition || !condition.column) {
                     console.warn("evaluateCounterConditions: Invalid condition within 'AND' logic:", condition);
                     return false; // Invalid condition means the 'AND' fails
                 }
                 // Use the shared helper for the actual check
                 return checkCondition(row, condition, globalConfig);
            });
        }
    }
    // --- Legacy Single-Condition Format ---
    else if (counterConfig.column && counterConfig.filterType) {
        // Reconstruct a single condition object to use the shared helper
        const singleCondition = {
            column: counterConfig.column,
            filterType: counterConfig.filterType,
            filterValue: counterConfig.filterValue // Pass filterValue even if null/undefined
        };
        // Use the shared helper for the actual check
        return checkCondition(row, singleCondition, globalConfig);
    }
    // --- Invalid or Unhandled Format ---
    else {
        console.warn(`evaluateCounterConditions: Invalid counter configuration format for title "${counterConfig.title}". Neither 'conditions' array nor valid legacy properties found.`, counterConfig);
        return false;
    }
}


/**
 * Renders the Counts View based on configuration specific to the tab.
 * Handles predefined counters (single or multi-condition) and dynamic "countAllValues" type counters.
 *
 * @param {object[]} filteredData The data rows already filtered for this tab.
 * @param {object} tabConfig The configuration object for this specific counts tab.
 * @param {object} globalConfig The global application configuration.
 * @param {HTMLElement} targetElement The container element for this tab.
 * @param {Function} showMessage Function to display messages.
 */
function renderCountsView(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
    if (!targetElement) { console.error("renderCountsView: Target element not provided."); return; }
    targetElement.innerHTML = '';
    setMessagePlaceholder(tabConfig.id, '', false);
    targetElement.style.display = 'grid';
    // Apply layout styles (grid-template-columns, gap from CSS)

    // Get Config
    const countsConf = tabConfig.config;
    if (!countsConf) { showMessage(`Counts tab "${tabConfig.title}" missing 'config'.`, tabConfig.id); return; }

    const countsGroupByCol = countsConf.groupByColumn;
    const counters = countsConf.counters;
    const validHeaders = globalConfig.csvHeaders || [];

    // Validate Config
    if (!countsGroupByCol || !validHeaders.includes(countsGroupByCol)) {
        showMessage(`Counts tab "${tabConfig.title}" 'groupByColumn' ("${countsGroupByCol}") is invalid.`, tabConfig.id); return;
    }
    if (!counters || !Array.isArray(counters) || counters.length === 0) {
        showMessage(`Counts tab "${tabConfig.title}" requires 'counters' array.`, tabConfig.id); return;
    }
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches filter for tab "${tabConfig.title}".`, tabConfig.id); return;
    }

    // --- Separate counter types ---
    const predefinedCounters = counters.filter(c => c.filterType !== 'countAllValues');
    const countAllCounters = counters.filter(c => c.filterType === 'countAllValues');

    // --- Data Aggregation ---
    const predefinedIndicatorCounts = {}; // Structure: { counterTitle: { groupByValue: count, "__total__": total } }
    const predefinedIndicatorDetails = {}; // Structure: { counterTitle: { displayHTML, title } }
    const dynamicCounts = {}; // Structure: { columnToCount: { groupByValue: { uniqueValue: count } } }
    const uniqueValuesPerDynamicColumn = {}; // Structure: { columnToCount: Set<string> }

    filteredData.forEach(row => {
        // Determine the primary group-by value(s) for this row
        let groupByValues = ['Uncategorized'];
        if (validHeaders.includes(countsGroupByCol)) {
            const rawGroupByValue = row[countsGroupByCol];
            if (Array.isArray(rawGroupByValue)) {
                const meaningfulValues = rawGroupByValue.map(v => String(v ?? '').trim()).filter(v => v !== '');
                groupByValues = meaningfulValues.length > 0 ? meaningfulValues : ['Uncategorized'];
            } else if (rawGroupByValue !== null && typeof rawGroupByValue !== 'undefined' && String(rawGroupByValue).trim() !== '') {
                groupByValues = [String(rawGroupByValue)];
            }
        }
        // For aggregation, we associate the count with *each* group-by value if it's multi-value
        groupByValues.forEach(primaryGroupByValue => {

            // --- Process Predefined Counters (Using new evaluation logic) ---
            predefinedCounters.forEach(counterConfig => {
                if (!counterConfig.title) { // Ensure counter has a title for grouping results
                     console.warn("Skipping predefined counter due to missing title:", counterConfig);
                     return;
                }
                // --- Use the new evaluation function ---
                if (evaluateCounterConditions(row, counterConfig, globalConfig)) {
                    const counterTitle = counterConfig.title;
                    // Store display details once
                    if (!predefinedIndicatorDetails[counterTitle]) {
                        let displayHTML = '';
                        const displayConf = counterConfig.display;
                        const cssClass = displayConf?.cssClass ? ` ${displayConf.cssClass}` : '';
                        const titleAttr = ` title="${counterConfig.title}"`;
                        if (displayConf?.type === 'icon' && displayConf.value) {
                             displayHTML = `<span class="csv-dashboard-icon${cssClass}"${titleAttr}>${displayConf.value}</span>`;
                        } else if (displayConf?.type === 'text' && displayConf.value) {
                             displayHTML = `<span class="count-header-tag-icon${cssClass}"${titleAttr}>${displayConf.value}</span>`;
                        }
                        predefinedIndicatorDetails[counterTitle] = { displayHTML, title: counterTitle };
                    }
                    // Increment counts
                    if (!predefinedIndicatorCounts[counterTitle]) predefinedIndicatorCounts[counterTitle] = { "__total__": 0 };
                    if (!predefinedIndicatorCounts[counterTitle][primaryGroupByValue]) predefinedIndicatorCounts[counterTitle][primaryGroupByValue] = 0;
                    predefinedIndicatorCounts[counterTitle][primaryGroupByValue]++;
                    predefinedIndicatorCounts[counterTitle]["__total__"]++;
                }
            }); // End predefinedCounters loop

            // --- Process "Count All Values" Counters (Logic Unchanged here) ---
            countAllCounters.forEach(counterConfig => {
                const columnToCount = counterConfig.column;
                if (!columnToCount || !validHeaders.includes(columnToCount)) return;

                const valuesInCell = row[columnToCount];
                const valuesToCount = Array.isArray(valuesInCell)
                    ? valuesInCell.map(v => String(v ?? 'N/A').trim()).filter(v => v !== '')
                    : [(valuesInCell === null || typeof valuesInCell === 'undefined' || String(valuesInCell).trim() === '') ? 'N/A' : String(valuesInCell).trim()];

                if (!dynamicCounts[columnToCount]) dynamicCounts[columnToCount] = {};
                if (!uniqueValuesPerDynamicColumn[columnToCount]) uniqueValuesPerDynamicColumn[columnToCount] = new Set();

                if (!dynamicCounts[columnToCount][primaryGroupByValue]) dynamicCounts[columnToCount][primaryGroupByValue] = {};

                valuesToCount.forEach(uniqueVal => {
                    uniqueValuesPerDynamicColumn[columnToCount].add(uniqueVal); // Track unique value globally
                    if (!dynamicCounts[columnToCount][primaryGroupByValue][uniqueVal]) {
                        dynamicCounts[columnToCount][primaryGroupByValue][uniqueVal] = 0;
                    }
                    dynamicCounts[columnToCount][primaryGroupByValue][uniqueVal]++;
                });
            }); // End countAllCounters loop
        }); // End groupByValues loop
    }); // End filteredData loop

    // --- Rendering Phase (Mostly Unchanged) ---
    targetElement.innerHTML = ''; // Clear again before rendering

    // Render Predefined Counters
    const sortedPredefinedTitles = Object.keys(predefinedIndicatorCounts).sort((a, b) => a.localeCompare(b));
    sortedPredefinedTitles.forEach(counterTitle => {
        const groupByData = predefinedIndicatorCounts[counterTitle];
        const details = predefinedIndicatorDetails[counterTitle];
        const totalCount = groupByData["__total__"] || 0; // Ensure totalCount is numeric

        const indicatorGroupDiv = document.createElement('div');
        indicatorGroupDiv.className = 'indicator-domain-group';
        const groupHeader = document.createElement('h3');
        groupHeader.innerHTML = `${details?.displayHTML || ''}<span class="indicator-label">${details?.title || counterTitle}</span><span class="indicator-total-count">(Total: ${totalCount})</span>`;
        indicatorGroupDiv.appendChild(groupHeader);

        const boxesContainer = document.createElement('div');
        boxesContainer.className = 'domain-boxes-container';
        // Get group-by keys present for *this specific counter*
        const groupByKeys = Object.keys(groupByData).filter(key => key !== "__total__").sort((a, b) => a.localeCompare(b));

        if (groupByKeys.length > 0) {
            groupByKeys.forEach(groupByKey => {
                const count = groupByData[groupByKey];
                if (count > 0) { // Only display boxes with counts > 0
                    const boxDiv = document.createElement('div');
                    boxDiv.className = 'domain-count-box';
                    boxDiv.innerHTML = `<span class="count-number">${count}</span><span class="domain-label">${groupByKey}</span>`;
                    boxDiv.title = `${details?.title || counterTitle} - ${countsGroupByCol}: ${groupByKey} (${count})`;
                    boxesContainer.appendChild(boxDiv);
                }
            });
        }

        if (boxesContainer.children.length === 0 && totalCount > 0) {
            // Handle case where total is > 0 but breakdown yields no boxes (e.g., all counts were 0 for displayed group keys)
             const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
             noCountsMsg.textContent = `No breakdown by ${countsGroupByCol} found (Total: ${totalCount}).`;
             indicatorGroupDiv.appendChild(noCountsMsg);
        } else if (boxesContainer.children.length > 0) {
             indicatorGroupDiv.appendChild(boxesContainer);
        } else { // totalCount is 0 or breakdown yields no displayable boxes
             const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
             noCountsMsg.textContent = `No items matched criteria.`;
             indicatorGroupDiv.appendChild(noCountsMsg);
        }
        targetElement.appendChild(indicatorGroupDiv);
    });

    // Render Dynamic "Count All" Counters (Rendering logic unchanged)
    Object.keys(dynamicCounts).forEach(columnToCount => {
        const columnData = dynamicCounts[columnToCount];
        const uniqueValuesForCol = Array.from(uniqueValuesPerDynamicColumn[columnToCount]).sort((a,b) => a.localeCompare(b));
        const overallTotal = Object.values(columnData).reduce((sum, group) => sum + Object.values(group).reduce((s, c) => s + c, 0), 0);

        const indicatorGroupDiv = document.createElement('div');
        indicatorGroupDiv.className = 'indicator-domain-group';
        const groupHeader = document.createElement('h3');
        const counterConf = countAllCounters.find(c => c.column === columnToCount);
        const displayHTML = counterConf?.display?.value ? `<span class="${counterConf.display.type === 'icon' ? 'csv-dashboard-icon' : 'count-header-tag-icon'}${counterConf.display.cssClass ? ' ' + counterConf.display.cssClass : ''}" title="${counterConf.title || columnToCount}">${counterConf.display.value}</span> ` : '';
        groupHeader.innerHTML = `${displayHTML}<span class="indicator-label">${counterConf?.title || `${columnToCount} Breakdown`}</span><span class="indicator-total-count">(Total Items: ${overallTotal})</span>`;
        indicatorGroupDiv.appendChild(groupHeader);

        const boxesContainer = document.createElement('div');
        boxesContainer.className = 'domain-boxes-container';

        const groupByKeys = Object.keys(columnData).sort((a, b) => a.localeCompare(b));

        if (groupByKeys.length > 0) {
             groupByKeys.forEach(groupByKey => {
                 const countsPerUniqueVal = columnData[groupByKey];
                 const boxDiv = document.createElement('div');
                 boxDiv.className = 'domain-count-box';
                 boxDiv.style.textAlign = 'left';
                 boxDiv.style.minWidth = '150px';

                 let boxHTML = `<span class="domain-label" style="font-weight:bold; margin-bottom: 3px;">${groupByKey}</span>`;
                 const valueCounts = [];
                 uniqueValuesForCol.forEach(uniqueVal => {
                      const count = countsPerUniqueVal[uniqueVal] || 0;
                      if (count > 0) {
                          const formattedValue = formatTag(uniqueVal, globalConfig, columnToCount);
                          valueCounts.push(`<span style="display: block; font-size: 0.9em; margin-left: 5px;">${formattedValue || uniqueVal}: ${count}</span>`);
                      }
                 });
                 boxHTML += valueCounts.join('');
                 boxDiv.innerHTML = boxHTML;
                 boxDiv.title = `${columnToCount} Breakdown for ${countsGroupByCol}: ${groupByKey}`;
                 boxesContainer.appendChild(boxDiv);
             });
        }

        if (boxesContainer.children.length > 0) {
             indicatorGroupDiv.appendChild(boxesContainer);
        } else {
            const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
            noCountsMsg.textContent = `No items found for column "${columnToCount}".`;
            indicatorGroupDiv.appendChild(noCountsMsg);
        }
        targetElement.appendChild(indicatorGroupDiv);
    });


    // --- Final Message Handling ---
    if (targetElement.children.length > 0 && !targetElement.querySelector('.message-placeholder.visible')) {
         hideMessages(tabConfig.id);
    } else if (!targetElement.querySelector('.indicator-domain-group')) {
        // If absolutely nothing was rendered (no predefined, no dynamic)
        showMessage(`No counts generated for tab "${tabConfig.title}".`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-counts.js ---