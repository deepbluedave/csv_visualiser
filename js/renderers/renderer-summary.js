// --- START OF FILE js/renderers/renderer-summary.js ---

/**
 * Checks if a row matches the filter criteria defined in a summary section configuration.
 * Operates on data already potentially filtered by the main tab filter.
 * @param {object} row The data row object.
 * @param {object} sectionConf The configuration object for the summary section.
 * @param {object} globalConfig The main application configuration.
 * @returns {boolean} True if the row matches the section's filter criteria.
 */
function checkSummarySectionFilter(row, sectionConf, globalConfig) {
    if (!sectionConf || !sectionConf.filterType) return false;
    if (sectionConf.filterType === 'catchAll') return false; // Handled separately

    const filterColumn = sectionConf.filterColumn;
    const requiresColumn = !['catchAll'].includes(sectionConf.filterType);

    if (requiresColumn && !filterColumn) {
        console.warn(`checkSummarySectionFilter: filterColumn missing for type "${sectionConf.filterType}" in section "${sectionConf.title}".`);
        return false;
    }
    // Ensure globalConfig and csvHeaders are available before checking includes
    if (filterColumn && (!globalConfig || !globalConfig.csvHeaders || !globalConfig.csvHeaders.includes(filterColumn))) {
        // console.warn(`checkSummarySectionFilter: filterColumn "${filterColumn}" not found in CSV headers. Filter fails.`);
        return false;
    }

    // Use the core checkCondition logic
    const condition = {
       column: sectionConf.filterColumn,
       filterType: sectionConf.filterType,
       filterValue: sectionConf.filterValue
    };
    return checkCondition(row, condition, globalConfig); // Use imported checkCondition
}


/**
* Renders the Summary View, including filtered sections and catch-all.
* Uses configuration specific to the tab.
* Resolves itemSortBy and cardIndicatorColumns using defaults from generalSettings if not specified in tab config.
* @param {object[]} filteredData The data rows already filtered for this tab.
* @param {object} tabConfig The configuration object for this specific summary tab.
* @param {object} globalConfig The global application configuration.
* @param {HTMLElement} targetElement The container element for this tab.
* @param {Function} showMessage Function to display messages.
*/
function renderSummaryView(filteredData, tabConfig, globalConfig, targetElement, showMessage) {
   if (!targetElement) { console.error("renderSummaryView: Target element not provided."); return; }
   targetElement.innerHTML = '';
   setMessagePlaceholder(tabConfig.id, '', false);
   targetElement.style.display = 'flex';
   targetElement.style.flexDirection = 'column';
   targetElement.style.gap = 'var(--gap-size, 15px)';

   const sectionsConfig = tabConfig.config?.sections;
   if (!sectionsConfig || !Array.isArray(sectionsConfig) || sectionsConfig.length === 0) {
        showMessage(`Summary tab "${tabConfig.title}" has no 'sections' configured.`, tabConfig.id);
        return;
   }
   if (!filteredData || filteredData.length === 0) {
       showMessage(`No data matches the filter criteria for tab "${tabConfig.title}".`, tabConfig.id);
       return;
   }

   const summaryGroupByCol = tabConfig.config?.groupByColumn;
   const internalLayoutConf = tabConfig.config?.internalLayout;
   const validHeaders = globalConfig.csvHeaders || [];
   let itemsProcessed = new Set();
   const isGroupingValid = summaryGroupByCol && validHeaders.includes(summaryGroupByCol);
   if (summaryGroupByCol && !isGroupingValid) { console.warn(`Summary tab "${tabConfig.title}": groupByColumn "${summaryGroupByCol}" is invalid.`); }

   // --- Helper createSection ---
   const createSection = (sectionConf, items) => {
       const sectionDiv = document.createElement('div');
       sectionDiv.className = 'summary-section';
       sectionDiv.id = `summary-section-${tabConfig.id}-${sectionConf.id || sectionConf.title.replace(/\s+/g, '-').toLowerCase()}`;
       if (sectionConf.bgColor) sectionDiv.style.backgroundColor = sectionConf.bgColor;
       if (sectionConf.textColor) sectionDiv.style.color = sectionConf.textColor;

       // Apply internal layout vars to section
       if (internalLayoutConf) {
            sectionDiv.style.setProperty('--summary-inner-min-col-width', internalLayoutConf.minColumnWidth || '260px');
            sectionDiv.style.setProperty('--summary-inner-column-gap', internalLayoutConf.columnGap || '15px');
            sectionDiv.style.setProperty('--summary-inner-item-gap', internalLayoutConf.itemGap || '10px');
       }

       const titleH3 = document.createElement('h3');
       titleH3.textContent = sectionConf.title || 'Section';
       sectionDiv.appendChild(titleH3);

       if (!Array.isArray(items)) { // Added safety check
            console.error(`createSection called with non-array items for section "${sectionConf.title}"`);
            const errorMsg = document.createElement('div'); errorMsg.className = 'empty-section-message'; errorMsg.style.color = 'red';
            errorMsg.textContent = `Error: Invalid data for section.`; sectionDiv.appendChild(errorMsg);
       } else if (items.length === 0) {
           const emptyMsg = document.createElement('div'); emptyMsg.className = 'empty-section-message';
           emptyMsg.textContent = `No items match criteria for this section.`; sectionDiv.appendChild(emptyMsg);
       } else {

           // --- *** UPDATED: Resolve sort & indicators BEFORE processing items *** ---
           // Resolve item sorting: Use tab-specific, fallback to global default, else null
           const effectiveItemSortBy = tabConfig.config?.itemSortBy ?? globalConfig.generalSettings?.defaultItemSortBy ?? null;
           let itemsToProcess = [...items]; // Work with a copy of items passed to the section

           // Apply sorting BEFORE grouping or rendering list items
           if (effectiveItemSortBy) {
               itemsToProcess = sortData(itemsToProcess, effectiveItemSortBy, globalConfig);
           }

           // Resolve indicators for card creation: Use tab-specific, fallback to global default, else empty array
           const effectiveCardIndicators = tabConfig.config?.cardIndicatorColumns ?? globalConfig.generalSettings?.defaultCardIndicatorColumns ?? [];

           // Create a config slice containing resolved indicators + other necessary card configs
           const cardCreationConfig = {
               ...tabConfig.config, // Copy other relevant config (like cardLinkColumn, cardTitleColumn if needed for cards)
               cardIndicatorColumns: effectiveCardIndicators // Use the resolved list
           };
            // --- *** END UPDATED *** ---


           // --- Render using itemsToProcess and cardCreationConfig ---
           if (isGroupingValid) {
               // --- Grouping Logic with Error Handling ---
               try {
                   const subGroupedData = itemsToProcess.reduce((acc, row) => {
                       if (!row || typeof row !== 'object') return acc;
                       const catValue = row[summaryGroupByCol] ?? 'Uncategorized';
                       const cat = Array.isArray(catValue) ? catValue.join(', ') : String(catValue);
                       if (!acc[cat]) acc[cat] = [];
                       acc[cat].push(row);
                       return acc;
                   }, {});

                   if (typeof subGroupedData !== 'object' || subGroupedData === null) {
                        throw new Error(`Sub-grouping resulted in non-object: ${JSON.stringify(subGroupedData)}`);
                   }
                   const sortedSubGroupKeys = Object.keys(subGroupedData).sort((a, b) => a.localeCompare(b)); // Simple alpha sort for sub-groups

                   const gridContainer = document.createElement('div'); gridContainer.className = 'summary-section-grid';
                   if (internalLayoutConf?.columnGap) gridContainer.style.gap = internalLayoutConf.columnGap;

                   // Pass the resolved cardCreationConfig down
                   renderGroupedItemsAsGrid(
                       gridContainer, subGroupedData,
                       cardCreationConfig, // Use resolved config for card indicators etc.
                       globalConfig,
                       'summary-card', 'summary-group-block', 'summary-group-column', 'h4',
                       sortedSubGroupKeys
                   );
                   sectionDiv.appendChild(gridContainer);
               } catch (groupingError) {
                    console.error(`Error grouping/rendering grid for section "${sectionConf.title}":`, groupingError);
                    const errorMsg = document.createElement('div'); errorMsg.className = 'empty-section-message'; errorMsg.style.color = 'red';
                    errorMsg.textContent = `Error displaying grouped items. Showing list. (${groupingError.message})`; sectionDiv.appendChild(errorMsg);
                    // Fallback to list
                    const listContainer = document.createElement('div'); listContainer.className = 'summary-section-list';
                    // Render list using itemsToProcess and cardCreationConfig
                    itemsToProcess.forEach(item => { listContainer.appendChild(createInitiativeCard(item, cardCreationConfig, globalConfig, 'summary-card')); });
                    sectionDiv.appendChild(listContainer);
               }
           } else {
               // Fallback list (no grouping)
                const listContainer = document.createElement('div'); listContainer.className = 'summary-section-list';
                // Render list using itemsToProcess and cardCreationConfig
                itemsToProcess.forEach(item => { listContainer.appendChild(createInitiativeCard(item, cardCreationConfig, globalConfig, 'summary-card')); });
                sectionDiv.appendChild(listContainer);
           }
       }
       targetElement.appendChild(sectionDiv);
   }; // --- End createSection ---

   // --- Pass 1: Render specific filter sections ---
   sectionsConfig.forEach((sectionConf) => {
       if (sectionConf.filterType === 'catchAll') return;
       // Use the specific checkSummarySectionFilter function
       const itemsMatchingSectionFilter = filteredData.filter(row =>
           checkSummarySectionFilter(row, sectionConf, globalConfig)
       );
       itemsMatchingSectionFilter.forEach(item => itemsProcessed.add(item));
       createSection(sectionConf, itemsMatchingSectionFilter);
   });

   // --- Pass 2: Render catchAll ---
    const catchAllSectionConf = sectionsConfig.find(s => s.filterType === 'catchAll');
    if (catchAllSectionConf) {
        const itemsForCatchAll = filteredData.filter(row => !itemsProcessed.has(row));
        createSection(catchAllSectionConf, itemsForCatchAll);
    }

   // --- Final message handling ---
    if (targetElement.querySelector('.summary-section')) {
        hideMessages(tabConfig.id);
    } else if (!filteredData || filteredData.length === 0) {
        // Message handled above
    } else {
        showMessage(`No items matched any summary section criteria for tab "${tabConfig.title}".`, tabConfig.id);
    }
}
// --- END OF FILE js/renderers/renderer-summary.js ---