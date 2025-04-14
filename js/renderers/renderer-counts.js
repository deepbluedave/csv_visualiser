// --- START OF FILE js/renderers/renderer-counts.js ---

/**
 * Checks if a row's value matches a counter's filter criteria.
 * Uses the generic checkCondition function.
 * @param {string|string[]} rowValue The value from the row.
 * @param {object} counterConfig The specific counter object.
 * @param {object} globalConfig The global application configuration.
 * @returns {boolean} True if the row value matches the filter criteria.
 */
function checkCounterFilter(rowValue, counterConfig, globalConfig) {
    if (!counterConfig || !counterConfig.filterType || !counterConfig.column) {
        return false;
    }
    // Adapt inputs for the generic checkCondition
    const dummyRow = { [counterConfig.column]: rowValue };
    const condition = {
        column: counterConfig.column,
        filterType: counterConfig.filterType,
        filterValue: counterConfig.filterValue
    };
    return checkCondition(dummyRow, condition, globalConfig); // Use imported checkCondition
}


/**
 * Renders the Counts View based on configuration specific to the tab.
 * Handles predefined counters and dynamic "countAllValues" type counters.
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
        // Determine the primary group-by value for this row
        let groupByValues = ['Uncategorized'];
        if (validHeaders.includes(countsGroupByCol)) {
            const rawGroupByValue = row[countsGroupByCol];
            if (Array.isArray(rawGroupByValue)) {
                const meaningfulValues = rawGroupByValue.map(v => String(v ?? '').trim()).filter(v => v !== '');
                groupByValues = meaningfulValues.length > 0 ? meaningfulValues : ['Uncategorized']; // Keep as array if multi-value group
            } else if (rawGroupByValue !== null && typeof rawGroupByValue !== 'undefined' && String(rawGroupByValue).trim() !== '') {
                groupByValues = [String(rawGroupByValue)];
            }
        }
        const primaryGroupByValue = groupByValues[0]; // Use first value for primary grouping display key

        // Process Predefined Counters
        predefinedCounters.forEach(counterConfig => {
            if (!counterConfig.column || !counterConfig.title || !counterConfig.filterType || !validHeaders.includes(counterConfig.column)) return;
            const rowValueToCheck = row[counterConfig.column];
            if (checkCounterFilter(rowValueToCheck, counterConfig, globalConfig)) {
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
        });

        // Process "Count All Values" Counters
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
        });
    });

    // --- Rendering Phase ---
    targetElement.innerHTML = ''; // Clear again before rendering

    // Render Predefined Counters
    const sortedPredefinedTitles = Object.keys(predefinedIndicatorCounts).sort((a, b) => a.localeCompare(b));
    sortedPredefinedTitles.forEach(counterTitle => {
        const groupByData = predefinedIndicatorCounts[counterTitle];
        const details = predefinedIndicatorDetails[counterTitle];
        const totalCount = groupByData["__total__"];

        const indicatorGroupDiv = document.createElement('div');
        indicatorGroupDiv.className = 'indicator-domain-group';
        const groupHeader = document.createElement('h3');
        groupHeader.innerHTML = `${details?.displayHTML || ''}<span class="indicator-label">${details?.title || counterTitle}</span><span class="indicator-total-count">(Total: ${totalCount})</span>`;
        indicatorGroupDiv.appendChild(groupHeader);

        const boxesContainer = document.createElement('div');
        boxesContainer.className = 'domain-boxes-container';
        const groupByKeys = Object.keys(groupByData).filter(key => key !== "__total__").sort((a, b) => a.localeCompare(b));

        if (groupByKeys.length > 0) {
            groupByKeys.forEach(groupByKey => {
                const count = groupByData[groupByKey];
                if (count > 0) {
                    const boxDiv = document.createElement('div');
                    boxDiv.className = 'domain-count-box';
                    boxDiv.innerHTML = `<span class="count-number">${count}</span><span class="domain-label">${groupByKey}</span>`;
                    boxDiv.title = `${details?.title || counterTitle} - ${countsGroupByCol}: ${groupByKey} (${count})`;
                    boxesContainer.appendChild(boxDiv);
                }
            });
        }

        if (boxesContainer.children.length === 0 && totalCount > 0) {
            const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
            noCountsMsg.textContent = `No breakdown by ${countsGroupByCol} found (Total: ${totalCount}).`;
            indicatorGroupDiv.appendChild(noCountsMsg);
        } else if (boxesContainer.children.length > 0) {
             indicatorGroupDiv.appendChild(boxesContainer);
        } else { // totalCount is 0
             const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
             noCountsMsg.textContent = `No items matched criteria.`;
             indicatorGroupDiv.appendChild(noCountsMsg);
        }
        targetElement.appendChild(indicatorGroupDiv);
    });

    // Render Dynamic "Count All" Counters
    Object.keys(dynamicCounts).forEach(columnToCount => {
        const columnData = dynamicCounts[columnToCount];
        const uniqueValuesForCol = Array.from(uniqueValuesPerDynamicColumn[columnToCount]).sort((a,b) => a.localeCompare(b));
        const overallTotal = Object.values(columnData).reduce((sum, group) => sum + Object.values(group).reduce((s, c) => s + c, 0), 0);


        const indicatorGroupDiv = document.createElement('div');
        indicatorGroupDiv.className = 'indicator-domain-group';
        const groupHeader = document.createElement('h3');
        // Use column name for title, maybe get display info if counterConfig had it?
        const counterConf = countAllCounters.find(c => c.column === columnToCount);
        const displayHTML = counterConf?.display?.value ? `<span class="${counterConf.display.type === 'icon' ? 'csv-dashboard-icon' : 'count-header-tag-icon'}${counterConf.display.cssClass ? ' ' + counterConf.display.cssClass : ''}" title="${counterConf.title || columnToCount}">${counterConf.display.value}</span> ` : '';
        groupHeader.innerHTML = `${displayHTML}<span class="indicator-label">${counterConf?.title || `${columnToCount} Breakdown`}</span><span class="indicator-total-count">(Total Items: ${overallTotal})</span>`;
        indicatorGroupDiv.appendChild(groupHeader);

        const boxesContainer = document.createElement('div');
        boxesContainer.className = 'domain-boxes-container'; // Reusing class, maybe make more specific?

        const groupByKeys = Object.keys(columnData).sort((a, b) => a.localeCompare(b));

        if (groupByKeys.length > 0) {
             groupByKeys.forEach(groupByKey => {
                 const countsPerUniqueVal = columnData[groupByKey];
                 const boxDiv = document.createElement('div');
                 boxDiv.className = 'domain-count-box'; // Consider a different class? Maybe `dynamic-count-box`
                 boxDiv.style.textAlign = 'left'; // Adjust alignment for list
                 boxDiv.style.minWidth = '150px'; // Give more space

                 let boxHTML = `<span class="domain-label" style="font-weight:bold; margin-bottom: 3px;">${groupByKey}</span>`;
                 const valueCounts = [];
                 uniqueValuesForCol.forEach(uniqueVal => {
                      const count = countsPerUniqueVal[uniqueVal] || 0;
                      if (count > 0) {
                          // Try to format the unique value using existing indicator styles
                          const formattedValue = formatTag(uniqueVal, globalConfig, columnToCount); // Use formatTag helper
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


    if (targetElement.children.length > 0 && !targetElement.querySelector('.message-placeholder.visible')) {
         hideMessages(tabConfig.id);
    } else if (!targetElement.querySelector('.indicator-domain-group')) {
        // If absolutely nothing was rendered (no predefined, no dynamic)
        showMessage(`No counts generated for tab "${tabConfig.title}".`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-counts.js ---