from app.routes.quotes import quotes_bp
from app.routes.vendor_quotes import vendor_quotes_bp
from app.routes.vendors import vendors_bp
from app.routes.notes import notes_bp
from app.routes.config import config_bp
from app.routes.email import email_bp
from app.routes.sales_reps import sales_reps_bp

def register_routes(app):
    """Register all blueprint routes with the app"""
    app.register_blueprint(quotes_bp)
    app.register_blueprint(vendor_quotes_bp)
    app.register_blueprint(vendors_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(email_bp)
    app.register_blueprint(sales_reps_bp)
