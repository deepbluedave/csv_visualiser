// --- START OF FILE js/config-loader.js ---

/**
 * Applies the dashboard title from the configuration to the document and H1 tag.
 * Uses global config.
 * @param {object} config The global application configuration object.
 * @param {HTMLElement} mainHeading The H1 element.
 */
 function applyCustomTitle(config, mainHeading) {
    const titleText = config?.generalSettings?.dashboardTitle || 'CSV Dashboard';
    document.title = titleText;
    if (mainHeading) {
        mainHeading.textContent = titleText;
    } else {
        console.warn("applyCustomTitle: Could not find H1 element to update.");
    }
}

/**
 * Applies dynamic CSS styles based on the configuration (e.g., layout dimensions).
 * Iterates through tabs to apply specific layout styles to tab content containers.
 * @param {object} config The global application configuration object.
 */
 function applyConfigStyles(config) {
    try {
        // Iterate through tabs to apply specific layout styles if needed
        config.tabs?.forEach(tab => {
            if (tab.enabled === false) return; // Skip disabled tabs

            const tabContentElement = document.getElementById(`tab-content-${tab.id}`);
            if (!tabContentElement) return; // Skip if element doesn't exist yet

            // Apply Kanban layout styles from tab config
            if (tab.type === 'kanban' && tab.config?.layout) {
                const layout = tab.config.layout;
                // Set CSS variables scoped to the specific tab container
                tabContentElement.style.setProperty('--kanban-min-col-width', layout.minColumnWidth || '280px');
                tabContentElement.style.setProperty('--kanban-gap', layout.columnGap || '15px');
                tabContentElement.style.setProperty('--kanban-item-gap', layout.itemGap || '12px');
            }

            // Apply Summary internal layout styles from tab config
            if (tab.type === 'summary' && tab.config?.internalLayout) {
                const layout = tab.config.internalLayout;
                // Set CSS variables scoped to the specific tab container (or section if needed)
                tabContentElement.style.setProperty('--summary-inner-min-col-width', layout.minColumnWidth || '260px');
                tabContentElement.style.setProperty('--summary-inner-column-gap', layout.columnGap || '15px');
                tabContentElement.style.setProperty('--summary-inner-item-gap', layout.itemGap || '10px');
            }
            // Apply Counts layout styles (if any defined in future)
            // if (tab.type === 'counts' && tab.config?.layout) { ... }
        });
    } catch (e) {
        console.error("Error applying config styles:", e);
    }
}

// --- END OF FILE js/config-loader.js ---