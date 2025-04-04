// --- START OF FILE config.js ---

// Default Configuration for the Car Showcase Dashboard
let defaultConfig = {
  "configVersion": 1.8, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load
  "generalSettings": {
    "dashboardTitle": "Car Showcase Dashboard", // New Title

    // URL to fetch the CSV data from.
    // Set to "./cars.csv" to load the local file when using a web server.
    // Set to null to use the file upload button.
    "csvUrl": null, // Assumes cars.csv is in the same directory and you use a local server

    "trueValues": [ // Covers "TRUE", "yes", "y" used in the sample data
      "true", "TRUE", "yes", "y", "1", "✓", "x", "on"
    ],
    "csvDelimiter": ",",
    "multiValueColumns": [] // No multi-value columns in this dataset
  },

  "viewSettings": {

    "cardLinkColumn": "Website", // Link card titles to the car's website

    "countsView": {
        "enabled": true,
        // Group counts by Manufacturer
        "groupByColumn": "Make",
        // Define specific things to count
        "counters": [
            {
                "column": "Featured",
                "title": "Featured Models",
                "filterType": "booleanTrue",
                "display": { "type": "icon", "value": "🌟", "cssClass": "indicator-style-featured" }
            },
            {
                "column": "Rating",
                "title": "High Rated",
                "filterType": "valueEquals",
                "filterValue": "High",
                "display": { "type": "text", "value": "👍" }
            },
            {
                "column": "FuelType",
                "title": "Electric Vehicles",
                "filterType": "valueEquals",
                "filterValue": "Electric",
                "display": { "type": "text", "value": "⚡" }
            },
             {
                "column": "FuelType",
                "title": "Hybrid Vehicles",
                "filterType": "valueEquals",
                "filterValue": "Hybrid",
                "display": { "type": "text", "value": "♻️" }
            },
            {
                "column": "Type",
                "title": "SUVs",
                "filterType": "valueEquals",
                "filterValue": "SUV",
                "display": { "type": "text", "value": "SUV" }
            },
            {
                 "column": "Type",
                 "title": "Trucks",
                 "filterType": "valueEquals",
                 "filterValue": "Truck",
                 "display": { "type": "text", "value": "TRK" }
             }
        ]
     },

    "tableView": {
      "enabled": true,
      // Display columns relevant to cars, in order
      "displayColumns": [
        "Model",
        "Make",
        "Year",
        "Type",
        "FuelType",
        "Engine",
        "Rating",
        "Featured",
        "Website" // Include link column
      ]
    },

    "kanbanView": {
      "enabled": true,
      "groupByColumn": "Type",      // Group cards by body style (SUV, Sedan, etc.)
      "cardTitleColumn": "Model",   // Main title on the card
      // Key indicators to show on each card
      "cardIndicatorColumns": ["Make", "Year", "FuelType", "Rating", "Featured"],
      "layout": { // Default layout settings are likely fine
        "maxItemsPerGroupInColumn": 3,
        "preventStackingAboveItemCount": 8,
        "minColumnWidth": "300px",
        "columnGap": "15px",
        "itemGap": "12px"
      }
    },

    "summaryView": {
      "enabled": true,
      "groupByColumn": "Make", // Within sections, group by Manufacturer
      "internalLayout": {
          "minColumnWidth": "280px",
          "columnGap": "15px",
          "itemGap": "10px",
          "maxItemsPerGroupInColumn": 2 // Allow a bit of stacking in summary
      },
      // Define summary sections
      "sections": [
        {
          "id": "summary-featured",
          "title": "🌟 Featured Models",
          "filterColumn": "Featured",
          "filterType": "booleanTrue",
          "bgColor": "#fffbe6", // Light yellow
          "textColor": "#333"
        },
        {
          "id": "summary-electric-hybrid",
          "title": "⚡ Electric & Hybrid",
          "filterColumn": "FuelType",
          "filterType": "valueInList",
          "filterValue": ["Electric", "Hybrid"],
          "bgColor": "#e6f7f1", // Light green
          "textColor": "#333"
        },
        {
          "id": "summary-high-rated",
          "title": "👍 High Rated Models",
          "filterColumn": "Rating",
          "filterType": "valueEquals",
          "filterValue": "High",
          "bgColor": "#e6f0ff", // Light blue
          "textColor": "#333"
        },
        { // Catch-all for remaining cars
             "id": "summary-other-cars",
             "title": "Other Models",
             "filterColumn": null, // Must be null for catchAll
             "filterType": "catchAll",
             "bgColor": "#f5f5f5", // Light grey
             "textColor": "#333"
         }
      ],
      "layout": "stacked" // Sections stacked vertically
    },
    "notesView": {
      "enabled": false // Keep notes disabled for this example
    }
  },

  "indicatorStyles": {
    // Define styles for columns used as indicators or in table/counts view

      "Make": {
        "type": "tag", "titlePrefix": "Make: ",
        "valueMap": {
          // Could add specific colors per make, but default is fine for now
          "default": { "bgColor": "#ddebf7", "textColor": "#2a5d8a" } // Soft blue
        }
      },
      "Year": {
        "type": "tag", "titlePrefix": "Year: ",
        "valueMap": {
          "default": { "bgColor": "#e2f0d9", "textColor": "#537d3b" } // Soft green
        }
      },
       "Engine": { // Added style for Engine tag in table view
           "type": "tag", "titlePrefix": "Engine: ",
           "valueMap": {
               "default": { "bgColor": "#fdeceb", "textColor": "#9c4139" } // Soft red/brown
           }
       },
      "FuelType": {
        "type": "tag", "titlePrefix": "Fuel: ",
        "valueMap": {
          "Electric": { "text": "⚡ Electric", "bgColor": "#d3f9d8", "textColor": "#2f6f4f" },
          "Hybrid": { "text": "♻️ Hybrid", "bgColor": "#e6f7f1", "textColor": "#00524a" },
          "Gasoline": { "text": "⛽ Gas", "bgColor": "#fff0e6", "textColor": "#8a4c2a" },
          "Diesel": { "text": "⛽ Diesel", "bgColor": "#ededed", "textColor": "#333" }, // Example for Diesel if added later
          "default": { "bgColor": "#eeeeee", "textColor": "#555555" } // Fallback
        }
      },
      "Rating": {
        "type": "tag", "titlePrefix": "Rating: ",
        "valueMap": {
          "High": { "text": "👍 High", "bgColor": "#cfe2ff", "textColor": "#0a367a" },
          "Medium": { "text": "😐 Medium", "bgColor": "#fff3cd", "textColor": "#664d03" },
          "Low": { "text": "👎 Low", "bgColor": "#f8d7da", "textColor": "#58151c" },
          "default": { "bgColor": "#eeeeee", "textColor": "#555555" }
        }
      },
      "Featured": { // Icon indicator for 'Featured' status
        "type": "icon",
        "trueCondition": { "value": "🌟", "cssClass": "indicator-style-featured", "title": "Featured Model" }
        // No specific style needed for false/empty
      },
      "Website": { // No specific indicator style needed, handled by table/card link logic
         "type": "none" // Explicitly disable default tag rendering if desired
      }
  }
};
// --- END OF FILE config.js ---