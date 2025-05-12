from flask import Blueprint, request, jsonify
from app.services.config_service import ConfigService

config_bp = Blueprint('config', __name__, url_prefix='/api')

@config_bp.route('/config', methods=['GET'])
def get_config():
    """Get the current configuration"""
    config = ConfigService.get_config()
    
    # Don't expose the API key in GET requests for security
    safe_config = {
        'gas_api_url': config.get('gas_api_url', ''),
        'gas_api_key_set': bool(config.get('gas_api_key')),
        'default_spreadsheet_id': config.get('default_spreadsheet_id', '')
    }
    
    return jsonify(safe_config)

@config_bp.route('/config', methods=['POST'])
def update_config():
    """Update the configuration"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    current_config = ConfigService.get_config()
    
    # Update only provided fields
    if 'gas_api_url' in data:
        current_config['gas_api_url'] = data['gas_api_url']
    
    if 'gas_api_key' in data:
        current_config['gas_api_key'] = data['gas_api_key']
    
    if 'default_spreadsheet_id' in data:
        current_config['default_spreadsheet_id'] = data['default_spreadsheet_id']
    
    if ConfigService.save_config(current_config):
        return jsonify({'message': 'Configuration updated successfully'})
    else:
        return jsonify({'error': 'Failed to save configuration'}), 500
