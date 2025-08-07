import os
import subprocess

def create_executable():
    """Creates an executable from the run.py script using PyInstaller."""
    try:
        # Use the specific Python executable for pip and PyInstaller
        python_executable = r"C:\\Users\\piper\\Documents\\PORTABLE\\WPy64-31020\\python-3.10.2.amd64\\python.exe"

        # Ensure PyInstaller is installed using the specific Python executable
        subprocess.check_call([python_executable, "-m", "pip", "install", "pyinstaller"])

        # Include the app directory and its contents
        app_path = os.path.join(os.getcwd(), 'app')
        subprocess.check_call([
            python_executable,  # Use the specific Python executable
            "-m", "PyInstaller",
            "--onefile",  # Create a single executable file
            "--name", "qt_hope_missing",  # Name of the executable
            "--add-data", f"{app_path};app",  # Include the app directory
            "--exclude", "PyQt6",  # Exclude PyQt6 to avoid conflicts
            "run.py"  # Main script to convert
        ])

        print("Executable created successfully! Check the 'dist' folder for the output.")
    except subprocess.CalledProcessError as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    create_executable()
