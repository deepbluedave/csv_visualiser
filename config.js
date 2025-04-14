// --- START OF FILE config.js ---

let defaultConfig = {
  "configVersion": 8.0, // Version for InfoSec Exceptions
  "csvHeaders": [], // Auto-populated

  "generalSettings": {
    "dashboardTitle": "InfoSec Exception Tracker",
    "csvUrl": null, // Load infosec_exceptions.csv via upload
    "trueValues": [ "true", "TRUE", "yes", "y", "1", "✓", "x", "on" ],
    "csvDelimiter": ",",
    "multiValueColumns": [ /* "Mitigating Controls Summary" could be if detailed */ ],
    "linkColumns": [ "Link" ]
  },

  "indicatorStyles": {
      // --- Tags ---
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
          "Active":         { "text":"엑 Active",   "bgColor": "#cfe2ff", "textColor": "#0a367a" }, // Blue
          "Mitigated":      { "text":"✅ Mitigated","bgColor": "#d4edda", "textColor": "#155724" }, // Green (Exception resolved)
          "Expired":        { "text":"⚪ Expired",  "bgColor": "#6c757d", "textColor": "#ffffff" }, // Grey
          // Could add "Rejected" status if needed
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
      "type": "table",
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
        "sortBy": [ // Default sort: show soonest renewals first
            { "column": "Renewal Date", "direction": "asc" },
            { "column": "Risk Level", "direction": "custom", "order": ["Elevated", "High", "Medium", "Low"] }, // Secondary sort by risk
            { "column": "Application Name", "direction": "asc" }
        ]
      }
    },

    // --- Tab 2: Kanban by Status ---
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
        "cardIndicatorColumns": [ "Application Name", "Risk Level", "Standard Excepted", "Renewal Date", "Owner", "Link" ],
        "cardLinkColumn": "Link",
        "itemSortBy": [ // Within each status, sort by renewal date
             { "column": "Renewal Date", "direction": "asc" },
             { "column": "Risk Level", "direction": "custom", "order": ["Elevated", "High", "Medium", "Low"] }
        ],
        "layout": { "minColumnWidth": "320px", "columnGap": "15px", "itemGap": "10px" }
      }
    },

    // --- Tab 3: Kanban by Risk Level ---
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
        "cardIndicatorColumns": [ "Application Name", "Status", "Standard Excepted", "Renewal Date", "Owner", "Link" ],
        "cardLinkColumn": "Link",
        "itemSortBy": [
             { "column": "Renewal Date", "direction": "asc" }
        ],
        "layout": { "minColumnWidth": "340px", "columnGap": "12px", "itemGap": "8px" }
      }
    },

    // --- Tab 4: Kanban by Application ---
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
        "cardIndicatorColumns": [ "Risk Level", "Status", "Standard Excepted", "Renewal Date", "Owner", "Link" ],
        "cardLinkColumn": "Link",
        "itemSortBy": [ // Sort by risk, then renewal within each app
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
        "type": "table",
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
          "sortBy": [ // Show oldest first
                { "column": "Renewal Date", "direction": "asc" }
           ]
        }
    },

     // --- Tab 6: Risk Level Counts per Application ---
    {
        "id": "risk-counts-per-app",
        "title": "📈 Risk Counts",
        "type": "counts",
        "enabled": true,
        "filter": { "logic": "AND", "conditions": [{"column": "Status", "filterType": "valueInList", "filterValue": ["Active", "Pending Renewal"] }] }, // Count only active/pending risks
        "config": {
            "groupByColumn": "Application Name", // Group by application
            "counters": [ // Count each risk level
                { "title": "Elevated Risk", "column": "Risk Level", "filterType": "valueEquals", "filterValue": "Elevated", "display": { "type": "icon", "value": "🔥"} },
                { "title": "High Risk", "column": "Risk Level", "filterType": "valueEquals", "filterValue": "High", "display": { "type": "icon", "value": "🔴"} },
                { "title": "Medium Risk", "column": "Risk Level", "filterType": "valueEquals", "filterValue": "Medium", "display": { "type": "icon", "value": "🟠"} },
                { "title": "Low Risk", "column": "Risk Level", "filterType": "valueEquals", "filterValue": "Low", "display": { "type": "icon", "value": "🟡"} }
            ]
        }
    }
  ]
};
// --- END OF FILE config.js ---