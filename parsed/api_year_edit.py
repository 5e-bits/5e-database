import os

folder_path = './class_features'  # Change this to your actual folder path

for filename in os.listdir(folder_path):
    if filename.endswith('.json'):
        path = os.path.join(folder_path, filename)

        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = content.replace('/api/2014/', '/api/2024/')

        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)

print("Update complete.")