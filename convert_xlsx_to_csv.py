import pandas as pd
import os
import re

excel_path = 'c:/Users/Lenovo/OneDrive/Documents/Desktop/II Year Mess bill pending status Oct status.xlsx'
csv_output_path = 'c:/Users/Lenovo/OneDrive/Documents/Desktop/appatment management/chatbot ai/mess and feedback management system/backend/db/students.csv'

if not os.path.exists(excel_path):
    print(f"Excel file not found at: {excel_path}")
    exit(1)

def clean_name(name):
    if not name or name == 'nan':
        return ''
    # Remove patterns like (FG), (PMSS), ( FG ), ( PMSS ) case-insensitively
    name = re.sub(r'\s*\(\s*(FG|PMSS)\s*\)\s*', '', name, flags=re.IGNORECASE)
    # Remove patterns like " FG" or " PMSS" at the end of the name
    name = re.sub(r'\s+(FG|PMSS)\s*$', '', name, flags=re.IGNORECASE)
    return name.strip()

print(f"Reading Excel file from: {excel_path}")

# Read sheet 1 with no header
df1_raw = pd.read_excel(excel_path, sheet_name='24 - ii year', header=None)

# Find header row
header_idx = None
for idx, row in df1_raw.iterrows():
    row_vals = [str(x).strip() for x in row.values]
    if 'Serial No' in row_vals or 'Roll Number' in row_vals:
        header_idx = idx
        break

if header_idx is None:
    print("Could not find header row in sheet 1")
    exit(1)

# Set columns and filter data
df1_raw.columns = [str(x).strip() for x in df1_raw.iloc[header_idx]]
df1 = df1_raw.iloc[header_idx + 1:]

# Extract roll and name
df1_students = []
for idx, row in df1.iterrows():
    roll = str(row.get('Roll Number', '')).strip()
    raw_name = str(row.get('Student Name', '')).strip()
    name = clean_name(raw_name)
    if roll and roll != 'nan' and name and (roll.startswith('ES24') or roll.startswith('es24') or roll.startswith('ES') or roll.startswith('es')):
        df1_students.append({
            'name': name,
            'roll_no': roll.upper(),
            'room_no': 'N/A',
            'pin': 'Esec@123'
        })

# Read sheet 2
df2_raw = pd.read_excel(excel_path, sheet_name='24 - ii year new', header=None)
df2_students = []
for idx, row in df2_raw.iterrows():
    # Let's inspect the columns. Row idx containing roll starts with ES24
    for col_idx in range(len(row)):
        val = str(row.iloc[col_idx]).strip()
        if val.startswith('ES24') or val.startswith('es24'):
            # The name is in the next column
            raw_name = str(row.iloc[col_idx + 1]).strip() if col_idx + 1 < len(row) else 'N/A'
            name = clean_name(raw_name)
            df2_students.append({
                'name': name,
                'roll_no': val.upper(),
                'room_no': 'N/A',
                'pin': 'Esec@123'
            })
            break

# Combine and deduplicate
all_students = {}
for s in df1_students:
    all_students[s['roll_no']] = s
for s in df2_students:
    all_students[s['roll_no']] = s

combined = list(all_students.values())
df_out = pd.DataFrame(combined)
df_out.to_csv(csv_output_path, index=False)

print(f"Extracted {len(df1_students)} students from sheet 1")
print(f"Extracted {len(df2_students)} students from sheet 2")
print(f"Total unique students exported: {len(combined)}")
