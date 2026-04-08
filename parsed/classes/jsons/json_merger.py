import json
import glob

# Find all json files in the current folder
files = glob.glob("*.json")
merged_list = []

for file in files:
    # Skip the output file so you don't create an infinite loop
    if file == "classes.json":
        continue

    print(f"Checking file: {file}...")  # This will tell you which one it's on

    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        merged_list.append(data)

# Save the final list
with open('classes.json', 'w', encoding='utf-8') as out:
    json.dump(merged_list, out, indent=4)
    print("\n✅ Success! All files merged into classes.json")