from flask import Flask, render_template, send_from_directory
import os
from app.db import DatabaseManager
from app.routes import register_routes

def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')
    
    # Initialize database
    DatabaseManager.init_db()
    
    # Register API routes
    register_routes(app)

    # Main route - serve the index page
    @app.route('/')
    def index():
        return render_template('index.html')
    
    # Favicon route to prevent 405 errors
    @app.route('/favicon.ico')
    def favicon():
        return send_from_directory(os.path.join(app.root_path, 'static'),
                                   'favicon.ico', mimetype='image/vnd.microsoft.icon')
    
    # Add CORS headers to all responses
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        return response
    
    # Add handler for OPTIONS requests
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def options_handler(path):
        return '', 204
    
    return app
