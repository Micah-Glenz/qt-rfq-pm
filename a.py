import os

def build_structure(start_path, indent=''):
    lines = []
    try:
        entries = sorted(os.listdir(start_path))
    except PermissionError:
        lines.append(f"{indent}[Access Denied]")
        return lines

    for entry in entries:
        if entry.startswith('.') or entry == '__pycache__':
            continue  # Skip hidden and __pycache__ folders

        full_path = os.path.join(start_path, entry)
        if os.path.isdir(full_path):
            lines.append(f"{indent}[{entry}]")
            lines.extend(build_structure(full_path, indent + '    '))
        else:
            lines.append(f"{indent}{entry}")
    return lines

if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print("Usage: python folder_structure_to_txt.py <start_path>")
    else:
        root_path = sys.argv[1]
        output_file = "folder_structure.txt"

        structure_lines = [f"Structure of: {root_path}"]
        structure_lines += build_structure(root_path)

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(structure_lines))

        print(f"Folder structure written to {output_file}")
