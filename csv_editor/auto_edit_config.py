import json
import csv
import argparse
import re
from collections import Counter
import datetime
from pathlib import Path # Ensure this is at the top

# Simplified JS config parsing
def parse_js_config_object_str(js_content, var_name="defaultConfig"):
    """
    Attempts to extract a JavaScript object assigned to a variable.
    This is a simplified parser and might not handle all JS complexities.
    """
    # Regex to find 'let varName = {', 'var varName = {', 'window.varName = {', or 'varName = {'
    # Make var_name part of the regex construction to be safe
    regex_pattern = rf"(?:let|var|window\.)?\s*{re.escape(var_name)}\s*=\s*({{)" # Group 1 captures the opening brace
    match = re.search(regex_pattern, js_content, re.DOTALL)
    
    start_index = -1

    if match:
        start_index = match.start(1) # Start of the first '{' of the object literal
        print(f"Found explicit assignment for '{var_name}'. Object starts at index {start_index}.")
    else:
        # If specific assignment not found, try to find a generic start of an object
        # This is less reliable.
        print(f"Warning: Could not find explicit assignment for '{var_name}'. Attempting generic object parse.")
        # Look for the first '{' that seems to start an object (e.g., followed by a quoted key)
        # This is still heuristic.
        generic_match = re.search(r"(\{\s*['\"]\w+['\"]\s*:)", js_content) 
        if generic_match:
            first_brace_index = js_content.find('{', generic_match.start()) # find '{' at or after generic_match start
            if first_brace_index != -1:
                 print(f"Falling back to first plausible '{{' found at index {first_brace_index} as potential object start.")
                 start_index = first_brace_index
            else: # Should not happen if generic_match succeeded
                print(f"Warning: Could not find start of '{var_name} = {{' or any generic object start.")
                return None
        else:
            print(f"Warning: Could not find start of '{var_name} = {{' or any plausible generic object start.")
            return None

    # Find the matching closing brace for the object starting at start_index
    brace_level = 0
    end_index = -1
    for i, char in enumerate(js_content[start_index:]):
        if char == '{':
            brace_level += 1
        elif char == '}':
            brace_level -= 1
            if brace_level == 0:
                end_index = start_index + i + 1
                break
    
    if end_index == -1:
        print(f"Warning: Could not find matching closing brace for object starting at index {start_index}.")
        return None

    object_str = js_content[start_index:end_index]
    
    # Basic cleaning for JSON compatibility:
    # 1. Remove single-line comments // ... (within the extracted object string)
    object_str = re.sub(r"//.*?\n", "\n", object_str)
    # 2. Remove multi-line comments /* ... */ (within the extracted object string)
    object_str = re.sub(r"/\*.*?\*/", "", object_str, flags=re.DOTALL)
    # 3. Remove trailing commas in objects and arrays (e.g., {a:1,} or [1,2,])
    object_str = re.sub(r",\s*([}\]])", r"\1", object_str)
    # 4. Ensure all keys are double-quoted (JS allows unquoted or single-quoted)
    # This regex is improved but might still have issues with complex nested structures or comments near keys.
    object_str = re.sub(r"([{,\s])\s*([a-zA-Z0-9_]+)\s*:", r'\1"\2":', object_str) # Unquoted keys
    object_str = re.sub(r"([{,\s])\s*'([^']+)'\s*:", r'\1"\2":', object_str)     # Single-quoted keys
    
    try:
        return json.loads(object_str)
    except json.JSONDecodeError as e:
        print(f"Error decoding extracted JS object string as JSON for '{var_name}': {e}")
        print("Problematic string part (first 500 chars):\n", object_str[:500])
        # print("\nFull extracted object string for debugging:\n", object_str) # Uncomment for full debug
        return None

def infer_column_type_from_data(column_data, viewer_true_values):
    if not column_data: return "text"
    true_vals_lower = {str(v).lower() for v in viewer_true_values}
    false_vals_lower = {"false", "no", "0", ""}
    booleans, numbers, dates, texts, max_commas, non_empty_count = 0, 0, 0, 0, 0, 0

    for item_original_case in column_data:
        item_str = str(item_original_case).strip() if item_original_case is not None else ""
        if item_str != "": non_empty_count +=1
        item_lower = item_str.lower()
        if item_lower in true_vals_lower or item_lower in false_vals_lower: booleans += 1
        try:
            if item_str: float(item_str); numbers += 1
        except ValueError: pass
        try:
            if item_str:
                if re.match(r"^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?$", item_str):
                    datetime.datetime.fromisoformat(item_str.replace('Z', '+00:00')); dates += 1
                elif re.match(r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$", item_str): dates += 1 # Basic check
        except ValueError: pass
        max_commas = max(max_commas, item_str.count(','))
        if item_str: texts += 1
    
    if non_empty_count == 0: return "text"
    if booleans / non_empty_count > 0.8: return "checkbox"
    if dates / non_empty_count > 0.7: return "date"
    if numbers / non_empty_count > 0.8: return "number"
    if max_commas > 0 and (max_commas / non_empty_count > 0.15 or texts / non_empty_count < 0.6) : return "multi-select"
    if texts / non_empty_count > 0.5 and any(len(s) > 60 for s in column_data if s): return "textarea"
    return "text"

def generate_editor_config(viewer_config_filepath_str, csv_filepath_str, output_filepath_str):
    viewer_config = {} # Initialize as empty dict
    viewer_config_name = "N/A"
    if viewer_config_filepath_str:
        viewer_config_path = Path(viewer_config_filepath_str)
        viewer_config_name = viewer_config_path.name
        try:
            with open(viewer_config_path, 'r', encoding='utf-8') as f: content = f.read()
            parsed_vc = parse_js_config_object_str(content, "defaultConfig")
            if parsed_vc: viewer_config = parsed_vc; print(f"Successfully parsed viewer config: {viewer_config_path}")
            else: print(f"Warning: Failed to parse viewer config from {viewer_config_path}. Proceeding without it.")
        except Exception as e: print(f"Warning: Could not read viewer config '{viewer_config_path}': {e}")
    else: print("No viewer config path provided. Proceeding without viewer config.")

    csv_path = Path(csv_filepath_str)
    output_path = Path(output_filepath_str)

    dashboard_title = viewer_config.get("generalSettings", {}).get("dashboardTitle", "CSV Data")
    indicator_styles = viewer_config.get("indicatorStyles", {})
    viewer_multival_cols = viewer_config.get("generalSettings", {}).get("multiValueColumns", [])
    viewer_true_values = viewer_config.get("generalSettings", {}).get("trueValues", ["true", "yes", "1", "on", "✓", "x"])

    headers = []
    sample_data_by_column = {}
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            headers = next(reader)
            for header_val in headers: sample_data_by_column[header_val] = []
            for i, row in enumerate(reader):
                if i >= 100: break
                if len(row) == len(headers):
                    for j, cell_value in enumerate(row): sample_data_by_column[headers[j]].append(cell_value)
        print(f"Successfully read headers and sampled data from: {csv_path.name}")
    except Exception as e: print(f"Error: Could not read CSV file '{csv_path.name}': {e}"); return
    if not headers: print("Error: No headers found in CSV file."); return

    editor_columns = []
    for header_name_csv in headers:
        col_def = {"name": header_name_csv, "label": header_name_csv.replace("_", " ").replace("-", " ").title(),
                   "type": "text", "required": False, "readOnly": False, "columnWidth": "150px"}
        style_info = indicator_styles.get(header_name_csv)
        if style_info:
            col_def["viewerStyleColumnName"] = header_name_csv
            if style_info.get("type") == "icon":
                if style_info.get("trueCondition") or \
                   (style_info.get("valueMap") and any(k.lower() in {"true", "false", "yes", "no", "1", "0", ""} for k in style_info.get("valueMap", {}))):
                    col_def["type"] = "checkbox"; col_def["columnWidth"] = "80px"
            elif style_info.get("type") == "tag":
                value_map = style_info.get("valueMap", {})
                if not style_info.get("styleRules") and len([k for k in value_map if k != 'default']) in range(2, 25):
                    col_def["type"] = "select"; col_def["optionsSource"] = "viewerConfigValueMap"; col_def["columnWidth"] = "180px"
                if style_info.get("layout") == "stacked" or header_name_csv in viewer_multival_cols:
                    if col_def["type"] != "select":
                         col_def["type"] = "multi-select"; col_def["allowNewTags"] = True; col_def["columnWidth"] = "200px"
        
        if col_def["type"] == "text" or (col_def["type"] == "multi-select" and not style_info):
            if header_name_csv in viewer_multival_cols and col_def["type"] != "multi-select":
                col_def["type"] = "multi-select"; col_def["allowNewTags"] = True; col_def["columnWidth"] = "200px"
            else:
                inferred_type = infer_column_type_from_data(sample_data_by_column.get(header_name_csv, []), viewer_true_values)
                col_def["type"] = inferred_type
                if inferred_type == "checkbox": col_def["columnWidth"] = "80px"
                elif inferred_type == "date": col_def["columnWidth"] = "120px"
                elif inferred_type == "number": col_def["columnWidth"] = "100px"
                elif inferred_type == "textarea": col_def["columnWidth"] = "250px"
                elif inferred_type == "multi-select":
                     col_def["allowNewTags"] = True; col_def["columnWidth"] = "200px"

        if col_def["type"] in ["select", "multi-select"] and not col_def.get("optionsSource") and not col_def.get("options"):
            unique_values = sorted(list(set(sv for sv in sample_data_by_column.get(header_name_csv, []) if sv and str(sv).strip())))
            if unique_values and len(unique_values) < 50:
                col_def["options"] = unique_values
                if col_def["type"] == "multi-select" and "allowNewTags" not in col_def : col_def["allowNewTags"] = True
        editor_columns.append(col_def)

    editor_config_generated = {
        "editorSchemaVersion": 1.0,
        "preloadUrls": {"viewerConfigUrl": f"./{viewer_config_name}", "csvDataUrl": f"./{csv_path.name}"},
        "csvOutputOptions": {"delimiter": ",", "booleanTrueValue": "TRUE", "booleanFalseValue": "FALSE"},
        "columns": editor_columns
    }
    js_output_content = f"// Generated Editor Config for: {dashboard_title}\n"
    js_output_content += f"// Based on Viewer Config: {viewer_config_name}\n"
    js_output_content += f"// Based on CSV Data: {csv_path.name}\n\n"
    js_output_content += "window.editorConfig = "
    js_output_content += json.dumps(editor_config_generated, indent=2)
    js_output_content += ";\n"
    try:
        with open(output_path, 'w', encoding='utf-8') as f: f.write(js_output_content)
        print(f"Successfully generated editor config: {output_path}")
    except Exception as e: print(f"Error writing editor config file '{output_path}': {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a starting editor_config.js from a viewer_config.js and a sample CSV.")
    parser.add_argument("viewer_config_file", help="Path to the viewer's config.js file. Use '' or 'None' if not available.", nargs='?', default=None)
    parser.add_argument("sample_csv_file", help="Path to a sample CSV data file.")
    parser.add_argument("output_editor_config_file", help="Path for the generated editor_config.js file.")
    args = parser.parse_args()
    viewer_path_str = args.viewer_config_file
    if viewer_path_str and viewer_path_str.lower() in ['', 'none', 'null']: viewer_path_str = None
    
    # Attempt to import pandas for robust date parsing, but don't fail if not present
    try:
        import pandas as pd
    except ImportError:
        pd = None # Will be checked in infer_column_type_from_data
        print("Warning: pandas library not found. Date parsing capability will be more basic.")

    generate_editor_config(viewer_path_str, args.sample_csv_file, args.output_editor_config_file)