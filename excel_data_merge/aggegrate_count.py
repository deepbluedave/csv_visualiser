# --- START OF FILE summary_aggregator_v2.py ---

import pandas as pd
import yaml
import logging
import re # Import regex module for potential validation if needed
from pathlib import Path
from datetime import date

# --- Configuration ---
CONFIG_FILE = 'aggregate_count.yaml'

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Global Data Cache ---
data_cache = {}

# --- Functions ---

# load_config remains the same as previous version

def load_config(config_path):
    """Loads the configuration from a YAML file."""
    logging.info(f"Loading configuration from: {config_path}")
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        logging.info("Configuration loaded successfully.")
        # Basic validation (can be expanded)
        if not all(k in config for k in ['output_file', 'master_source', 'summary_definitions']):
             raise ValueError("Config file missing required top-level keys ('output_file', 'master_source', 'summary_definitions').")
        if not all(k in config['master_source'] for k in ['file_path', 'sheet_name', 'primary_key_column', 'include_master_columns']):
             raise ValueError("Config file missing required master_source keys.")
        if not isinstance(config['summary_definitions'], list):
             raise ValueError("'summary_definitions' must be a list.")

        # Validate aggregation rules
        for i, rule in enumerate(config.get('summary_definitions', [])):
            if rule.get('aggregation') == 'sum' and not rule.get('aggregation_column'):
                raise ValueError(f"Summary rule {i} ('{rule.get('output_column_name')}') uses 'sum' aggregation but is missing 'aggregation_column'.")

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


# read_data remains the same as previous version

def read_data(file_path, sheet_name):
    """Reads data from an Excel sheet, using cache if available."""
    cache_key = (Path(file_path).resolve(), sheet_name) # Use resolved path for cache consistency
    if cache_key in data_cache:
        logging.debug(f"Using cached data for: {file_path} - Sheet: {sheet_name}")
        return data_cache[cache_key].copy() # Return a copy to prevent modification issues

    logging.info(f"Reading data from: {file_path} - Sheet: {sheet_name}")
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, engine='openpyxl')
        logging.info(f"Successfully read {len(df)} rows.")
        data_cache[cache_key] = df.copy() # Store a copy in cache
        return df
    except FileNotFoundError:
        logging.error(f"File not found: {file_path}")
        return None
    except ValueError as e:
         if f"Worksheet named '{sheet_name}' not found" in str(e):
             logging.error(f"Sheet named '{sheet_name}' not found in {file_path}")
             return None
         else:
              logging.error(f"Error reading Excel file {file_path}, sheet '{sheet_name}': {e}")
              raise
    except Exception as e:
        logging.error(f"An unexpected error occurred reading {file_path}, sheet '{sheet_name}': {e}")
        return None


def apply_filters(df, filters):
    """Applies a list of filters (AND logic) to a DataFrame."""
    if df is None or df.empty:
        return pd.DataFrame()

    filtered_df = df.copy()
    today_date = date.today()

    for f in filters:
        col = f.get('column')
        op = f.get('operator')
        val = f.get('value')

        if not col or not op:
            logging.warning(f"Skipping invalid filter definition: {f}")
            continue

        if col not in filtered_df.columns:
            logging.warning(f"Filter column '{col}' not found in DataFrame. Skipping this filter condition.")
            continue

        try:
            column_data = filtered_df[col] # Work directly on the view unless type conversion needed

            # --- Special Value Handling & Type Coercion ---
            actual_val = val
            is_date_comparison = False
            is_string_op = op in ['contains', 'startswith', 'endswith', 'regex']

            # Handle 'TODAY' for date comparisons
            if isinstance(val, str) and val.upper() == 'TODAY':
                 actual_val = pd.Timestamp(today_date)
                 is_date_comparison = True

            # Attempt date conversion for comparison operators or if 'TODAY' was used
            if is_date_comparison or (op in ['>', '>=', '<', '<='] and not isinstance(val, (int, float, date, pd.Timestamp))):
                try:
                    # Coerce column to datetime, invalid parsing will become NaT
                    column_data = pd.to_datetime(filtered_df[col], errors='coerce')
                    if not isinstance(actual_val, (pd.Timestamp, date)):
                         actual_val = pd.to_datetime(actual_val, errors='coerce')
                    is_date_comparison = True # Ensure flag is set
                    # Filter out rows where either the column or value failed date conversion
                    valid_comparison_mask = column_data.notna() & pd.notna(actual_val)
                    filtered_df = filtered_df[valid_comparison_mask]
                    # Update column_data view after filtering df
                    if filtered_df.empty: continue # Skip rest if no rows left
                    column_data = column_data[valid_comparison_mask]

                except Exception as date_err:
                    logging.warning(f"Could not perform date conversion for filter on column '{col}' with value '{val}'. Error: {date_err}. Skipping filter.")
                    continue

            # Coerce to string for string operations, handling potential NaNs
            elif is_string_op:
                 column_data = filtered_df[col].astype(str).fillna('') # Ensure string type, fill NaN with empty string

            # --- Apply Filter Logic ---
            mask = None
            if op == '==':
                mask = column_data == actual_val
            elif op == '!=':
                 mask = column_data != actual_val
            elif op == '>':
                 mask = column_data > actual_val
            elif op == '>=':
                 mask = column_data >= actual_val
            elif op == '<':
                 mask = column_data < actual_val
            elif op == '<=':
                 mask = column_data <= actual_val
            elif op == 'in':
                 if not isinstance(actual_val, list): raise ValueError("'in' operator requires value to be a list")
                 mask = column_data.isin(actual_val)
            elif op == 'not in':
                 if not isinstance(actual_val, list): raise ValueError("'not in' operator requires value to be a list")
                 mask = ~column_data.isin(actual_val)
            elif op == 'isnull':
                 # Use original column view before potential type changes
                 mask = filtered_df[col].isnull()
            elif op == 'notnull':
                 mask = filtered_df[col].notnull()
            # --- NEW STRING OPERATORS ---
            elif op == 'contains':
                 if not isinstance(actual_val, str): raise ValueError("'contains' operator requires string value")
                 # Using regex=False for literal contains, na=False treats NaN as non-match
                 mask = column_data.str.contains(actual_val, case=False, regex=False, na=False) # Often want case-insensitive
            elif op == 'startswith':
                 if not isinstance(actual_val, str): raise ValueError("'startswith' operator requires string value")
                 mask = column_data.str.startswith(actual_val, na=False)
            elif op == 'endswith':
                 if not isinstance(actual_val, str): raise ValueError("'endswith' operator requires string value")
                 mask = column_data.str.endswith(actual_val, na=False)
            elif op == 'regex':
                 if not isinstance(actual_val, str): raise ValueError("'regex' operator requires string value")
                 # Use regex=True, na=False
                 mask = column_data.str.contains(actual_val, regex=True, na=False)
            # --- End New Operators ---
            else:
                logging.warning(f"Unsupported filter operator: '{op}'. Skipping filter.")
                continue

            # Apply the mask
            if mask is not None:
                # Handle potential index mismatches if rows were dropped during type coercion
                if len(mask) == len(filtered_df):
                    filtered_df = filtered_df[mask]
                else:
                    # This shouldn't happen with current logic, but as a safeguard
                    logging.error(f"Filter mask length mismatch for column '{col}'. Skipping filter application.")
                    continue


        except ValueError as ve:
             logging.error(f"Filter error for column '{col}', operator '{op}', value '{val}': {ve}. Skipping filter.")
             continue
        except TypeError as te:
             logging.error(f"Type error during filter for column '{col}', operator '{op}', value '{val}': {te}. Check data types. Skipping filter.")
             continue
        except re.error as re_err: # Catch regex compilation errors specifically
             logging.error(f"Invalid regex pattern for filter on column '{col}': '{val}'. Error: {re_err}. Skipping filter.")
             continue
        except Exception as e:
             logging.error(f"Unexpected error applying filter {f}: {e}. Skipping filter.")
             continue

    return filtered_df


def perform_aggregation(df, fk_col, aggregation_type, aggregation_column=None):
    """Performs aggregation on the filtered DataFrame."""
    if df is None or df.empty:
        # Return empty Series with appropriate dtype guess
        dtype = 'float64' if aggregation_type == 'sum' else ('bool' if aggregation_type == 'exists' else 'int64')
        return pd.Series(dtype=dtype)

    if fk_col not in df.columns:
         logging.error(f"Foreign key column '{fk_col}' not found for aggregation.")
         return pd.Series(dtype='object') # Generic empty series

    grouped = df.groupby(fk_col, dropna=False)

    if aggregation_type == 'count':
        return grouped.size()
    elif aggregation_type == 'exists':
        return grouped.size() > 0
    # --- NEW: SUM Aggregation ---
    elif aggregation_type == 'sum':
        if not aggregation_column:
            logging.error("'sum' aggregation requires an 'aggregation_column'.")
            return pd.Series(dtype='float64')
        if aggregation_column not in df.columns:
            logging.error(f"Aggregation column '{aggregation_column}' not found for 'sum'.")
            return pd.Series(dtype='float64')

        # Attempt to convert the aggregation column to numeric, coercing errors to NaN
        numeric_col = pd.to_numeric(df[aggregation_column], errors='coerce')
        if numeric_col.isnull().all():
            logging.warning(f"Column '{aggregation_column}' could not be converted to numeric for sum aggregation. Result will be 0 or NaN.")
            # Return a series of 0s matching the group keys?
            # Or let sum() produce NaNs which get filled later? Let sum handle it.

        # Group by FK and sum the numeric column (NaNs are ignored by sum)
        # Need to work on a temporary df with the coerced column
        temp_df = df[[fk_col]].copy()
        temp_df['__numeric_agg_col__'] = numeric_col
        return temp_df.groupby(fk_col)['__numeric_agg_col__'].sum()
    # --- End SUM ---
    else:
        logging.error(f"Unsupported aggregation type: {aggregation_type}")
        return pd.Series(dtype='object')


# --- Main Execution ---

def main():
    """Main function to run the summary aggregation process."""
    global data_cache
    data_cache = {}

    try:
        config = load_config(CONFIG_FILE)

        # 1. Read and Prepare Master Data
        master_config = config['master_source']
        master_df = read_data(master_config['file_path'], master_config['sheet_name'])

        if master_df is None: raise ValueError("Failed to read master data file. Aborting.")

        pk_col = master_config['primary_key_column']
        if pk_col not in master_df.columns: raise ValueError(f"Primary key '{pk_col}' not found in master sheet.")

        # Handle duplicates & missing PKs
        duplicates = master_df[master_df.duplicated(subset=[pk_col], keep=False)]
        if not duplicates.empty:
            logging.warning(f"Duplicate primary keys found in master sheet. Keeping first occurrence for PKs: {duplicates[pk_col].unique().tolist()}")
            master_df = master_df.drop_duplicates(subset=[pk_col], keep='first')
        missing_pk = master_df[pk_col].isnull()
        if missing_pk.any():
             logging.warning(f"Found {missing_pk.sum()} rows with missing primary key in master sheet. These rows will be dropped.")
             master_df = master_df.dropna(subset=[pk_col])

        if master_df.empty:
             logging.warning("Master DataFrame is empty after handling duplicates/missing PKs. Output will be empty.")
             summary_df = pd.DataFrame()
        else:
            # Select and rename master columns
            include_map = master_config['include_master_columns']
            missing_master_cols = [col for col in include_map.keys() if col not in master_df.columns]
            if missing_master_cols:
                 logging.warning(f"Master sheet missing requested columns: {missing_master_cols}. They will be skipped.")
                 include_map = {k: v for k, v in include_map.items() if k in master_df.columns}

            # Ensure PK is included
            if pk_col not in include_map:
                 # If PK wasn't explicitly in include_map, add it (using original name if no target name given)
                 # But it's better practice to require it in include_map
                 # raise ValueError(f"Primary key '{pk_col}' must be included in 'include_master_columns'.")
                 logging.warning(f"Primary key '{pk_col}' not explicitly in 'include_master_columns'. Adding it with its original name.")
                 include_map[pk_col] = pk_col # Add it using original name

            summary_df = master_df[list(include_map.keys())].copy()
            summary_df.rename(columns=include_map, inplace=True)
            renamed_pk_col = include_map.get(pk_col)
            summary_df.set_index(renamed_pk_col, inplace=True, drop=False) # Keep PK as column too

        logging.info(f"Prepared master data with {len(summary_df)} unique records.")

        # 2. Process Summary Definitions
        for rule in config.get('summary_definitions', []):
            output_col = rule.get('output_column_name')
            source_file = rule.get('source_file')
            source_sheet = rule.get('source_sheet')
            fk_col = rule.get('foreign_key_column')
            aggregation = rule.get('aggregation')
            filters = rule.get('filters', [])
            agg_col = rule.get('aggregation_column') # Get column for SUM

            if not all([output_col, source_file, source_sheet, fk_col, aggregation]):
                logging.warning(f"Skipping incomplete summary rule: {rule.get('output_column_name', 'N/A')}")
                continue

            logging.info(f"Processing rule for output column: '{output_col}'")

            detail_df = read_data(source_file, source_sheet)
            if detail_df is None:
                logging.warning(f"Could not read detail data for rule '{output_col}'. Skipping.")
                default_val = 0 if aggregation in ['count', 'sum'] else False
                summary_df[output_col] = default_val
                continue
            if fk_col not in detail_df.columns:
                 logging.error(f"Foreign key '{fk_col}' not found in {source_file} for rule '{output_col}'. Skipping rule.")
                 default_val = 0 if aggregation in ['count', 'sum'] else False
                 summary_df[output_col] = default_val
                 continue

            filtered_detail_df = apply_filters(detail_df, filters)

            # Perform aggregation, passing agg_col if needed
            aggregated_data = perform_aggregation(filtered_detail_df, fk_col, aggregation, agg_col)

            # Merge results
            if not aggregated_data.empty:
                 # Ensure index types match (safer to convert both to string for merge)
                 try:
                     aggregated_data.index = aggregated_data.index.astype(str)
                     summary_df.index = summary_df.index.astype(str)
                 except Exception as e:
                      logging.warning(f"Could not reliably convert index types for merging rule '{output_col}'. Merge might fail or be incorrect. Error: {e}")


                 summary_df = summary_df.merge(
                     aggregated_data.rename(output_col),
                     left_index=True,
                     right_index=True,
                     how='left'
                 )
            else:
                 summary_df[output_col] = None # Ensure column exists

            # Fill NaN values and ensure correct type
            default_val = 0 if aggregation in ['count', 'sum'] else False
            summary_df[output_col] = summary_df[output_col].fillna(default_val)

            if aggregation == 'count':
                 summary_df[output_col] = summary_df[output_col].astype(int)
            elif aggregation == 'exists':
                 summary_df[output_col] = summary_df[output_col].astype(bool)
            elif aggregation == 'sum':
                 # Sum might result in float, keep it as float unless you are sure it should be int
                 summary_df[output_col] = pd.to_numeric(summary_df[output_col], errors='ignore') # Ensure numeric type after fillna

            logging.info(f"Completed processing for '{output_col}'.")


        # 3. Finalize and Save Output
        output_file = Path(config['output_file'])
        output_file.parent.mkdir(parents=True, exist_ok=True)

        summary_df.reset_index(drop=True, inplace=True)

        # Apply column order
        if 'excel_column_order' in config and isinstance(config['excel_column_order'], list):
            # ... (column ordering logic remains the same) ...
            final_columns = [col for col in config['excel_column_order'] if col in summary_df.columns]
            missing_ordered_cols = [col for col in config['excel_column_order'] if col not in summary_df.columns]
            extra_cols = [col for col in summary_df.columns if col not in final_columns]
            if missing_ordered_cols: logging.warning(f"Columns specified in 'excel_column_order' but not found: {missing_ordered_cols}")
            if extra_cols:
                logging.info(f"Columns found but not in 'excel_column_order': {extra_cols}. Appending.")
                final_columns.extend(sorted(extra_cols))
            summary_df = summary_df[final_columns]


        logging.info(f"Saving summary report to: {output_file}")
        summary_df.to_excel(output_file, index=False, engine='openpyxl')
        logging.info("Summary report saved successfully.")

    except (FileNotFoundError, ValueError, yaml.YAMLError, TypeError) as e:
        logging.error(f"Aggregation failed: {e}")
    except Exception as e:
        logging.exception(f"An unexpected error occurred during summary aggregation: {e}")
    finally:
        data_cache = {}


if __name__ == "__main__":
    main()

# --- END OF FILE summary_aggregator_v2.py ---