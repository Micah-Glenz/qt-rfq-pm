# Codex Agent Guidelines

This repository is a Flask based web app for tracking sales quotes. It uses a SQLite database and a vanilla JavaScript frontend.

## Project Layout
- `run.py` launches the development server.
- `a.py` utility for generating folder_structure.txt.
- `app/` contains the application code
  - `__init__.py` - creates the Flask app and initializes the database.
  - `db.py` - database setup and context managers.
  - `models/` - data access classes (Quote, Task, VendorQuote, Note, Event, DefaultTask).
  - `routes/` - Flask blueprints exposing the API.
  - `services/` - helper utilities (e.g. external Google Apps Script calls).
  - `static/` - front end assets (JS modules, CSS, images).
  - `templates/` - Jinja templates (currently only `index.html`).
- `requirements.txt` lists the Python dependencies.

## Development Notes
- Use **Python 3.10**. Install requirements with `pip install -r requirements.txt`.
- The SQLite database file `app/quote_tracker.db` is created on startup. Avoid manually editing or committing changes to the database file.
- Start the development server with:
  ```bash
  python run.py
  ```

## Coding Guidelines
- Indent Python with 4 spaces and keep lines under 100 characters when possible.
- All public functions and methods should include a docstring describing their purpose.
- Database operations should go through the `DatabaseContext` helper.
- JavaScript modules follow the IIFE pattern used in existing files (e.g. `QuotesModule`, `EventsModule`). Keep new modules consistent with this style.
- When extending the API add a new blueprint or route within `app/routes/`. Update the frontend API wrappers in `app/static/js/api.js` accordingly.
- For new UI components add corresponding CSS in `app/static/css/styles.css` and reference new JS modules in `index.html`.

## Testing
Before committing any code run the following to ensure all Python files compile:
```bash
python -m py_compile $(git ls-files '*.py')
```
If this command fails fix the reported syntax errors before committing.

## Additional Tips for Codex
- Keep changes focused and avoid modifying generated database files.
- Remember to register any new blueprints in `app/routes/__init__.py`.
- The frontend expects JSON responses; return informative error messages with `jsonify`.
- When updating quotes, events are automatically logged via the `Event.create` call in `update_quote`.

