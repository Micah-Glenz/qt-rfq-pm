from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    # Use environment variables for configuration
    debug = os.environ.get('FLASK_ENV') != 'production'
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 6002))
    
    app.run(debug=debug, host=host, port=port)