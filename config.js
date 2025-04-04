// --- START OF FILE config.js ---

// Default Configuration for the Project Task Tracker Dashboard
let defaultConfig = {
  "configVersion": 2.0, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load
  "generalSettings": {
    "dashboardTitle": "Project Task Dashboard", // Title for this dashboard

    // URL to fetch the CSV data from.
    // Set to "./tasks.csv" to load the local file when using a web server.
    // Set to null to use the file upload button.
    "csvUrl": null, // Assumes tasks.csv is in the same directory & using local server

    "trueValues": [ // Standard true values
      "true", "TRUE", "yes", "y", "1", "✓", "x", "on"
    ],
    "csvDelimiter": ",",
    "multiValueColumns": [], // No multi-value columns in this specific task dataset

    // --- NEW ---
    // List of columns containing URLs that should be rendered as links
    "linkColumns": [
        "LinkToTask", // Keep existing one if desired
        "LinkToDocs", // Example: Add another link column
        "RelatedTicketURL" // Example: Add a third
        // Add any other column names containing URLs here
    ]

  },

  "viewSettings": {

    // --- Keep this if you want the *title* specifically linked ---
    // Set to null or remove if the title should not be linked itself.
    "cardLinkColumn": "LinkToTask", // e.g., Link card titles ONLY to the task detail URL

    "countsView": {
        "enabled": true,
        // Group counts by Project
        "groupByColumn": "Project",
        // Define specific things to count
        "counters": [
            {
                "column": "Status",
                "title": "Blocked Tasks",
                "filterType": "valueEquals",
                "filterValue": "Blocked",
                "display": { "type": "text", "value": "🚫 Blocked" }
            },
            {
                "column": "Status",
                "title": "In Progress Tasks",
                "filterType": "valueEquals",
                "filterValue": "In Progress",
                "display": { "type": "text", "value": "⏳ In Progress" }
            },
             {
                "column": "Status",
                "title": "Completed Tasks",
                "filterType": "valueEquals",
                "filterValue": "Complete",
                "display": { "type": "text", "value": "✅ Complete" }
            },
            {
                "column": "Priority",
                "title": "High Priority Tasks",
                "filterType": "valueEquals",
                "filterValue": "High",
                "display": { "type": "icon", "value": "🔥", "cssClass": "indicator-style-high-priority" }
            },
             {
                "column": "Priority",
                "title": "Medium Priority Tasks",
                "filterType": "valueEquals",
                "filterValue": "Medium",
                 "display": { "type": "icon", "value": "⬆️", "cssClass": "indicator-style-medium-priority" }
            }
            // Could add counters per Assignee if desired
        ]
     },

    "tableView": {
      "enabled": true,
      // Columns to display in the table
      "displayColumns": [
        "TaskName",
        "Project",
        "Assignee",
        "Status",
        "Priority",
        "DueDate",
        "EffortEst(h)",
        "LinkToTask", // Included here to show in table
        "LinkToDocs", // Make sure new link columns are in displayColumns
        "RelatedTicketURL"
      ]
    },

    "kanbanView": {
      "enabled": true,
      // --- CHOOSE ONE Kanban Grouping ---
      // "groupByColumn": "Status", // Option 1: Classic Kanban workflow view
      // "groupByColumn": "Assignee", // Option 2: View by who is doing what
      "groupByColumn": "Project", // Option 3: View tasks per project

      "cardTitleColumn": "TaskName",   // Main title on the card
      // Key indicators to show on each card
      // Make sure link columns are included here if you want link icons on cards
      "cardIndicatorColumns": [
          "Project",
          "Assignee",
          "Status",
          "Priority",
          "DueDate",
          "EffortEst(h)",
          "LinkToTask", // Include link columns for indicators
          "LinkToDocs",
          "RelatedTicketURL"
        ],
      "layout": { // Default layout settings are likely fine
        "maxItemsPerGroupInColumn": 4, // Allow slightly more stacking maybe
        "preventStackingAboveItemCount": 10,
        "minColumnWidth": "320px", // Slightly wider cards maybe
        "columnGap": "15px",
        "itemGap": "10px" // Slightly smaller gap between cards
      }
    },

    "summaryView": {
      "enabled": true,
      "groupByColumn": "Project", // Within sections, group by Project for context
      "internalLayout": {
          "minColumnWidth": "280px",
          "columnGap": "15px",
          "itemGap": "10px",
          "maxItemsPerGroupInColumn": 2 // Allow a bit of stacking
      },
      // Define summary sections for actionable insights
      // Note: Summary cards use createInitiativeCard, which uses kanbanView.cardIndicatorColumns
      // Ensure link columns are included there if you want links on summary cards.
      "sections": [
        {
          "id": "summary-blocked",
          "title": "🚫 Blocked Tasks",
          "filterColumn": "Status",
          "filterType": "valueEquals",
          "filterValue": "Blocked",
          "bgColor": "#f8d7da", // Light red background
          "textColor": "#58151c" // Dark red text
        },
        {
          "id": "summary-high-priority",
          "title": "🔥 High Priority (Not Complete)",
          "filterColumn": "Priority",
          "filterType": "valueEquals",
          "filterValue": "High",
          "bgColor": "#fff3cd", // Light yellow background
          "textColor": "#664d03" // Dark yellow text
          // Note: To *exclude* completed, you'd need a more complex filter or preprocess data
        },
         {
          "id": "summary-in-progress",
          "title": "⏳ In Progress Tasks",
          "filterColumn": "Status",
          "filterType": "valueEquals",
          "filterValue": "In Progress",
          "bgColor": "#cfe2ff", // Light blue background
          "textColor": "#0a367a" // Dark blue text
        },
        {
          "id": "summary-recently-completed", // Title might be adjusted based on data freshness
          "title": "✅ Completed Tasks",
          "filterColumn": "Status",
          "filterType": "valueEquals",
          "filterValue": "Complete",
          "bgColor": "#d1e7dd", // Light green background
          "textColor": "#0f5132" // Dark green text
        },
        { // Catch-all for tasks not fitting above (e.g., "Not Started")
             "id": "summary-other-tasks",
             "title": "Other Tasks (e.g., Not Started)",
             "filterColumn": null, // Must be null for catchAll
             "filterType": "catchAll",
             "bgColor": "#f5f5f5", // Light grey
             "textColor": "#333"
         }
      ],
      "layout": "stacked" // Sections stacked vertically
    },
    "notesView": {
      "enabled": true // Enable notes for project tracking
    }
  },

  "indicatorStyles": {
    // Define styles for columns used as indicators or in table/counts view

      "Project": {
        "type": "tag", "titlePrefix": "Project: ",
        "valueMap": {
          // Specific project colors (Examples)
          "Website Relaunch": { "bgColor": "#ddebf7", "textColor": "#2a5d8a" }, // Blue
          "Mobile App":       { "bgColor": "#e2f0d9", "textColor": "#537d3b" }, // Green
          "Marketing Campaign":{ "bgColor": "#fff0e6", "textColor": "#8a4c2a" }, // Orange
          "Infrastructure":   { "bgColor": "#ededed", "textColor": "#333" },    // Grey
          "default":          { "bgColor": "#f5f5f5", "textColor": "#555" }     // Default fallback
        }
      },
      "Assignee": {
        "type": "tag", "titlePrefix": "Assignee: ",
        "valueMap": {
          // Could add colors per assignee if desired
          "default": { "bgColor": "#fef4e5", "textColor": "#885f25" } // Soft gold/brown
        }
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
        "type": "tag", // Using tags for priority here, could switch to icons
        "titlePrefix": "Prio: ",
        "valueMap": {
          "High":   { "text":"🔥 High",   "bgColor": "#f8d7da", "textColor": "#58151c" }, // Red background for High Prio Tag
          "Medium": { "text":"⬆️ Medium", "bgColor": "#fff3cd", "textColor": "#664d03" }, // Yellow background for Medium
          "Low":    { "text":"⬇️ Low",    "bgColor": "#d1e7dd", "textColor": "#0f5132" }, // Green background for Low
          "default":{ "bgColor": "#eeeeee", "textColor": "#555" }
        }
        // --- OR using Icons ---
        // "type": "icon",
        // "valueMap": {
        //   "High":   { "value":"🔥", "cssClass": "indicator-style-high-priority", "title": "High Priority"},
        //   "Medium": { "value":"⬆️", "cssClass": "indicator-style-medium-priority", "title": "Medium Priority"},
        //   "Low":    { "value":"⬇️", "cssClass": "indicator-style-low-priority", "title": "Low Priority"},
        //   "default":{ "value":"❓", "title": "Unknown Priority"}
        // }
      },
      "DueDate": {
        "type": "tag", "titlePrefix": "Due: ",
        "valueMap": {
          // Could add logic here later to color-code based on proximity/overdue status
          "default": { "bgColor": "#e9ecef", "textColor": "#495057" } // Simple grey
        }
      },
       "EffortEst(h)": { // Estimated Effort in hours
           "type": "tag", "titlePrefix": "Est(h): ",
           "valueMap": {
               "default": { "bgColor": "#f7f7f7", "textColor": "#6c757d", "borderColor": "#dee2e6"} // Very light grey
           }
       },
      // --- Updated: Set link columns to 'none' here ---
      "LinkToTask": { "type": "none" }, // Handled by linkColumns logic
      "LinkToDocs": { "type": "none" }, // Handled by linkColumns logic
      "RelatedTicketURL": { "type": "none" } // Handled by linkColumns logic
  }
};
// --- END OF FILE config.js ---