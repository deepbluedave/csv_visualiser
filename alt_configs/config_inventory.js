// --- START OF FILE config.js ---

// Default Configuration for the Product Inventory Dashboard
let defaultConfig = {
  "configVersion": 1.10, // Incremented version
  "csvHeaders": [], // Auto-populated on CSV load
  "generalSettings": {
    "dashboardTitle": "Product Inventory Status", // Title for this dashboard

    // URL to fetch the CSV data from.
    // Set to "./inventory.csv" to load the local file when using a web server.
    // Set to null to use the file upload button.
    "csvUrl": null, // Assumes inventory.csv is in the same directory & using local server

    "trueValues": [ // Ensure these cover boolean values used in data
      "true", "TRUE", "yes", "y", "1", "✓", "x", "on"
    ],
    "csvDelimiter": ",",
    "multiValueColumns": [] // No multi-value columns in this dataset
  },

  "viewSettings": {

    "cardLinkColumn": "ProductURL", // Link card titles to the product detail URL

    "countsView": {
        "enabled": true,
        // Group counts by Supplier to see distribution
        "groupByColumn": "Supplier",
        // Define specific things to count
        "counters": [
            {
                "column": "Status",
                "title": "In Stock Items",
                "filterType": "valueEquals",
                "filterValue": "In Stock",
                "display": { "type": "text", "value": "✅ In Stock" }
            },
            {
                "column": "Status",
                "title": "Low Stock Items",
                "filterType": "valueEquals",
                "filterValue": "Low Stock",
                "display": { "type": "text", "value": "❗ Low Stock" }
            },
            {
                "column": "Status",
                "title": "Out of Stock Items",
                "filterType": "valueEquals",
                "filterValue": "Out of Stock",
                "display": { "type": "text", "value": "❌ Out of Stock" }
            },
            {
                "column": "Featured",
                "title": "Featured Products",
                "filterType": "booleanTrue",
                "display": { "type": "icon", "value": "🌟", "cssClass": "indicator-style-featured"}
            },
            { // Example: Count specific category
                 "column": "Category",
                 "title": "Widget Products",
                 "filterType": "valueEquals",
                 "filterValue": "Widgets",
                 "display": { "type": "text", "value": "Wdg"}
             }
        ]
     },

    "tableView": {
      "enabled": true,
      // Columns to display in the table
      "displayColumns": [
        "SKU",
        "ProductName",
        "Category",
        "Supplier",
        "Status",
        "StockLevel",
        "Price",
        "Featured",
        "LastOrderDate",
        "ProductURL" // Include link column
      ]
    },

    "kanbanView": {
      "enabled": true,
      // --- Kanban Grouping Options ---
      "groupByColumn": "Status", // Option 1: View by stock status (In Stock, Low, Out) - GOOD DEFAULT
      // "groupByColumn": "Category", // Option 2: View by product category
      // "groupByColumn": "Supplier", // Option 3: View by supplier

      "cardTitleColumn": "ProductName",   // Main title on the card
      // Key indicators to show on each card
      "cardIndicatorColumns": ["SKU", "Category", "Supplier", "StockLevel", "Price", "Featured"],
      "layout": { // Standard layout settings
        "maxItemsPerGroupInColumn": 4, // Adjust as needed
        "preventStackingAboveItemCount": 8,
        "minColumnWidth": "400px",
        "columnGap": "15px",
        "itemGap": "10px"
      }
    },

    "summaryView": {
      "enabled": true,
      "groupByColumn": "Category", // Within sections, group by Category
      "internalLayout": {
          "minColumnWidth": "280px",
          "columnGap": "15px",
          "itemGap": "10px",
          "maxItemsPerGroupInColumn": 3 // Allow some stacking within categories
      },
      // Define summary sections for actionable insights
      "sections": [
        {
          "id": "summary-low-stock",
          "title": "❗ Low Stock Items (Reorder Soon)",
          "filterColumn": "Status",
          "filterType": "valueEquals",
          "filterValue": "Low Stock",
          "bgColor": "#fff3cd", // Light yellow background
          "textColor": "#664d03" // Dark yellow text
        },
        {
          "id": "summary-out-of-stock",
          "title": "❌ Out of Stock Items (Urgent)",
          "filterColumn": "Status",
          "filterType": "valueEquals",
          "filterValue": "Out of Stock",
          "bgColor": "#f8d7da", // Light red background
          "textColor": "#58151c" // Dark red text
        },
        {
          "id": "summary-featured",
          "title": "🌟 Featured Products",
          "filterColumn": "Featured",
          "filterType": "booleanTrue",
          "bgColor": "#d1e7dd", // Light green background
          "textColor": "#0f5132" // Dark green text
        },
        { // Catch-all for items not fitting above (mostly "In Stock" but not featured)
             "id": "summary-in-stock",
             "title": "Other In Stock Items",
             "filterColumn": null, // Must be null for catchAll
             "filterType": "catchAll",
             "bgColor": "#f8f9fa", // Very light grey/white
             "textColor": "#333"
         }
      ],
      "layout": "stacked" // Sections stacked vertically
    },
    "notesView": {
      "enabled": false // Notes likely not needed for basic inventory view
    }
  },

  "indicatorStyles": {
    // Define styles for columns used as indicators or in table/counts view

      "SKU": {
          "type": "tag", "titlePrefix": "SKU: ",
          "valueMap": {
              "default": { "bgColor": "#f0f0f0", "textColor": "#555", "borderColor": "#ccc" } // Simple grey tag
          }
      },
      "Category": {
        "type": "tag", "titlePrefix": "Category: ",
        "valueMap": {
          // Example specific colors - add more as needed
          "Widgets":     { "bgColor": "#ddebf7", "textColor": "#2a5d8a" }, // Blue
          "Gadgets":     { "bgColor": "#e2f0d9", "textColor": "#537d3b" }, // Green
          "Tools":       { "bgColor": "#fff0e6", "textColor": "#8a4c2a" }, // Orange
          "Electronics": { "bgColor": "#ededed", "textColor": "#333" },    // Grey
          "default":     { "bgColor": "#f5f5f5", "textColor": "#555" }     // Default fallback
        }
      },
      "Supplier": {
        "type": "tag", "titlePrefix": "Supplier: ",
        "valueMap": {
          // Simple default style for supplier tags
          "default": { "bgColor": "#fef4e5", "textColor": "#885f25" } // Soft gold/brown
        }
      },
      "Status": { // Status tags with icons/colors
        "type": "tag", "titlePrefix": "Status: ",
        "valueMap": {
          "In Stock":    { "text":"✅ In Stock",    "bgColor": "#d1e7dd", "textColor": "#0f5132" },
          "Low Stock":   { "text":"❗ Low Stock",   "bgColor": "#fff3cd", "textColor": "#664d03" },
          "Out of Stock":{ "text":"❌ Out of Stock","bgColor": "#f8d7da", "textColor": "#58151c" },
          // Add other potential statuses like 'Discontinued', 'On Order' here if needed
          "default":     { "bgColor": "#eeeeee", "textColor": "#555" }
        }
      },
      "StockLevel": { // Simple tag for stock level number
          "type": "tag", "titlePrefix": "Stock: ",
          "valueMap": {
              "default": { "bgColor": "#e9ecef", "textColor": "#495057" } // Simple grey
          }
      },
       "Price": { // Simple tag for price
           "type": "tag", "titlePrefix": "Price: $", // Add currency symbol prefix
           "valueMap": {
               "default": { "bgColor": "#f7f7f7", "textColor": "#6c757d", "borderColor": "#dee2e6"} // Very light grey
           }
       },
      "Featured": { // Icon indicator for 'Featured' status
        "type": "icon",
        "trueCondition": { "value": "🌟", "cssClass": "indicator-style-featured", "title": "Featured Product" }
        // No style needed for false/empty - the icon simply won't appear
      },
      "LastOrderDate": {
        "type": "tag", "titlePrefix": "Last Order: ",
        "valueMap": {
          "default": { "bgColor": "#f3f0ff", "textColor": "#50447a"} // Soft purple
        }
      },
      "ProductURL": { // Ensure this column doesn't render a default tag
         "type": "none"
      }
  }
};
// --- END OF FILE config.js ---