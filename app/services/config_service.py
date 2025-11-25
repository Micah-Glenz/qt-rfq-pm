import os
import json
from app.services.gas_api import GASAPI

class ConfigService:
    """Service for handling application configuration"""
    
    CONFIG_FILE = 'config.json'
    
    @staticmethod
    def get_config():
        """Get the current configuration"""
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ConfigService.CONFIG_FILE)
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        
        return {
            'gas_api_url': '',
            'gas_api_key': ''
        }
    
    @staticmethod
    def save_config(config):
        """Save configuration"""
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ConfigService.CONFIG_FILE)
        
        try:
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving config: {e}")
            return False
    
    @staticmethod
    def get_gas_api():
        """Get configured GAS API instance"""
        config = ConfigService.get_config()
        api = GASAPI()
        
        if config.get('gas_api_url') and config.get('gas_api_key'):
            api.set_config(
                api_url=config['gas_api_url'],
                api_key=config['gas_api_key']
            )
        
        return api
