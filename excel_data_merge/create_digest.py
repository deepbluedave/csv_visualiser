# --- START OF FILE succinct_text_generator.py ---

import pandas as pd
import yaml
import logging
import argparse
import string # For safe formatting
from pathlib import Path
from collections import defaultdict

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Global Data Cache ---
data_cache = {}

# --- Helper Functions ---

class SafeFormatter(string.Formatter):
    """String formatter that ignores missing keys or assigns a default."""
    def __init__(self, default='N/A'):
        super().__init__()
        self.default = default

    def get_value(self, key, args, kwargs):
        if isinstance(key, str):
            # Handle dot notation if needed in future, for now just direct key lookup
            return kwargs.get(key, self.default)
        else:
            # Default behavior for positional arguments etc.
            return super().get_value(key, args, kwargs)

    def format_field(self, value, format_spec):
        # Basic date formatting if value looks like a timestamp
        if isinstance(value, pd.Timestamp):
            try:
                # Default to YYYY-MM-DD format if no spec provided
                return value.strftime(format_spec if format_spec else '%Y-%m-%d')
            except ValueError: # Handle invalid format spec
                 return value.strftime('%Y-%m-%d') # Fallback format
        # Basic float formatting to avoid excessive decimals
        elif isinstance(value, float):
             # Default to 2 decimal places if no spec, unless it's an integer float
             if value == int(value): # Handle integer floats like 9.0
                 format_spec = format_spec if format_spec else 'g' # Use general format for int float
             else:
                format_spec = format_spec if format_spec else '.2f'
             return super().format_field(value, format_spec)

        # Convert None to the default value before formatting
        if value is None or pd.isna(value):
             value = self.default

        return super().format_field(value, format_spec)

safe_formatter = SafeFormatter(default='N/A') # Global instance

def load_config(config_path):
    """Loads and validates the YAML configuration file."""
    logging.info(f"Loading configuration from: {config_path}")
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        logging.info("Configuration loaded successfully.")
        # Validation for succinct text structure
        req_keys = ['output_file', 'master_source', 'selection_criteria', 'detail_sources']
        if not all(k in config for k in req_keys): raise ValueError(f"Config missing keys: {req_keys}")
        if not all(k in config['master_source'] for k in ['file_path', 'sheet_name', 'primary_key_column', 'include_master_columns']): raise ValueError("Config missing master_source keys.")
        if 'master_filters' not in config['selection_criteria'] and 'app_ids' not in config['selection_criteria']: raise ValueError("Config 'selection_criteria' needs 'master_filters' or 'app_ids'.")
        if not isinstance(config['detail_sources'], list): raise ValueError("'detail_sources' must be a list.")

        for i, source_def in enumerate(config['detail_sources']):
            if not isinstance(source_def, dict): raise ValueError(f"Item {i} in 'detail_sources' not a dict.")
            req_source_keys = ['file_path', 'sheet_name', 'foreign_key_column', 'display_fields', 'format_string']
            if not all(k in source_def for k in req_source_keys): raise ValueError(f"Source definition {i} missing keys: {req_source_keys}.")
            if not isinstance(source_def['display_fields'], dict): raise ValueError(f"Source definition {i}: 'display_fields' must be a dictionary (map).")
        return config
    except FileNotFoundError: logging.error(f"Config file not found: {config_path}"); raise
    except yaml.YAMLError as e: logging.error(f"Error parsing YAML config: {e}"); raise
    except ValueError as e: logging.error(f"Config validation error: {e}"); raise

def read_data(file_path, sheet_name):
    """Reads data using cache."""
    cache_key = (Path(file_path).resolve(), sheet_name)
    if cache_key in data_cache: return data_cache[cache_key].copy()
    logging.info(f"Reading data from: {file_path} - Sheet: {sheet_name}")
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, engine='openpyxl')
        logging.info(f"Read {len(df)} rows.")
        data_cache[cache_key] = df.copy()
        return df
    except FileNotFoundError: logging.error(f"File not found: {file_path}"); return None
    except ValueError as e:
        if f"Worksheet named '{sheet_name}' not found" in str(e): logging.error(f"Sheet '{sheet_name}' not found in {file_path}"); return None
        else: raise
    except Exception as e: logging.error(f"Error reading {file_path} sheet '{sheet_name}': {e}"); return None

def filter_dataframe(df, filters):
    """Applies simple equality/in filters for master selection."""
    if df is None or df.empty: return pd.DataFrame()
    filtered = df.copy()
    for f in filters:
        col, op, val = f.get('column'), f.get('operator'), f.get('value')
        if not all([col, op, val]): logging.warning(f"Skipping invalid filter: {f}"); continue
        if col not in filtered.columns: logging.warning(f"Filter column '{col}' not found. Skipping."); continue
        try:
            col_str = filtered[col].astype(str)
            val_str_list = [str(v) for v in val] if isinstance(val, list) else [str(val)]
            if op == '==': mask = col_str == val_str_list[0]
            elif op == 'in': mask = col_str.isin(val_str_list)
            elif op == '!=': mask = col_str != val_str_list[0]
            else: logging.warning(f"Unsupported simple filter operator '{op}'. Skipping."); continue
            filtered = filtered[mask]
        except Exception as e: logging.error(f"Error applying filter {f}: {e}")
    return filtered

# --- Main Execution ---

def main(config_path):
    """Generates a succinct, detailed text report for selected applications."""
    global data_cache
    data_cache = {}

    try:
        config = load_config(config_path)

        # 1. Read Master Data & Prepare Context (same as detailed_text_generator)
        master_config = config['master_source']
        master_df = read_data(master_config['file_path'], master_config['sheet_name'])
        if master_df is None: raise ValueError("Failed to read master data file. Aborting.")
        pk_col = master_config['primary_key_column']
        if pk_col not in master_df.columns: raise ValueError(f"Primary key '{pk_col}' not found in master.")
        master_df = master_df.drop_duplicates(subset=[pk_col], keep='first')
        master_df = master_df.dropna(subset=[pk_col])

        # 2. Determine Target App IDs (same as detailed_text_generator)
        selection_criteria = config['selection_criteria']
        target_app_ids = set()
        if 'master_filters' in selection_criteria and selection_criteria['master_filters']:
            filtered_for_selection = filter_dataframe(master_df, selection_criteria['master_filters'])
            target_app_ids = set(filtered_for_selection[pk_col].astype(str).unique())
            logging.info(f"Selected {len(target_app_ids)} apps via master filters.")
        elif 'app_ids' in selection_criteria and selection_criteria['app_ids']:
            target_app_ids = set(map(str, selection_criteria['app_ids']))
            logging.info(f"Selected {len(target_app_ids)} apps via app_ids list.")
        else: logging.warning("No selection criteria. No report generated."); return
        if not target_app_ids: logging.warning("Selection criteria resulted in 0 targets. No report generated."); return

        # 3. Prepare Master Context DF (same as detailed_text_generator)
        master_map_config = master_config['include_master_columns']
        if pk_col not in master_map_config: master_map_config[pk_col] = master_map_config.get(pk_col, 'AppID')
        master_df_filtered = master_df[master_df[pk_col].astype(str).isin(target_app_ids)].copy()
        master_context_df = master_df_filtered[list(master_map_config.keys())].copy()
        master_context_df.rename(columns=master_map_config, inplace=True)
        renamed_pk_key = master_map_config[pk_col]
        master_context_df.set_index(renamed_pk_key, inplace=True)

        # 4. Collect Findings Data (Modified)
        # Store as { app_id: [ {alias1: value1, alias2: value2, '_format': format_string}, ... ] }
        app_findings_data = defaultdict(list)
        logging.info("Collecting findings data...")

        for i, source_def in enumerate(config.get('detail_sources', [])):
            file_path, sheet_name, fk_col = source_def.get('file_path'), source_def.get('sheet_name'), source_def.get('foreign_key_column')
            display_fields = source_def.get('display_fields', {}) # {Alias: SourceCol}
            format_string = source_def.get('format_string', "ERR: No format string")

            if not all([file_path, sheet_name, fk_col, display_fields]): logging.warning(f"Skipping incomplete detail source #{i}: {file_path}"); continue

            logging.debug(f"Processing detail source: {file_path}")
            detail_df = read_data(file_path, sheet_name)
            if detail_df is None: logging.warning(f"Could not read {file_path}. Skipping."); continue
            if fk_col not in detail_df.columns: logging.error(f"FK '{fk_col}' not found in {file_path}. Skipping."); continue

            detail_df[fk_col] = detail_df[fk_col].astype(str)
            filtered_details = detail_df[detail_df[fk_col].isin(target_app_ids)].copy()
            if filtered_details.empty: continue

            logging.debug(f"Extracting {len(filtered_details)} details from {file_path}.")

            # Extract only the necessary data based on display_fields
            for index, row in filtered_details.iterrows():
                app_id_str = row[fk_col]
                finding_data = {'_format': format_string} # Store format string with data

                for alias, source_col in display_fields.items():
                    if source_col in row:
                        value = row[source_col]
                        # Basic cleaning - replace NaN/None with None for safe_formatter
                        finding_data[alias] = None if pd.isna(value) else value
                    else:
                        logging.warning(f"Source column '{source_col}' (aliased as '{alias}') not found in {file_path} row {index}. Will use default in format.")
                        finding_data[alias] = None # Ensure key exists but is None

                app_findings_data[app_id_str].append(finding_data)

        logging.info("Finished collecting findings data.")

        # 5. Generate Succinct Text Report
        output_file = Path(config['output_file'])
        output_file.parent.mkdir(parents=True, exist_ok=True)
        opts = config.get('formatting_options', {})
        app_header_fmt = opts.get('app_header_format', "=== App: {AppID} ===")
        app_sep = opts.get('app_separator', "\n---\n")
        finding_prefix = opts.get('finding_prefix', "  - ")
        no_findings_msg = opts.get('no_findings_message', "  - No findings.")
        # sort_config = opts.get('sort_findings_by', []) # Optional sorting feature

        logging.info(f"Generating succinct text report: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            sorted_target_ids = sorted(list(target_app_ids))

            for i, app_id_str in enumerate(sorted_target_ids):
                if i > 0: f.write(app_sep)

                # Get master context
                try:
                    master_info = master_context_df.loc[app_id_str].to_dict()
                    master_info['AppID'] = app_id_str
                except KeyError: master_info = {'AppID': app_id_str}
                except Exception as e: logging.error(f"Error getting master context for {app_id_str}: {e}"); master_info = {'AppID': f"{app_id_str} (Error)"}

                # Write app header
                try: f.write(app_header_fmt.format(**master_info) + "\n")
                except KeyError as fmt_e: logging.error(f"App header format error {app_id_str}: Missing key {fmt_e}. Using basic."); f.write(f"=== App: {app_id_str} ===\n")

                findings = app_findings_data.get(app_id_str, [])

                if not findings:
                    f.write(no_findings_msg + "\n")
                    continue

                # Add sorting here if implementing sort_config

                # Write each finding using its specific format
                for finding_data in findings:
                    fmt = finding_data.get('_format', "ERR: Missing format for finding")
                    try:
                        # Use the SafeFormatter instance
                        output_line = safe_formatter.format(fmt, **finding_data)
                        f.write(finding_prefix + output_line + "\n")
                    except Exception as format_e:
                         logging.error(f"Failed to format finding for App {app_id_str} using format '{fmt}'. Error: {format_e}")
                         logging.debug(f"Finding data: {finding_data}")
                         f.write(finding_prefix + f"ERROR formatting finding: {finding_data.get('ID', 'Unknown ID')}\n")


        logging.info("Succinct text report generated successfully.")

    except (FileNotFoundError, ValueError, yaml.YAMLError, TypeError) as e: logging.error(f"Report generation failed: {e}")
    except Exception as e: logging.exception(f"An unexpected error occurred during report generation: {e}")
    finally: data_cache = {}

# --- Argument Parser and Script Execution ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a succinct, detailed text report for selected applications.")
    parser.add_argument("config_file", help="Path to the YAML configuration file.")
    args = parser.parse_args()
    main(args.config_file)

# --- END OF FILE succinct_text_generator.py ---