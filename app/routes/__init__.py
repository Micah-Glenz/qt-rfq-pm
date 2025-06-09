from app.routes.quotes import quotes_bp
from app.routes.tasks import tasks_bp
from app.routes.vendor_quotes import vendor_quotes_bp
from app.routes.notes import notes_bp
from app.routes.events import events_bp
from app.routes.default_tasks import default_tasks_bp
from app.routes.config import config_bp

def register_routes(app):
    """Register all blueprint routes with the app"""
    app.register_blueprint(quotes_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(vendor_quotes_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(default_tasks_bp)
    app.register_blueprint(config_bp)
