import os

def rename_package(root_dir, old_name, new_name):
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Filter out hidden directories
        dirnames[:] = [d for d in dirnames if not d.startswith('.')]
        
        for filename in filenames:
            if filename.endswith(".py") and not filename.startswith("._"):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    new_content = content.replace(f"from {old_name}", f"from {new_name}")
                    new_content = new_content.replace(f"import {old_name}", f"import {new_name}")
                    new_content = new_content.replace(f'"{old_name}"', f'"{new_name}"') 
                    new_content = new_content.replace(f"'{old_name}'", f"'{new_name}'")
                    
                    if new_content != content:
                        print(f"Updating {filepath}")
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.write(new_content)
                except UnicodeDecodeError:
                    print(f"Skipping binary/invalid file: {filepath}")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    rename_package("aeternus", "browser_use", "aeternus")
