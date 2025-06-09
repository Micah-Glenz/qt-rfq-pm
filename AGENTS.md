# Codex Agent Guidelines

This repository is a Flask-based web app for tracking sales quotes. It uses a SQLite database and a vanilla JavaScript frontend.

## Project Overview
The application is designed to streamline the process of managing sales quotes, tasks, and vendor interactions. It provides a user-friendly interface for tracking quotes, logging events, and managing associated tasks. The backend is built with Flask, ensuring scalability and ease of integration with external services.

## Project Layout
- `run.py`: Launches the development server.
- `a.py`: Utility for generating `folder_structure.txt`.
- `app/`: Contains the application code
  - `__init__.py`: Creates the Flask app and initializes the database.
  - `db.py`: Handles database setup and context managers.
  - `models/`: Contains data access classes:
    - `Quote`: Represents sales quotes.
    - `Task`: Represents tasks associated with quotes.
    - `VendorQuote`: Represents quotes from vendors.
    - `Note`: Represents notes attached to quotes or tasks.
    - `Event`: Logs events related to quotes and tasks.
    - `DefaultTask`: Represents default tasks for quotes.
  - `routes/`: Contains Flask blueprints exposing the API:
    - `quotes.py`: Handles quote-related API endpoints.
    - `tasks.py`: Manages task-related API endpoints.
    - `vendor_quotes.py`: Handles vendor quote-related API endpoints.
    - `events.py`: Logs and retrieves events.
    - `notes.py`: Manages note-related API endpoints.
    - `default_tasks.py`: Handles default task-related API endpoints.
  - `services/`: Contains helper utilities:
    - `config_service.py`: Manages application configuration.
    - `gas_api.py`: Handles external Google Apps Script calls.
  - `static/`: Frontend assets:
    - `css/`: Contains stylesheets for UI components.
    - `js/`: Contains JavaScript modules for frontend functionality.
    - Images: Includes favicon and other assets.
  - `templates/`: Contains Jinja templates for rendering HTML.
- `requirements.txt`: Lists Python dependencies.

## Development Notes
- **Python Version**: Use **Python 3.10**.
- **Dependencies**: Install requirements with `pip install -r requirements.txt`.
- **Database**: The SQLite database file `app/quote_tracker.db` is created on startup. Avoid manually editing or committing changes to the database file.
- **Server**: Start the development server with:
  ```bash
  python run.py
  ```

## Coding Guidelines
### Python
- Indent code with 4 spaces.
- Keep lines under 100 characters when possible.
- Include docstrings for all public functions and methods.
- Use the `DatabaseContext` helper for database operations.

### JavaScript
- Follow the IIFE pattern used in existing files (e.g., `QuotesModule`, `EventsModule`).
- Keep new modules consistent with this style.
- Update frontend API wrappers in `app/static/js/api.js` when extending the API.

### CSS
- Add new styles in `app/static/css/styles.css`.
- Ensure new UI components are visually consistent with existing designs.

### HTML
- Reference new JavaScript modules in `index.html`.

## Testing
### Python
Before committing any code, ensure all Python files compile:
```bash
python -m py_compile $(git ls-files '*.py')
```
Fix any reported syntax errors before committing.

### Frontend
- Test new JavaScript modules in the browser.
- Verify that API calls return expected JSON responses.

## Deployment
- Ensure all dependencies are installed.
- Verify the database schema is up-to-date.
- Use a production-ready WSGI server (e.g., Gunicorn) for deployment.

## Additional Tips for Codex
- Keep changes focused and avoid modifying generated database files.
- Register new blueprints in `app/routes/__init__.py`.
- Return informative error messages with `jsonify`.

