// --- START OF FILE editor_config_fantasy_world_atlas.js ---

window.editorConfig = {
    "editorSchemaVersion": 1.0,

    // --- NEW: Optional URLs for pre-loading ---
    "preloadUrls": {
        "viewerConfigUrl": "../alt_config/fantasy_world_atlas.js", // Example: Relative path or full URL
        "csvDataUrl": "../sample_data/edited_data_20250603_205554.csv",      // Example: Relative path or full URL
        // Note: editor_config.js itself is always loaded manually first.
        "cumulativeLogUrl": "../sample_data/changelog.txt" // Optional: URL to a plain text file containing historical changelog.
    },

    csvDataFileName: "fantasy_world_atlas", // Name of the CSV file to be edited
    cumulativeLogName: "fantasy_world_atlas_changelog", // Name of the changelog file, if used

    "changeTrackingPrimaryKeyColumn": "Entry Name", // Or "TaskID", "ExceptionID", etc.

    "csvOutputOptions": {
        "delimiter": ",",
        "booleanTrueValue": "TRUE",
        "booleanFalseValue": "FALSE" // Editor will show blank for this, but export "FALSE"
    },

    // --- NEW SECTION for Editor Display Settings ---
    "editorDisplaySettings": {
        "partitionBy": {
            "enabled": true, // Set to true to activate this feature
            "filter": {
                "logic": "OR", // Example: items are partitioned if Status is Finalized OR Art Needed is false
                "conditions": [
                    { "column": "Status", "filterType": "valueEquals", "filterValue": "Finalized" },
                    // Example of another condition for partitioning:
                    // { "column": "Art Needed", "filterType": "booleanFalse" } 
                ]
            },
            "separatorStyle": "heavyLine" // Options: "heavyLine", "none" (more can be added later)
        },

        "displayFilters": [
            {
                "id": "show-all",        // Unique ID for this filter
                "label": "Show All",     // Text displayed in the dropdown
                "isDefault": true,       // This filter will be selected by default
                "criteria": null         // null criteria means no filtering (show all rows)
            },
            {
                "id": "masters-only",
                "label": "Show Masters Only (No Parent)",
                "criteria": {
                    "logic": "AND", // Typically one condition for this type of filter
                    "conditions": [
                        // Assuming "Parent Entry" is the column name you'd use for parent links
                        // If your column is named differently, update "Parent Entry" here.
                        { "column": "Parent Entry", "filterType": "valueIsEmpty" }
                    ]
                }
            },
            {
                "id": "children-only",
                "label": "Show Sub-Items Only (Has Parent)",
                "criteria": {
                    "logic": "AND",
                    "conditions": [
                        { "column": "Parent Entry", "filterType": "valueNotEmpty" }
                    ]
                }
            },
            // Example of another custom filter:
            {
                "id": "high-priority-drafts",
                "label": "High Priority Drafts",
                "criteria": {
                    "logic": "AND",
                    "conditions": [
                        { "column": "Status", "filterType": "valueEquals", "filterValue": "Draft In Progress" },
                        // Assuming a 'Priority' column exists in your CSV and editor config columns
                        // { "column": "Priority", "filterType": "valueEquals", "filterValue": "High" }
                        // For the fantasy_world_atlas, 'Complexity/Size' might be more relevant than 'Priority'
                        { "column": "Complexity/Size", "filterType": "valueEquals", "filterValue": "XL" }
                    ]
                }
            },
            {
                "id": "art-needed",
                "label": "Entries Needing Art",
                "criteria": {
                    "logic": "AND",
                    "conditions": [
                        { "column": "Art Needed", "filterType": "booleanTrue" }
                    ]
                }
            }
        ]
    },

    "columns": [
        {
            "name": "Entry Name",
            "label": "Entry Name",
            "type": "text",
            "required": true,
            "columnWidth": "350px"
        },
        {
            "name": "Description",
            "label": "Description",
            "type": "textarea",
            "displayAsSingleLine": true,
            "required": true,
            "columnWidth": "150px"
        },

        {
            "name": "Region",
            "label": "Region",
            "type": "select", // Single select dropdown/popup
            "required": false,
            "optionsSource": "viewerConfigValueMap", // Derives from viewer_config.indicatorStyles.Region.valueMap
            // "options": [], // Can be empty if fully derived, or add more/override here
            "viewerStyleColumnName": "Region", // For live tag preview in cell
            "columnWidth": "180px"
        },
        {
            "name": "Entry Type",
            "label": "Entry Type",
            "type": "select",
            "required": true,
            "optionsSource": "text", // Derives from viewer_config.indicatorStyles["Entry Type"].valueMap
            "viewerStyleColumnName": "Entry Type",
            "columnWidth": "180px"
        },
        {
            "name": "Parent Entry",
            "label": "Parent Entry",
            "type": "select", // Allows selecting multiple parent entries
            "deriveOptionsFromColumn": "Entry Name", // The key change
            "required": false,
            "options": [""], // Derives from viewer_config.indicatorStyles["Entry Type"].valueMap
            "columnWidth": "180px"
        },
        {
            "name": "Status",
            "label": "Status",
            "type": "select",
            "required": false,
            "optionsSource": "viewerConfigValueMap", // Derives from viewer_config.indicatorStyles.Status.valueMap
            "viewerStyleColumnName": "Status",
            "columnWidth": "160px"
        },
        {
            "name": "Primary Author",
            "label": "Primary Author",
            "type": "select",
            "required": false,
            "optionsSource": "viewerConfigValueMap", // Derives from viewer_config.indicatorStyles["Primary Author"].valueMap
            "viewerStyleColumnName": "Primary Author",
            "columnWidth": "150px"
        },
        {
            "name": "Tags/Keywords",
            "label": "Tags/Keywords",
            "type": "multi-select",
            "required": false,
            "options": [ // Some common predefined tags, user can add more
                "Magic", "Ancient", "Trade Hub", "Royal Court", "Hidden", "Cursed", "Political"
            ],
            "allowNewTags": true,
            "viewerStyleColumnName": "Tags/Keywords", // To use viewer's default tag style
            "columnWidth": "80px"
        },
        {
            "name": "Related Entries",
            "label": "Related Entries",
            "type": "multi-select",
            "required": false,
            "options": ["Ancient Ruins", "Mythical Creatures", "Lost Artifacts"], // Example
            "allowNewTags": true, // Assuming these can be free-form references or new entries
            "viewerStyleColumnName": "Related Entries",
            "columnWidth": "220px"
        },
        {
            "name": "Complexity/Size",
            "label": "Complexity/Size",
            "type": "select",
            "required": false,
            "optionsSource": "viewerConfigValueMap", // Derives from viewer_config.indicatorStyles["Complexity/Size"].valueMap
            "viewerStyleColumnName": "Complexity/Size",
            "columnWidth": "60px",
            "orientation": "vertical" // <<<< ADD THIS LINE
        },
        {
            "name": "Art Needed",
            "label": "Art Needed?",
            "type": "checkbox",
            "required": false,
            // "viewerStyleColumnName": "Art Needed" // Implied, for icon display
            "columnWidth": "60px",
            "orientation": "vertical" // <<<< ADD THIS LINE
        },
        {
            "name": "Plot Hook Included",
            "label": "Plot Hook?",
            "type": "checkbox",
            "required": false,
            // "viewerStyleColumnName": "Plot Hook Included" // Implied, for icon display
            "columnWidth": "60px",
            "orientation": "vertical" // <<<< ADD THIS LINE
        },
        {
            "name": "Draft Date",
            "label": "Draft Date",
            "type": "date",
            "required": false,
            "viewerStyleColumnName": "Draft Date", // For tag styling if defined in viewer
            "columnWidth": "100px"
        },
        {
            "name": "Wiki Link",
            "label": "Wiki Link",
            "type": "text", // Could be enhanced to 'url' type with validation later
            "required": false,
            "columnWidth": "150px"
        },
        {
            "name": "Inspiration Link",
            "label": "Inspiration Link",
            "type": "text", // Could be enhanced to 'url' type with validation later
            "required": false,
            "columnWidth": "150px"
        }
        // Example of a purely numeric field if you add one to your CSV:
        // {
        //   "name": "WordCount",
        //   "label": "Word Count",
        //   "type": "number",
        //   "required": false,
        //   "columnWidth": "100px"
        // }
    ]
};

// --- END OF FILE editor_config_fantasy_world_atlas.js ---