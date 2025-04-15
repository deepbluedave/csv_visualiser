// --- START OF FILE config.js ---

let defaultConfig = {
  "configVersion": 8.1, // Incremented version for tracking changes
  "csvHeaders": [], // Auto-populated

  "generalSettings": {
    "dashboardTitle": "InfoSec Exception Tracker",
    "csvUrl": null, // Load infosec_exceptions.csv via upload
    "trueValues": [ "true", "TRUE", "yes", "y", "1", "✓", "x", "on" ],
    "csvDelimiter": ",",
    "multiValueColumns": [ /* "Mitigating Controls Summary" could be if detailed */ ],
    "linkColumns": [ "Link" ],

    // --- ADDED: Default settings for cards/items ---
    "defaultCardIndicatorColumns": [ // Common indicators for Kanban/Summary cards
         "Application Name",
         "Risk Level",
         "Standard Excepted",
         "Renewal Date",
         "Owner",
         "Link"
    ],
    "defaultItemSortBy": [ // Common sort order within Kanban/Summary groups
      { "column": "Risk Level", "direction": "custom", "order": ["Elevated", "High", "Medium", "Low"] },
      { "column": "Renewal Date", "direction": "asc" }
    ]
    // --- END ADDED ---
  },

  "indicatorStyles": {
      // --- Tags --- (Existing styles remain the same)
      "Risk Level": {
        "type": "tag", "titlePrefix": "Risk: ",
        "valueMap": {
          "Elevated": { "text":"🔥 Elevated", "bgColor": "#6f1d1b", "textColor": "#ffffff" }, // Dark Red
          "High":     { "text":"🔴 High",     "bgColor": "#dc3545", "textColor": "#ffffff" }, // Red
          "Medium":   { "text":"🟠 Medium",   "bgColor": "#fd7e14", "textColor": "#ffffff" }, // Orange
          "Low":      { "text":"🟡 Low",      "bgColor": "#ffc107", "textColor": "#343a40" }, // Yellow
          "default":  { "bgColor": "#adb5bd", "textColor": "#ffffff" } // Grey
        }
      },
      "Status": {
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": { // Intentionally ordered for potential custom sort
          "Pending Renewal":{ "text":"⏳ Pending",  "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow
          "Active":         { "text":"🟢 Active",   "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Mitigated":      { "text":"✅ Mitigated","bgColor": "#d4edda", "textColor": "#155724" }, // Green (Exception resolved)
          "Expired":        { "text":"⚪ Expired",  "bgColor": "#6c757d", "textColor": "#ffffff" }, // Grey
          "default":        { "bgColor": "#e9ecef", "textColor": "#495057" }
        }
      },
      "Standard Excepted": {
        "type": "tag", "titlePrefix": "Std: ",
        "styleRules": [ // Use rules for more flexibility
            { "matchType": "regex", "pattern": "SEC-IAM", "style": { "bgColor": "#ddebf7", "textColor": "#2a5d8a"} }, // IAM = Blue
            { "matchType": "regex", "pattern": "SEC-NET", "style": { "bgColor": "#fce8f3", "textColor": "#8f2c5f"} }, // Network = Pink
            { "matchType": "regex", "pattern": "SEC-WEB", "style": { "bgColor": "#e2f0d9", "textColor": "#537d3b"} }, // Web = Green
            { "matchType": "regex", "pattern": "SEC-VULN", "style": { "bgColor": "#f8d7da", "textColor": "#58151c"} }, // Vuln = Red
            { "matchType": "regex", "pattern": "SEC-CRYPTO", "style": { "bgColor": "#e9d8fd", "textColor": "#5e3a8c"} }, // Crypto = Purple
            { "matchType": "regex", "pattern": "SEC-DATA", "style": { "bgColor": "#fff0e6", "textColor": "#8a4c2a"} }, // Data = Orange
            { "matchType": "regex", "pattern": "SEC-DEV", "style": { "bgColor": "#d1ecf1", "textColor": "#0c5460"} }, // Dev = Cyan
            { "matchType": "regex", "pattern": "SEC-LOG", "style": { "bgColor": "#fef4e5", "textColor": "#885f25"} }  // Logging = Sandy
         ],
        "defaultStyle": { "bgColor": "#e9ecef", "textColor": "#495057" }
      },
       "Owner": {
        "type": "tag", "titlePrefix": "Owner: ",
        "valueMap": { "default": { "bgColor": "#dee2e6", "textColor": "#495057" } }
      },
      "Approver": {
        "type": "tag", "titlePrefix": "Approver: ",
        "valueMap": { "default": { "bgColor": "#d4edda", "textColor": "#155724" } }
      },
      "Origination Date": {
          "type": "tag", "titlePrefix": "From: ",
          "valueMap": { "default": { "bgColor": "#f8f9fa", "textColor": "#6c757d" } }
      },
      "Renewal Date": {
          "type": "tag", "titlePrefix": "Until: ",
          "valueMap": { "default": { "bgColor": "#fff3cd", "textColor": "#664d03", "borderColor": "#ffc107" } } // Highlight renewal date slightly
      },

      //Used just for icon/key generation where tags are used

      "Risk Level Icon": { // Use a distinct key name if Risk Level is already a tag
        "type": "icon",
        "valueMap": {
              "Elevated": { "value": "🔥", "title": "Risk: Elevated" },
              "High":     { "value": "🔴", "title": "Risk: High" },
              "Medium":   { "value": "🟠", "title": "Risk: Medium" },
              "Low":      { "value": "🟡", "title": "Risk: Low" }
              // No default needed if you only want these specific ones in the key
        }
     },
     // --- Similarly for Status icons if desired ---
      "Status Icon": {
           "type": "icon",
           "valueMap": {
                "Pending Renewal":{ "value":"⏳", "title":"Status: Pending Renewal" },
                "Active":         { "value":"🟢", "title":"Status: Active" }, // Using a simple green circle example
                "Mitigated":      { "value":"✅", "title":"Status: Mitigated"},
                "Expired":        { "value":"⚪", "title":"Status: Expired" }
           }
      },      

      // --- Columns to display as plain text or handled by linkColumns ---
      "ExceptionID": { "type": "none" },
      "Application Name": { "type": "none" },
      "Exception Title": { "type": "none" },
      "Justification Summary": { "type": "none" },
      "Mitigating Controls Summary": { "type": "none" },
      "Link": { "type": "none" } // Handled by linkColumns
  },

  // --- Tab Definitions ---
  "tabs": [
    // --- Tab 1: Master List (All Exceptions) ---
    {
      "id": "master-list",
      "title": "📚 All Exceptions",
      "type": "table", // No cardIndicatorColumns or itemSortBy used here
      "enabled": true,
      "filter": null,
      "config": {
        "displayColumns": [
           "Application Name", "Exception Title", "Standard Excepted", "Risk Level", "Status", "Renewal Date", "Owner", "Approver", "Link"
        ],
        "columnWidths": {
            "default": "120px", "Application Name": "180px", "Exception Title": "250px", "Standard Excepted": "150px",
            "Risk Level": "90px", "Status": "110px", "Renewal Date": "100px", "Owner": "100px", "Approver": "100px", "Link": "50px"
        },
        "headerOrientations": {
            "default": "vertical", "Application Name": "horizontal", "Exception Title": "horizontal", "Standard Excepted": "horizontal"
        },
        "sortBy": [ // Table sort is different from itemSortBy, keep this
            { "column": "Renewal Date", "direction": "asc" },
            { "column": "Risk Level", "direction": "custom", "order": ["Elevated", "High", "Medium", "Low"] },
            { "column": "Application Name", "direction": "asc" }
        ]
      }
    },

    // --- Tab 2: Kanban by Status (Uses Defaults) ---
    {
      "id": "kanban-status",
      "title": "📊 Status Board",
      "type": "kanban",
      "enabled": true,
      "filter": null,
      "config": {
        "groupByColumn": "Status",
        "groupSortBy": ["Pending Renewal", "Active", "Mitigated", "Expired"], // Logical workflow order
        "cardTitleColumn": "Exception Title",
        // "cardIndicatorColumns": [...] // REMOVED - Uses generalSettings.defaultCardIndicatorColumns
        "cardLinkColumn": "Link",
        // "itemSortBy": [...] // REMOVED - Uses generalSettings.defaultItemSortBy
        "layout": { "minColumnWidth": "320px", "columnGap": "15px", "itemGap": "10px" }
      }
    },

    // --- Tab 3: Kanban by Risk Level (Overrides Indicators, Uses Default Sort) ---
    {
      "id": "kanban-risk",
      "title": "🔥 By Risk Level",
      "type": "kanban",
      "enabled": true,
      "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueInList", "filterValue": ["Active", "Pending Renewal"] }] }, // Only show active/pending risk
      "config": {
        "groupByColumn": "Risk Level",
        "groupSortBy": ["Elevated", "High", "Medium", "Low"], // Custom risk order
        "cardTitleColumn": "Exception Title",
        "cardIndicatorColumns": [ // <<<< OVERRIDE: Keeping this specific list because it includes 'Status'
            "Application Name",
            "Status", // Include Status on the card for this view
            "Standard Excepted",
            "Renewal Date",
            "Owner",
            "Link"
        ],
        "cardLinkColumn": "Link",
        "itemSortBy": [ // <<<< OVERRIDE: Sorting only by Renewal Date here, not Risk Level
             { "column": "Renewal Date", "direction": "asc" }
        ],
        "layout": { "minColumnWidth": "340px", "columnGap": "12px", "itemGap": "8px" }
      }
    },

    // --- Tab 4: Kanban by Application (Overrides Sort, Uses Default Indicators) ---
    {
      "id": "kanban-app",
      "title": "💻 By Application",
      "type": "kanban",
      "enabled": true,
      "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueInList", "filterValue": ["Active", "Pending Renewal"] }] }, // Only show active/pending exceptions
      "config": {
        "groupByColumn": "Application Name",
        "groupSortBy": "keyAsc", // Sort applications alphabetically
        "cardTitleColumn": "Exception Title",
        // "cardIndicatorColumns": [...] // REMOVED - Uses generalSettings.defaultCardIndicatorColumns
        "cardLinkColumn": "Link",
        "itemSortBy": [ // <<<< OVERRIDE: Different sort order for this view
             { "column": "Risk Level", "direction": "custom", "order": ["Elevated", "High", "Medium", "Low"] },
             { "column": "Renewal Date", "direction": "asc" }
        ],
        "layout": { "minColumnWidth": "360px", "columnGap": "12px", "itemGap": "8px", "maxItemsPerGroupInColumn": 5, "preventStackingAboveItemCount": 10 }
      }
    },

     // --- Tab 5: Pending/Expired Review Table ---
    {
        "id": "review-needed",
        "title": "⏳ Review Needed",
        "type": "table", // No cardIndicatorColumns or itemSortBy used here
        "enabled": true,
        "bgColor": "#fff3cd", "textColor": "#664d03", // Yellowish tab
        "filter": {
            "logic": "OR", // Show if either Pending or Expired
            "conditions": [
                { "column": "Status", "filterType": "valueEquals", "filterValue": "Pending Renewal" },
                { "column": "Status", "filterType": "valueEquals", "filterValue": "Expired" }
            ]
        },
        "config": {
          "displayColumns": [ "Renewal Date", "Status", "Application Name", "Exception Title", "Risk Level", "Owner", "Link", "Justification Summary", "Mitigating Controls Summary" ],
          "columnWidths": { "Renewal Date": "100px", "Status": "110px", "Application Name": "150px", "Exception Title": "200px", "Risk Level": "90px", "Owner":"100px", "Link":"50px", "Justification Summary":"250px", "Mitigating Controls Summary":"250px" },
          "headerOrientations": { "default": "horizontal" },
          "sortBy": [ // Table sort is different from itemSortBy, keep this
                { "column": "Renewal Date", "direction": "asc" }
           ]
        }
    },

     // --- Tab 6: Risk Level Counts per Application ---
    {
        "id": "risk-counts-per-app",
        "title": "📈 Risk Counts",
        "type": "counts", // No cardIndicatorColumns or itemSortBy used here
        "enabled": true,
        "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueInList", "filterValue": ["Active", "Pending Renewal"] }] }, // Count only active/pending risks
        "config": {
            "groupByColumn": "Application Name", // Group by application
            "counters": [ // Count each risk level
                { "title": "Risk", "column": "Risk Level", "filterType": "countAllValues" },
                { "title": "Status", "column": "Status", "filterType": "countAllValues" },
                { "title": "Owner", "column": "Owner", "filterType": "countAllValues" },
                { "title": "Renewal Date", "column": "Renewal Date", "filterType": "countAllValues" }
            ]
        }
    },
    // Add other view types (Summary, etc.) applying the same logic:
    // Remove cardIndicatorColumns and itemSortBy if they match the defaults in generalSettings.
    // --- Tab 7: Summary Overview ---
    {
      "id": "summary-overview",
      "title": "👀 Exception Overview",
      "type": "summary",
      "enabled": true,
      "filter": null, // Start by showing all exceptions, sections will filter further
      "config": {
          "groupByColumn": "Application Name", // Group items within sections by App Name
          "cardLinkColumn": "Link",            // Link card titles to the exception link
          "cardTitleColumn": "Exception Title",
          // "cardIndicatorColumns": [...] // REMOVED - Will use generalSettings.defaultCardIndicatorColumns
          // "itemSortBy": [...]         // REMOVED - Will use generalSettings.defaultItemSortBy (sorts data *before* section filtering)
          "internalLayout": { // Optional: Adjust grid layout *inside* sections
              "minColumnWidth": "380px",
              "columnGap": "15px",
              "itemGap": "10px"
              // "maxItemsPerGroupInColumn": 3 // Example if needed
          },
          "sections": [
               // Order sections by priority of attention needed
               {
                 "id": "summary-expired",
                 "title": "💀 Expired (Needs Archival/Closure)",
                 "filterColumn": "Status",
                 "filterType": "valueEquals",
                 "filterValue": "Expired",
                 "bgColor": "#6c757d", // Grey background
                 "textColor": "#ffffff"  // White text
               },
               {
                 "id": "summary-pending",
                 "title": "⏳ Pending Renewal",
                 "filterColumn": "Status",
                 "filterType": "valueEquals",
                 "filterValue": "Pending Renewal",
                 "bgColor": "#fff3cd", // Yellow background
                 "textColor": "#664d03"  // Dark yellow text
               },
               {
                 "id": "summary-high-risk", // Includes Active/Pending/etc. that are High/Elevated
                 "title": "🔥 High/Elevated Risk (All Statuses)",
                 "filterColumn": "Risk Level",
                 "filterType": "valueInList",
                 "filterValue": ["High", "Elevated"],
                 "bgColor": "#f8d7da", // Light Red background
                 "textColor": "#58151c"  // Dark Red text
               },
               {
                 "id": "summary-medium-risk", // Includes Active/Pending/etc. that are Medium
                 "title": "🟠 Medium Risk (All Statuses)",
                 "filterColumn": "Risk Level",
                 "filterType": "valueEquals",
                 "filterValue": "Medium",
                 "bgColor": "#fff0e6", // Light Orange background
                 "textColor": "#8a4c2a"  // Dark Orange text
               },
               // Catch-all for remaining items (e.g., Low Risk Active/Pending, Mitigated)
               {
                 "id": "summary-other",
                 "title": "⚪ Other (Low Risk Active/Pending, Mitigated, etc.)",
                 "filterColumn": null, // Must be null for catchAll
                 "filterType": "catchAll",
                 "bgColor": "#f8f9fa", // Very Light Grey background
                 "textColor": "#6c757d"  // Grey text
               }
          ]
      }
  }

  ]
};
// --- END OF FILE config.js ---