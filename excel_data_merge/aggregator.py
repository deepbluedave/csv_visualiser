# --- START OF FILE excel_aggregator_v2.py ---

import pandas as pd
import json
import yaml
import logging
from pathlib import Path
from collections import OrderedDict # To preserve column order easily

# --- Configuration ---
CONFIG_FILE = 'config.yaml'

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Functions ---

def load_config(config_path):
    """Loads the configuration from a YAML file."""
    logging.info(f"Loading configuration from: {config_path}")
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        logging.info("Configuration loaded successfully.")

        # --- Basic Validation ---
        required_keys = ['excel_file', 'output_target', 'master_sheet', 'detail_sheets']
        if not all(k in config for k in required_keys):
             raise ValueError(f"Config file missing required top-level keys: {required_keys}")

        if config['output_target'] == 'json' and 'output_json_file' not in config:
            raise ValueError("Config missing 'output_json_file' required for JSON target.")
        if config['output_target'] == 'excel' and 'output_excel_file' not in config:
             raise ValueError("Config missing 'output_excel_file' required for Excel target.")
        if config['output_target'] not in ['json', 'excel']:
            raise ValueError(f"Invalid 'output_target': {config['output_target']}. Must be 'json' or 'excel'.")

        if not isinstance(config['master_sheet'], dict) or not all(k in config['master_sheet'] for k in ['name', 'primary_key_column']):
             raise ValueError("Config file missing required master_sheet keys ('name', 'primary_key_column').")

        if not isinstance(config['detail_sheets'], list):
             raise ValueError("'detail_sheets' must be a list in the config file.")

        for i, detail_conf in enumerate(config['detail_sheets']):
             if not isinstance(detail_conf, dict) or not all(k in detail_conf for k in ['sheet_name', 'foreign_key_column', 'json_key']):
                 raise ValueError(f"Detail sheet config at index {i} missing required keys ('sheet_name', 'foreign_key_column', 'json_key').")
        # --- End Validation ---

        return config
    except FileNotFoundError:
        logging.error(f"Configuration file not found: {config_path}")
        raise
    except yaml.YAMLError as e:
        logging.error(f"Error parsing YAML configuration: {e}")
        raise
    except ValueError as e:
        logging.error(f"Configuration validation error: {e}")
        raise

# Unchanged from original, but now file_path is always passed explicitly
def read_excel_sheet(file_path, sheet_name):
    """Reads a specific sheet from an Excel file into a DataFrame."""
    logging.info(f"Reading sheet '{sheet_name}' from {file_path}")
    try:
        # Use openpyxl engine for .xlsx
        df = pd.read_excel(file_path, sheet_name=sheet_name, engine='openpyxl')
        return df
    except FileNotFoundError:
        logging.error(f"Excel file not found: {file_path}")
        raise
    except ValueError as e:
         # pandas raises ValueError if sheet_name doesn't exist
         if f"Worksheet named '{sheet_name}' not found" in str(e):
             logging.error(f"Sheet named '{sheet_name}' not found in {file_path}")
             raise ValueError(f"Sheet named '{sheet_name}' not found in {file_path}") from e
         else:
              logging.error(f"Error reading Excel file {file_path}, sheet '{sheet_name}': {e}")
              raise # Re-raise other ValueErrors
    except Exception as e:
        logging.error(f"An unexpected error occurred reading sheet '{sheet_name}' from '{file_path}': {e}")
        raise


# --- JSON Output Functions (Mostly Unchanged) ---

def build_output_structure(config, master_df):
    """Builds the initial hierarchical dictionary from the master DataFrame (for JSON output)."""
    logging.info("Building initial structure from master data for JSON output.")
    output_data = {}
    master_config = config['master_sheet']
    pk_col = master_config['primary_key_column']
    # Use OrderedDict to potentially preserve order from config if needed later
    include_cols_map = OrderedDict(master_config.get('include_columns', {}))

    if pk_col not in master_df.columns:
        raise ValueError(f"Primary key column '{pk_col}' not found in master sheet '{master_config['name']}'.")

    duplicates = master_df[master_df.duplicated(subset=[pk_col], keep=False)]
    if not duplicates.empty:
        logging.warning(f"Duplicate primary keys found in master sheet '{master_config['name']}'. Using first occurrence.")
        logging.warning(f"Duplicate PK values:\n{duplicates[pk_col].tolist()}")
        master_df = master_df.drop_duplicates(subset=[pk_col], keep='first')

    for index, row in master_df.iterrows():
        pk_value = row[pk_col]
        if pd.isna(pk_value):
            logging.warning(f"Skipping row {index} in master sheet due to missing primary key.")
            continue
        pk_value_str = str(pk_value)

        master_record = OrderedDict() # Use OrderedDict here too
        for excel_col, json_key in include_cols_map.items():
            if excel_col in row:
                master_record[json_key] = None if pd.isna(row[excel_col]) else row[excel_col]
            else:
                logging.warning(f"Column '{excel_col}' specified in master config not found in sheet. Setting to null.")
                master_record[json_key] = None

        for detail_conf in config['detail_sheets']:
            master_record[detail_conf['json_key']] = []

        output_data[pk_value_str] = master_record

    logging.info(f"Created initial JSON structure with {len(output_data)} master records.")
    return output_data


def add_detail_data(config, output_data):
    """Reads detail sheets and adds their data to the main output structure (for JSON output)."""
    logging.info("Adding detail data to JSON structure.")
    default_excel_file = config['excel_file'] # Default path

    for detail_conf in config['detail_sheets']:
        sheet_name = detail_conf['sheet_name']
        fk_col = detail_conf['foreign_key_column']
        json_key = detail_conf['json_key']
        # Use OrderedDict for details too
        include_cols_map = OrderedDict(detail_conf.get('include_columns', {}))
        # Determine the correct file path for this detail sheet
        excel_file = detail_conf.get('file_path', default_excel_file) # Use specific path or default

        try:
            detail_df = read_excel_sheet(excel_file, sheet_name)

            if fk_col not in detail_df.columns:
                 logging.error(f"Foreign key column '{fk_col}' not found in detail sheet '{sheet_name}' (file: {excel_file}). Skipping this sheet for JSON output.")
                 continue

            processed_count = 0
            skipped_fk_not_found = 0
            skipped_missing_fk = 0

            logging.info(f"Processing detail sheet: '{sheet_name}' from '{excel_file}' (linking via '{fk_col}') for JSON.")
            for index, row in detail_df.iterrows():
                fk_value = row[fk_col]

                if pd.isna(fk_value):
                    skipped_missing_fk += 1
                    continue
                fk_value_str = str(fk_value)
                master_record = output_data.get(fk_value_str)

                if master_record:
                    detail_record = OrderedDict() # Use OrderedDict
                    for excel_col, detail_json_key in include_cols_map.items():
                        if excel_col in row:
                             detail_record[detail_json_key] = None if pd.isna(row[excel_col]) else row[excel_col]
                        else:
                             logging.warning(f"Column '{excel_col}' specified for detail sheet '{sheet_name}' not found. Setting to null.")
                             detail_record[detail_json_key] = None

                    master_record[json_key].append(detail_record)
                    processed_count += 1
                else:
                    skipped_fk_not_found += 1

            if skipped_missing_fk > 0:
                 logging.warning(f"Sheet '{sheet_name}': Skipped {skipped_missing_fk} rows due to missing foreign key value.")
            if skipped_fk_not_found > 0:
                 logging.warning(f"Sheet '{sheet_name}': Skipped {skipped_fk_not_found} rows because their FK didn't match any master PK.")
            logging.info(f"Sheet '{sheet_name}': Added {processed_count} detail records to JSON structure.")

        except (FileNotFoundError, ValueError) as e:
            logging.error(f"Skipping detail sheet '{sheet_name}' for JSON output due to error: {e}")
            continue
        except Exception as e:
            logging.error(f"Unexpected error processing detail sheet '{sheet_name}' for JSON output: {e}. Skipping this sheet.")
            continue


def save_to_json(data, output_path, output_format='dict'):
    """Saves the data structure to a JSON file."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    logging.info(f"Saving aggregated data to JSON: {output_path}")

    if output_format == 'list':
        final_data = []
        # Retrieve PK mapping info if needed inside list items - depends on exact need
        # For now, just use the dict keys as 'id'
        for pk_key, record in data.items():
             record_with_id = OrderedDict([('id', pk_key)]) # Start with id
             record_with_id.update(record) # Add the rest
             final_data.append(record_with_id)
    elif output_format == 'dict':
        final_data = data
    else:
         logging.warning(f"Invalid output_format '{output_format}' for JSON. Defaulting to 'dict'.")
         final_data = data

    try:
        with open(output_path, 'w') as f:
            # Use OrderedDict structure for potentially more consistent key order
            json.dump(final_data, f, indent=4, default=str)
        logging.info("Data successfully saved to JSON.")
    except TypeError as e:
        logging.error(f"Error serializing data to JSON: {e}. Check data types.")
        raise
    except Exception as e:
        logging.error(f"Error writing JSON file: {e}")
        raise


# --- NEW: Excel Output Function ---

def generate_excel_output(config):
    """Generates a denormalized Excel file by joining master and detail data."""
    logging.info("Starting generation of denormalized Excel output.")
    master_config = config['master_sheet']
    master_file = config['excel_file']
    master_sheet_name = master_config['name']
    master_pk_col = master_config['primary_key_column']
    master_include_map = OrderedDict(master_config.get('include_columns', {}))

    output_excel_file = Path(config['output_excel_file'])
    output_excel_file.parent.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Read Master Sheet
        master_df = read_excel_sheet(master_file, master_sheet_name)
        logging.info(f"Read master sheet '{master_sheet_name}'. Found {len(master_df)} rows.")

        # Check for master PK
        if master_pk_col not in master_df.columns:
            raise ValueError(f"Primary key column '{master_pk_col}' not found in master sheet '{master_sheet_name}'.")

        # Handle potential duplicate master PKs (optional, depends on desired behavior, inner join handles it implicitly)
        master_df = master_df.drop_duplicates(subset=[master_pk_col], keep='first')

        # Prepare master columns: Select PK + included columns, and rename based on map
        master_cols_to_keep = [master_pk_col] + list(master_include_map.keys())
        # Check if all specified include columns exist in master_df
        missing_master_cols = [col for col in master_include_map.keys() if col not in master_df.columns]
        if missing_master_cols:
            logging.warning(f"Master sheet '{master_sheet_name}' is missing requested columns: {missing_master_cols}. They will be skipped.")
            # Adjust master_cols_to_keep to only include existing columns
            master_cols_to_keep = [col for col in master_cols_to_keep if col in master_df.columns]
            # Adjust rename map to exclude missing columns
            master_rename_map = {k: v for k, v in master_include_map.items() if k in master_cols_to_keep}
        else:
            master_rename_map = master_include_map

        # Select only the needed columns from master
        master_prepared_df = master_df[master_cols_to_keep].copy()

        # Rename master columns for the final output *after* selection
        master_prepared_df.rename(columns=master_rename_map, inplace=True)
        # Get the possibly *renamed* master PK column name for joining
        final_master_pk_col_name = master_rename_map.get(master_pk_col, master_pk_col)
        logging.debug(f"Prepared master columns: {master_prepared_df.columns.tolist()}")


        # 2. Process and Join Each Detail Sheet
        all_merged_data = []
        final_columns_set = set(master_prepared_df.columns) # Keep track of all columns encountered

        for detail_conf in config['detail_sheets']:
            sheet_name = detail_conf['sheet_name']
            fk_col = detail_conf['foreign_key_column']
            detail_include_map = OrderedDict(detail_conf.get('include_columns', {}))
            detail_file = detail_conf.get('file_path', master_file) # Use specific path or default

            logging.info(f"Processing detail sheet '{sheet_name}' from '{detail_file}' for Excel output.")

            try:
                detail_df = read_excel_sheet(detail_file, sheet_name)

                # Check for FK column
                if fk_col not in detail_df.columns:
                    logging.error(f"Foreign key column '{fk_col}' not found in detail sheet '{sheet_name}'. Skipping this sheet for join.")
                    continue

                # Prepare detail columns: Select FK + included columns
                detail_cols_to_keep = [fk_col] + list(detail_include_map.keys())
                 # Check if all specified include columns exist in detail_df
                missing_detail_cols = [col for col in detail_include_map.keys() if col not in detail_df.columns]
                if missing_detail_cols:
                    logging.warning(f"Detail sheet '{sheet_name}' is missing requested columns: {missing_detail_cols}. They will be skipped.")
                    detail_cols_to_keep = [col for col in detail_cols_to_keep if col in detail_df.columns]
                    detail_rename_map = {k: v for k, v in detail_include_map.items() if k in detail_cols_to_keep}
                else:
                     detail_rename_map = detail_include_map

                # Select only needed columns from detail
                detail_prepared_df = detail_df[detail_cols_to_keep].copy()

                # Rename detail columns *before* merge (important if FK name conflicts with a master col name)
                detail_prepared_df.rename(columns=detail_rename_map, inplace=True)
                # Keep track of the final column names from this detail sheet
                final_detail_cols = list(detail_rename_map.values())
                final_columns_set.update(final_detail_cols) # Add these columns to the overall set
                logging.debug(f"Prepared detail columns for '{sheet_name}': {detail_prepared_df.columns.tolist()}")


                # Perform the INNER JOIN (merge)
                # We join based on the *original* FK name in the detail sheet and the *final* PK name in the prepared master sheet
                merged_df = pd.merge(
                    master_prepared_df,
                    detail_prepared_df,
                    how='inner', # Ensures only matching rows are kept (Handles Req 2 & 3)
                    left_on=final_master_pk_col_name, # Use the potentially renamed PK col
                    right_on=fk_col # Use the original FK col name from the detail sheet before it might have been renamed/dropped
                )
                logging.info(f"Joined master with '{sheet_name}'. Found {len(merged_df)} matching rows.")

                # Drop the original FK column *after* the merge, as requested (Req 4)
                # Only drop if it wasn't explicitly included and renamed via include_columns
                if fk_col not in detail_rename_map: # Check if the original FK name is NOT a key in the rename map
                   if fk_col in merged_df.columns: # Ensure it exists before dropping
                       merged_df.drop(columns=[fk_col], inplace=True)
                       logging.debug(f"Dropped original FK column '{fk_col}' after merge.")
                   else:
                       # This might happen if the FK column had the same name as a column *renamed* in the detail_rename_map
                       logging.debug(f"Original FK column '{fk_col}' was not found after merge/rename, likely already handled or renamed.")


                # Add the result of this join to our list
                if not merged_df.empty:
                    all_merged_data.append(merged_df)

            except (FileNotFoundError, ValueError) as e:
                logging.error(f"Skipping detail sheet '{sheet_name}' for Excel output due to error: {e}")
                continue
            except Exception as e:
                 logging.error(f"Unexpected error processing detail sheet '{sheet_name}' for Excel output: {e}. Skipping this sheet.")
                 continue

        # 3. Combine results from all detail sheets
        if not all_merged_data:
            logging.warning("No matching records found between master and any detail sheets. Output Excel will be empty.")
            final_df = pd.DataFrame() # Create empty DataFrame
        else:
            logging.info(f"Combining results from {len(all_merged_data)} detail sheet join(s).")
            # Concatenate results. Pandas aligns columns automatically, filling non-matching ones with NaN (Handles Req 5A)
            final_df = pd.concat(all_merged_data, ignore_index=True, sort=False)
            logging.info(f"Combined DataFrame has {len(final_df)} rows and {len(final_df.columns)} columns.")

        # 4. Order Columns (Optional but recommended)
        if 'excel_column_order' in config and isinstance(config['excel_column_order'], list):
            # Use the order specified in the config, including only columns that actually exist
            final_column_order = [col for col in config['excel_column_order'] if col in final_df.columns]
            # Check for columns in final_df not mentioned in the order
            extra_cols = [col for col in final_df.columns if col not in final_column_order]
            if extra_cols:
                logging.warning(f"Columns found in data but not in 'excel_column_order': {extra_cols}. Appending them at the end.")
                final_column_order.extend(sorted(extra_cols)) # Append remaining alphabetically
        else:
            # Default order: Master columns first (in their prepared order), then all unique detail columns alphabetically
            master_cols_final = list(master_prepared_df.columns)
            detail_cols_final = sorted(list(final_columns_set - set(master_cols_final)))
            final_column_order = master_cols_final + detail_cols_final
            # Ensure order only contains columns present in the final DataFrame
            final_column_order = [col for col in final_column_order if col in final_df.columns]

        logging.debug(f"Final column order: {final_column_order}")
        final_df = final_df[final_column_order] # Reorder the DataFrame


        # 5. Save to Excel
        logging.info(f"Saving denormalized data to Excel: {output_excel_file}")
        final_df.to_excel(output_excel_file, index=False, engine='openpyxl')
        logging.info("Excel file successfully saved.")

    except (FileNotFoundError, ValueError) as e:
        logging.error(f"Excel generation failed: {e}")
        # No raise here, allow main to catch and log top-level failure
    except Exception as e:
        logging.exception(f"An unexpected error occurred during Excel generation: {e}")
        # No raise here

# --- Main Execution ---

def main():
    """Main function to run the aggregation process."""
    try:
        config = load_config(CONFIG_FILE)
        output_target = config['output_target']

        if output_target == 'json':
            logging.info("Starting JSON aggregation process...")
            master_file = config['excel_file']
            master_sheet_name = config['master_sheet']['name']
            master_df = read_excel_sheet(master_file, master_sheet_name)
            output_structure = build_output_structure(config, master_df)
            add_detail_data(config, output_structure)
            output_format = config.get('output_format', 'dict') # JSON specific format
            save_to_json(output_structure, config['output_json_file'], output_format)

        elif output_target == 'excel':
            logging.info("Starting Excel aggregation process...")
            generate_excel_output(config) # Call the new function

        else:
            # This case should be caught by load_config, but added defensively
            logging.error(f"Internal error: Invalid output_target '{output_target}' reached main execution.")
            return # Exit if target is somehow invalid

        logging.info("Aggregation process completed successfully.")

    except (FileNotFoundError, ValueError, yaml.YAMLError, TypeError) as e:
        logging.error(f"Aggregation failed: {e}")
    except Exception as e:
        logging.exception(f"An unexpected error occurred during aggregation: {e}")


if __name__ == "__main__":
    main()

# --- END OF FILE excel_aggregator_v2.py ---