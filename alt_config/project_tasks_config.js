// --- START OF FILE config.js ---

// Default Configuration for the Project Task Tracker Dashboard
let defaultConfig = {
  "configVersion": 3.0, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load
  "generalSettings": {
    "dashboardTitle": "Dynamic Project Task Dashboard", // Updated title
    "csvUrl": null, // Use null for file upload, or "./project_tasks.csv" for local URL
    "trueValues": [
      "true", "TRUE", "yes", "y", "1", "✓", "x", "on"
    ],
    "csvDelimiter": ",",
    "multiValueColumns": ["Project"], // Keep multi-value example
    "linkColumns": [ // Global setting for columns that are always links
        "LinkToTask",
        "LinkToDocs",
        "RelatedTicketURL"
    ]
  },

  // Global styles for indicators (tags/icons) used across tabs
  "indicatorStyles": {
      "Project": {
        "type": "tag", "titlePrefix": "Project: ",
        "valueMap": {
          "Website Relaunch": { "bgColor": "#ddebf7", "textColor": "#2a5d8a" },
          "Mobile App":       { "bgColor": "#e2f0d9", "textColor": "#537d3b" },
          "Marketing Campaign":{ "bgColor": "#fff0e6", "textColor": "#8a4c2a" },
          "Infrastructure":   { "bgColor": "#ededed", "textColor": "#333" },
          "default":          { "bgColor": "#f5f5f5", "textColor": "#555" }
        }
      },
      "Assignee": {
        "type": "tag", "titlePrefix": "Assignee: ",
        "valueMap": { "default": { "bgColor": "#fef4e5", "textColor": "#885f25" } }
      },
      "Status": {
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": {
          "Not Started":{ "text":"⚪ Not Started", "bgColor": "#f8f9fa", "textColor": "#495057" },
          "In Progress":{ "text":"⏳ In Progress", "bgColor": "#cfe2ff", "textColor": "#0a367a" },
          "Blocked":    { "text":"🚫 Blocked",     "bgColor": "#f8d7da", "textColor": "#58151c" },
          "Complete":   { "text":"✅ Complete",    "bgColor": "#d1e7dd", "textColor": "#0f5132" },
          "default":    { "bgColor": "#eeeeee", "textColor": "#555" }
        }
      },
      "Priority": {
        "type": "tag", "titlePrefix": "Prio: ",
        "valueMap": {
          "High":   { "text":"🔥 High",   "bgColor": "#f8d7da", "textColor": "#58151c" },
          "Medium": { "text":"⬆️ Medium", "bgColor": "#fff3cd", "textColor": "#664d03" },
          "Low":    { "text":"⬇️ Low",    "bgColor": "#d1e7dd", "textColor": "#0f5132" },
          "default":{ "bgColor": "#eeeeee", "textColor": "#555" }
        }
      },
      "DueDate": {
        "type": "tag", "titlePrefix": "Due: ",
        "valueMap": { "default": { "bgColor": "#e9ecef", "textColor": "#495057" } }
      },
       "EffortEst(h)": {
           "type": "tag", "titlePrefix": "Est(h): ",
           "valueMap": { "default": { "bgColor": "#f7f7f7", "textColor": "#6c757d", "borderColor": "#dee2e6"} }
       },
      // Link columns are handled globally, set type to 'none' here
      "LinkToTask": { "type": "none" },
      "LinkToDocs": { "type": "none" },
      "RelatedTicketURL": { "type": "none" }
  },

  // Tab definitions
  "tabs": [
    // --- Tab 1: Basic Table View (All Tasks) ---
    {
      "id": "all-tasks-table", // Unique ID for this tab
      "title": "All Tasks", // Text on the tab button
      "type": "table",       // Renderer to use
      "enabled": true,       // Show this tab
      "filter": null,        // No filter - show all data rows
      "config": {            // Configuration specific to this table tab
        "displayColumns": [
          "TaskName", "Project", "Assignee", "Status", "Priority", "DueDate", "EffortEst(h)", "LinkToTask", "LinkToDocs"
        ],
        "columnWidths": { // Optional: Specify widths
            "default": "auto",      // Default width if not specified
            "TaskName": "350px",    // Specific width for TaskName
            "Assignee": "150px",
            "Project": "180px",
            "Status": "120px",
            "Priority": "100px",
            "DueDate": "100px",
            "EffortEst(h)": "80px",
            "LinkToTask": "60px",
            "LinkToDocs": "60px"
        },
        "headerOrientations": { // Optional: Specify header orientation
            "default": "vertical", // Most headers vertical by default
            "TaskName": "horizontal", // Override specific columns
            "Project": "horizontal",
            "Assignee": "vertical"
        }
      }
    },

    {
      "id": "all-tasks-table-status-only", // Unique ID for this tab
      "title": "All Tasks Status Table", // Text on the tab button
      "type": "table",       // Renderer to use
      "enabled": true,       // Show this tab
      "filter": null,        // No filter - show all data rows
      "config": {            // Configuration specific to this table tab
        "displayColumns": [
          "TaskName", "Status"
        ],
        "columnWidths": { // Optional: Specify widths
            "default": "auto",      // Default width if not specified
            "TaskName": "250px",    // Specific width for TaskName
            "Status": "80px"
        },
        "headerOrientations": { // Optional: Specify header orientation
            "default": "vertical", // Most headers vertical by default
            "TaskName": "horizontal" // Override specific columns
        }
      }
    },

    // --- Tab 2: Kanban View by Status (Active Tasks Only) ---
    {
      "id": "kanban-by-status-active",
      "title": "Active (Status)",
      "type": "kanban",
      "enabled": true,
      "filter": { // Filter configuration for this tab
         "logic": "AND", // Combine conditions with AND
         "conditions": [
             // Condition 1: Status is NOT 'Complete'
             { "column": "Status", "filterType": "valueIsNot", "filterValue": "Complete" },
             // Condition 2: Status is NOT 'Not Started' (Example of multiple conditions)
              { "column": "Status", "filterType": "valueIsNot", "filterValue": "Not Started" }
         ]
      },
      "config": { // Configuration specific to this kanban tab
        "groupByColumn": "Status",
        "cardTitleColumn": "TaskName",
        "cardIndicatorColumns": ["Project", "Assignee", "Priority", "DueDate", "EffortEst(h)", "LinkToTask"],
        "cardLinkColumn": "LinkToTask", // Make card titles clickable using this column's URL
        "layout": { // Kanban layout settings
            "maxItemsPerGroupInColumn": 5,
            "preventStackingAboveItemCount": 10,
            "minColumnWidth": "300px", // Slightly narrower columns maybe
            "columnGap": "15px",
            "itemGap": "10px"
        }
      }
    },

    // --- Tab 3: Kanban View by Assignee (All Tasks) ---
    {
      "id": "kanban-by-assignee",
      "title": "By Assignee",
      "type": "kanban",
      "enabled": true,
      "filter": null, // No filter for this tab
      "config": {
        "groupByColumn": "Assignee",
        "cardTitleColumn": "TaskName",
        "cardIndicatorColumns": ["Project", "Status", "Priority", "DueDate"],
        "cardLinkColumn": null, // Card titles will not be links here
        "layout": {
            "maxItemsPerGroupInColumn": 3,
            "preventStackingAboveItemCount": 8,
            "minColumnWidth": "400px",
            "columnGap": "12px",
            "itemGap": "8px"
         }
      }
    },

    // --- Tab 4: Summary View for High Priority or Blocked Tasks ---
    {
        "id": "high-priority-summary",
        "title": "❗ Priority Focus",
        "type": "summary",
        "enabled": true,
        "filter": { // Filter data BEFORE it reaches the summary sections
            "logic": "OR",
            "conditions": [
                { "column": "Priority", "filterType": "valueEquals", "filterValue": "High" },
                { "column": "Status", "filterType": "valueEquals", "filterValue": "Blocked" }
            ]
        },
        "config": {
            "groupByColumn": "Project", // Group items within sections by Project
            "internalLayout": { // Layout for groups WITHIN summary sections
                "minColumnWidth": "400px",
                "columnGap": "15px",
                "itemGap": "10px",
                "maxItemsPerGroupInColumn": 2
            },
            "cardLinkColumn": "LinkToTask", // Link cards in this summary view
            "sections": [ // Sections operate on the ALREADY FILTERED data (High Prio or Blocked)
                 {
                   "id": "summary-blocked-filtered", // Unique ID for section
                   "title": "🚫 Blocked Tasks (from Filtered Set)",
                   "filterColumn": "Status", // Column for SECTION filter
                   "filterType": "valueEquals", // Type for SECTION filter
                   "filterValue": "Blocked",    // Value for SECTION filter
                   "bgColor": "#f8d7da", "textColor": "#58151c"
                 },
                 {
                   "id": "summary-highprio-filtered",
                   "title": "🔥 High Priority Tasks (from Filtered Set)",
                   "filterColumn": "Priority", // Column for SECTION filter
                   "filterType": "valueEquals",
                   "filterValue": "High",
                   "bgColor": "#fff3cd", "textColor": "#664d03"
                 },
                 // Catch-all for items that passed the main TAB filter but NOT the section filters above
                 {
                   "id": "summary-other-filtered",
                   "title": "Other Focused Items (Passed Tab Filter)",
                   "filterColumn": null, // Must be null for catchAll
                   "filterType": "catchAll",
                   "bgColor": "#f5f5f5", "textColor": "#333"
                 }
            ]
        }
    },

    // --- Tab 5: Counts View ---
    {
        "id": "project-counts",
        "title": "Counts",
        "type": "counts",
        "enabled": true,
        "filter": null, // Count across all data
        "config": {
            "groupByColumn": "Project", // Group counts primarily by Project
            "counters": [ // Define what to count
                {
                    "column": "Status", "title": "Blocked Tasks",
                    "filterType": "valueEquals", "filterValue": "Blocked",
                    "display": { "type": "text", "value": "🚫 Blocked" }
                },
                {
                    "column": "Status", "title": "In Progress Tasks",
                    "filterType": "valueEquals", "filterValue": "In Progress",
                    "display": { "type": "text", "value": "⏳ In Progress" }
                },
                 {
                    "column": "Status", "title": "Completed Tasks",
                    "filterType": "valueEquals", "filterValue": "Complete",
                    "display": { "type": "text", "value": "✅ Complete" }
                },
                {
                    "column": "Priority", "title": "High Priority Tasks",
                    "filterType": "valueEquals", "filterValue": "High",
                    "display": { "type": "icon", "value": "🔥", "cssClass": "indicator-style-high-priority" }
                },
                 {
                    "column": "Priority", "title": "Medium Priority Tasks",
                    "filterType": "valueEquals", "filterValue": "Medium",
                     "display": { "type": "icon", "value": "⬆️", "cssClass": "indicator-style-medium-priority" }
                }
            ]
        }
    }
    // Add more tab definitions here as needed
  ]
};
// --- END OF FILE config.js ---