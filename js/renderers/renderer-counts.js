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
    // Apply layout styles if defined later

    // Get Config
    const countsConf = tabConfig.config;
    if (!countsConf) { showMessage(`Counts tab "${tabConfig.title}" missing 'config'.`, tabConfig.id); return; }

    const countsGroupByCol = countsConf.groupByColumn;
    const counters = countsConf.counters;
    const validHeaders = globalConfig.csvHeaders || [];

    // Validate Config
    if (!countsGroupByCol || !validHeaders.includes(countsGroupByCol)) {
        showMessage(`Counts tab "${tabConfig.title}" 'groupByColumn' invalid.`, tabConfig.id); return;
    }
    if (!counters || !Array.isArray(counters) || counters.length === 0) {
        showMessage(`Counts tab "${tabConfig.title}" requires 'counters' array.`, tabConfig.id); return;
    }
    if (!filteredData || filteredData.length === 0) {
        showMessage(`No data matches filter for tab "${tabConfig.title}".`, tabConfig.id); return;
    }

    // Calculate Counts
    const indicatorCounts = {};
    const indicatorDetails = {};

    filteredData.forEach(row => {
        let groupByValues = ['Uncategorized'];
        if (validHeaders.includes(countsGroupByCol)) { /* ... get groupByValue ... */
            const rawGroupByValue = row[countsGroupByCol];
            if (Array.isArray(rawGroupByValue)) {
                const meaningfulValues = rawGroupByValue.map(v => String(v || '').trim()).filter(v => v !== '');
                groupByValues = meaningfulValues.length > 0 ? [meaningfulValues.join(', ')] : ['Uncategorized'];
            } else if (rawGroupByValue !== null && typeof rawGroupByValue !== 'undefined' && String(rawGroupByValue).trim() !== '') {
                groupByValues = [String(rawGroupByValue)];
            }
        }
        const groupByValue = groupByValues[0];


        counters.forEach(counterConfig => {
            if (!counterConfig.column || !counterConfig.title || !counterConfig.filterType) { return; }
            if (!validHeaders.includes(counterConfig.column)) { return; }

            const rowValueToCheck = row[counterConfig.column];

            // Use the specific checkCounterFilter helper
            if (checkCounterFilter(rowValueToCheck, counterConfig, globalConfig)) {
                const counterTitle = counterConfig.title;
                if (!indicatorDetails[counterTitle]) { /* ... store display details ... */
                     let displayHTML = '';
                     const displayConf = counterConfig.display;
                     const cssClass = displayConf?.cssClass ? ` ${displayConf.cssClass}` : '';
                     const titleAttr = ` title="${counterConfig.title}"`;
                     if (displayConf?.type === 'icon' && displayConf.value) {
                          displayHTML = `<span class="csv-dashboard-icon${cssClass}"${titleAttr}>${displayConf.value}</span>`;
                     } else if (displayConf?.type === 'text' && displayConf.value) {
                          displayHTML = `<span class="count-header-tag-icon${cssClass}"${titleAttr}>${displayConf.value}</span>`;
                     }
                     indicatorDetails[counterTitle] = { displayHTML, title: counterTitle };
                }
                if (!indicatorCounts[counterTitle]) indicatorCounts[counterTitle] = { "__total__": 0 };
                if (!indicatorCounts[counterTitle][groupByValue]) indicatorCounts[counterTitle][groupByValue] = 0;
                indicatorCounts[counterTitle][groupByValue]++;
                indicatorCounts[counterTitle]["__total__"]++;
            }
        });
    });

    // Render Counts Grid
    const sortedCounterTitles = Object.keys(indicatorCounts).sort((a, b) => a.localeCompare(b));

    if (sortedCounterTitles.length === 0) {
        showMessage(`No items matched counters for tab "${tabConfig.title}".`, tabConfig.id); return;
    }

    sortedCounterTitles.forEach(counterTitle => {
        const groupByData = indicatorCounts[counterTitle];
        const details = indicatorDetails[counterTitle];
        const totalCount = groupByData["__total__"];

        const indicatorGroupDiv = document.createElement('div'); indicatorGroupDiv.className = 'indicator-domain-group';
        const groupHeader = document.createElement('h3');
        groupHeader.innerHTML = `${details?.displayHTML || ''}<span class="indicator-label">${details?.title || counterTitle}</span><span class="indicator-total-count">(Total: ${totalCount})</span>`;
        indicatorGroupDiv.appendChild(groupHeader);

        const boxesContainer = document.createElement('div'); boxesContainer.className = 'domain-boxes-container';
        const groupByKeys = Object.keys(groupByData).filter(key => key !== "__total__").sort((a, b) => a.localeCompare(b));

        if (groupByKeys.length > 0) {
            groupByKeys.forEach(groupByKey => {
                const count = groupByData[groupByKey];
                if (count > 0) {
                    const boxDiv = document.createElement('div'); boxDiv.className = 'domain-count-box';
                    boxDiv.innerHTML = `<span class="count-number">${count}</span><span class="domain-label">${groupByKey}</span>`;
                    boxDiv.title = `${details?.title || counterTitle} - ${countsGroupByCol}: ${groupByKey} (${count})`;
                    boxesContainer.appendChild(boxDiv);
                }
            });
            if (boxesContainer.children.length > 0) {
                indicatorGroupDiv.appendChild(boxesContainer);
            } else {
                 const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
                 noCountsMsg.textContent = `No counts > 0 for any specific ${countsGroupByCol}.`; indicatorGroupDiv.appendChild(noCountsMsg);
            }
        } else {
            const noCountsMsg = document.createElement('p'); noCountsMsg.className = 'no-counts-message';
            noCountsMsg.textContent = `No breakdown by ${countsGroupByCol} found.`; indicatorGroupDiv.appendChild(noCountsMsg);
        }
        targetElement.appendChild(indicatorGroupDiv);
    });

    if (targetElement.querySelector('.indicator-domain-group')) {
        hideMessages(tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-counts.js ---