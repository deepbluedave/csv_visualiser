// --- START OF FILE config.js ---

let defaultConfig = {
  "configVersion": 3.4, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load

  "generalSettings": {
    "dashboardTitle": "RA Security Initiative Tracker (v3 - Styled Sizes)", // Retain title
    "csvUrl": null,
    "trueValues": [
      "true", "TRUE", "yes", "y", "1", "✓", "x", "on"
    ],
    "csvDelimiter": ",",
    "multiValueColumns": ["Organization", "Size Variations"],
    "linkColumns": [
        "Instructions Link",
        "Tracking Link"
    ]
  },

  // Global styles for indicators (tags/icons) used across tabs
  "indicatorStyles": {
      // --- Boolean Icon Indicators (FIXED: Added valueMap to hide FALSE) ---
      "Elevated":   {
          "type": "icon",
          "trueCondition": { "value": "⭐", "cssClass": "indicator-style-boolean-true", "title": "Elevated: True"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false values
      },
      "Campaign":   {
          "type": "icon",
          "trueCondition": { "value": "📢", "cssClass": "indicator-style-boolean-true", "title": "Campaign: True"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} }
      },
      "Regulatory": {
          "type": "icon",
          "trueCondition": { "value": "⚖️", "cssClass": "indicator-style-boolean-true", "title": "Regulatory: True"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} }
       },
      "FURR":       {
          "type": "icon",
          "trueCondition": { "value": "🛡️", "cssClass": "indicator-style-boolean-true", "title": "FURR Applicable: True"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} }
      },
      "App Health": {
          "type": "icon",
          "trueCondition": { "value": "🩺", "cssClass": "indicator-style-boolean-true", "title": "App Health Related: True"},
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} }
       },
      "Baseline":   {
          "type": "icon",
          "trueCondition": { "value": "📈", "cssClass": "indicator-style-boolean-true", "title": "Baseline Related: True"}, // Corrected Icon
          "valueMap": { "false": {"value":""}, "FALSE": {"value":""}, "0": {"value":""}, "": {"value":""} } // Hide false
      },

      // --- Tag Indicators ---
      "Domain": { /* ... existing style ... */
        "type": "tag", "titlePrefix": "Domain: ",
        "valueMap": {
          "IAM":              { "bgColor": "#ddebf7", "textColor": "#2a5d8a" },
          "Vuln Management":  { "bgColor": "#f8d7da", "textColor": "#58151c" },
          "Data Security":    { "bgColor": "#e2f0d9", "textColor": "#537d3b" },
          "Incident Response":{ "bgColor": "#fff3cd", "textColor": "#664d03" },
          "Cloud Security":   { "bgColor": "#cfe2ff", "textColor": "#0a367a" },
          "Network Security": { "bgColor": "#ededed", "textColor": "#333" },
          "Awareness":        { "bgColor": "#fef4e5", "textColor": "#885f25" },
          "Logging & Monitoring": { "bgColor":"#e9ecef", "textColor": "#495057"},
          "default":          { "bgColor": "#f5f5f5", "textColor": "#555" }
        }
      },
      "Organization": { /* ... existing style ... */
        "type": "tag", "titlePrefix": "Org: ",
        "layout": "stacked", // Keep stacking
        "valueMap": {
          "InfoSec": { "bgColor": "#e9d8fd", "textColor": "#5e3a8c" },
          "CTO":     { "bgColor": "#d1e7dd", "textColor": "#0f5132" },
          "GI":      { "bgColor": "#fef4e5", "textColor": "#885f25" },
          "AppDev":  { "bgColor": "#cfe2ff", "textColor": "#0a367a"},
          "default": { "bgColor": "#eeeeee", "textColor": "#555" }
        }
      },
      "T-Size": { // Main default size - STYLED BY SIZE
          "type": "tag", "titlePrefix": "Default Size: ",
          "valueMap": {
              "XL": { "text": "📏 XL", "bgColor": "#dc3545", "textColor": "#ffffff", "title":"Size: Extra Large" }, // Red
              "L":  { "text": "📏 L",  "bgColor": "#ffc107", "textColor": "#343a40", "title":"Size: Large" }, // Yellow
              "M":  { "text": "📏 M",  "bgColor": "#17a2b8", "textColor": "#ffffff", "title":"Size: Medium" }, // Cyan
              "S":  { "text": "📏 S",  "bgColor": "#28a745", "textColor": "#ffffff", "title":"Size: Small" }, // Green
              "":   { "text": "➖ N/A", "bgColor": "#f8f9fa", "textColor": "#6c757d", "title":"Size: N/A" }, // Grey
              "default": { "bgColor": "#eeeeee", "textColor": "#555" }
          }
      },
      "Size Variations": {
           "type": "tag",
           "layout": "stacked", // Keep stacking
           "titlePrefix": "Specific Size: ",
           // --- NEW STRUCTURE: Using styleRules instead of valueMap ---
           "styleRules": [
               // Rule 1: Match anything ending in :XL (case-insensitive flag 'i' might be useful if needed)
               {
                   "matchType": "regex",
                   "pattern": ":XL$", // Regex: Ends with :XL
                   "style": { "bgColor": "#dc3545", "textColor": "#ffffff" } // Red style
               },
               // Rule 2: Match anything ending in :L
               {
                   "matchType": "regex",
                   "pattern": ":L$", // Regex: Ends with :L
                   "style": { "bgColor": "#ffc107", "textColor": "#343a40" } // Yellow style
               },
               // Rule 3: Match anything ending in :M
               {
                   "matchType": "regex",
                   "pattern": ":M$", // Regex: Ends with :M
                   "style": { "bgColor": "#17a2b8", "textColor": "#ffffff" } // Cyan style
               },
               // Rule 4: Match anything ending in :S
               {
                   "matchType": "regex",
                   "pattern": ":S$", // Regex: Ends with :S
                   "style": { "bgColor": "#28a745", "textColor": "#ffffff" } // Green style
               }
               // Add more specific rules here if needed, e.g., exact matches for specific cases
               // {
               //   "matchType": "exact",
               //   "value": "Jane Doe:TBC",
               //   "style": { "bgColor": "#6c757d", "textColor": "#ffffff" }
               // }
           ],
           // --- Fallback style if NO rules match ---
           "defaultStyle": {
               "bgColor": "#e9ecef",       // Neutral background
               "textColor": "#495057",       // Dark grey text
               "borderColor": "#ced4da"    // Subtle border
           }
           // --- REMOVE the old valueMap section ---
           // "valueMap": { ... HARD-CODED LIST REMOVED ... }
       },
      "RA Reporting Approach": { /* ... existing style ... */
           "type": "tag", "titlePrefix": "Report: ",
           "valueMap": {
               "Deck":      { "text":"📊 Deck",      "bgColor": "#ddebf7", "textColor": "#2a5d8a" },
               "Dashboard": { "text":"📈 Dashboard", "bgColor": "#e2f0d9", "textColor": "#537d3b" },
               "Optional":  { "text":"❓ Optional",  "bgColor": "#fef4e5", "textColor": "#885f25" },
               "":          { "text":"➖ N/A",       "bgColor": "#f8f9fa", "textColor": "#495057" },
               "default":   { "bgColor": "#eeeeee", "textColor": "#555" }
           }
      },
      "Status": { /* ... existing style ... */
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": {
          "Started":  { "text":"⏳ Started",   "bgColor": "#cfe2ff", "textColor": "#0a367a" },
          "Complete": { "text":"✅ Complete",  "bgColor": "#d1e7dd", "textColor": "#0f5132" },
          "N/A":      { "text":"➖ N/A",       "bgColor": "#f8f9fa", "textColor": "#495057" },
          "":         { "text":"⚪ Not Set",   "bgColor": "#f8f9fa", "textColor": "#495057" },
          "default":  { "bgColor": "#eeeeee", "textColor": "#555" }
        }
      },
      "Deadline": { /* ... existing style ... */
          "type": "tag", "titlePrefix": "Due: ",
          "valueMap": { "default": { "bgColor": "#e9ecef", "textColor": "#495057" } }
      },
      "TLT": { /* ... existing style ... */
           "type": "tag", "titlePrefix": "TLT: ",
           "valueMap": { "default": { "bgColor": "#fff0e6", "textColor": "#8a4c2a" } }
       },

      // --- Columns to display as plain text (or handled by linkColumns) ---
      "Title": { "type": "none" },
      "BURR": { "type": "none" },
      "Metrics": { "type": "none" },
      "Standards": { "type": "none" },
      "RA Action": { "type": "none" },
      "Instructions Link": { "type": "none" },
      "Tracking Link": { "type": "none" }
  },

  // --- Tab Definitions ---
  // Tabs remain the same - config already includes T-Size and Size Variations
  "tabs": [
    // --- Tab 1: Basic Table View (All Initiatives) ---
    {
      "id": "all-initiatives-table",
      "title": "All Initiatives",
      "type": "table",
      "enabled": true,
      "filter": null,
      "config": {
        "displayColumns": [
          "Title", "Domain", "Organization", "TLT", "Status", "Deadline",
          "T-Size", "Size Variations",
          "Elevated", "Campaign", "Regulatory", "FURR", "App Health", "Baseline",
          "RA Reporting Approach", "RA Action",
          "Instructions Link", "Tracking Link",
          "BURR"
        ],
        "columnWidths": {
            "default": "100px", "Title": "250px", "Domain": "130px", "Organization": "150px",
            "TLT": "120px", "Status": "100px", "Deadline": "100px", "T-Size": "80px",
            "Size Variations": "120px", "RA Action": "250px", "Elevated": "50px",
            "Campaign": "50px", "Regulatory": "50px", "FURR": "50px", "App Health": "50px",
            "Baseline": "50px", "RA Reporting Approach": "120px", "Instructions Link": "50px",
            "Tracking Link": "50px"
        },
        "headerOrientations": {
            "default": "vertical", "Title": "horizontal", "Domain": "horizontal",
            "Organization": "horizontal", "RA Action": "horizontal", "Size Variations": "horizontal"
        }
      }
    },

    // --- Tab 2: Kanban View by Status (Active Items) ---
    {
      "id": "kanban-by-status-active",
      "title": "Active (Status)",
      "type": "kanban",
      "enabled": true,
       "filter": {
          "logic": "AND",
          "conditions": [
              { "column": "Status", "filterType": "valueIsNot", "filterValue": "Complete" },
              { "column": "Status", "filterType": "valueIsNot", "filterValue": "N/A" },
              { "column": "Status", "filterType": "valueNotEmpty" }
          ]
       },
      "config": {
        "groupByColumn": "Status",
        "cardTitleColumn": "Title",
        "cardIndicatorColumns": [
            "Domain", "Organization", "TLT", "Deadline",
            "T-Size", "Size Variations",
            "Elevated", "Campaign", "Regulatory",
            "Tracking Link"
        ],
        "cardLinkColumn": "Tracking Link",
        "layout": {
            "minColumnWidth": "320px", "columnGap": "15px", "itemGap": "10px"
        }
      }
    },

    // --- Tab 3: Kanban View by TLT ---
    {
      "id": "kanban-by-tlt",
      "title": "By TLT",
      "type": "kanban",
      "enabled": true,
      "filter": null,
      "config": {
        "groupByColumn": "TLT",
        "cardTitleColumn": "Title",
        "cardIndicatorColumns": [
            "Domain", "Status", "Deadline", "Organization",
            "T-Size", "Size Variations",
            "Elevated", "Regulatory", "Tracking Link"
        ],
        "cardLinkColumn": "Tracking Link",
        "layout": {
             "minColumnWidth": "350px", "columnGap": "12px", "itemGap": "8px"
        }
      }
    },

    // --- Tab 4: Summary View for High Visibility Initiatives ---
    {
        "id": "high-visibility-summary",
        "title": "❗ High Visibility",
        "type": "summary",
        "enabled": true,
        "filter": {
            "logic": "OR",
            "conditions": [
                { "column": "Elevated", "filterType": "booleanTrue" },
                { "column": "Regulatory", "filterType": "booleanTrue" },
                { "column": "Campaign", "filterType": "booleanTrue" }
            ]
        },
        "config": {
            "groupByColumn": "Domain",
            "cardIndicatorColumns": [
                "Organization", "TLT", "Status", "Deadline",
                "T-Size", "Size Variations",
                "Elevated", "Campaign", "Regulatory",
                "Tracking Link"
            ],
            "internalLayout": {
                "minColumnWidth": "400px", "columnGap": "15px", "itemGap": "10px"
            },
            "cardLinkColumn": "Tracking Link",
            "sections": [
                 { "id": "summary-elevated", "title": "⭐ Elevated Initiatives", "filterColumn": "Elevated", "filterType": "booleanTrue", "bgColor": "#fff3cd", "textColor": "#664d03" },
                 { "id": "summary-regulatory", "title": "⚖️ Regulatory Initiatives", "filterColumn": "Regulatory", "filterType": "booleanTrue", "bgColor": "#cfe2ff", "textColor": "#0a367a" },
                 { "id": "summary-campaign", "title": "📢 Campaign Initiatives", "filterColumn": "Campaign", "filterType": "booleanTrue", "bgColor": "#f8d7da", "textColor": "#58151c" },
                 { "id": "summary-other-high-vis", "title": "Other High Visibility (Passed Tab Filter)", "filterColumn": null, "filterType": "catchAll", "bgColor": "#f5f5f5", "textColor": "#333" }
            ]
        }
    }
  ]
};
// --- END OF FILE config.js ---