import requests
import json
import os
from datetime import datetime

class GASAPI:
    """
    Python Client for the Lane County Project Management API (Google Apps Script)
    """
    
    def __init__(self, api_url=None, api_key=None):
        """
        Initialize with your Web App URL and the Secret API Key.
        """
        self.api_url = api_url
        self.api_key = api_key
    
    def set_config(self, api_url, api_key):
        """Update configuration dynamically if needed"""
        self.api_url = api_url
        self.api_key = api_key
    
    def _make_request(self, route, payload_data):
        """
        Internal helper to structure the request for the GAS Router.
        """
        if not self.api_url or not self.api_key:
            raise ValueError("API URL and Key must be configured first")

        # Construct the payload matching Security.gs parsing logic
        # We merge the auth details with the business data
        full_payload = {
            "key": self.api_key,   # Maps to 'key' in Security.gs
            "route": route,        # Maps to 'route' in Security.gs
            **payload_data         # Spreads the rest of the data (customerName, etc)
        }

        # Create log file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_filename = f"gas_api_log_{timestamp}.json"

        # Create logs directory at project root
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        logs_dir = os.path.join(project_root, 'logs')
        log_path = os.path.join(logs_dir, log_filename)

        # Ensure logs directory exists
        os.makedirs(logs_dir, exist_ok=True)

        # Log input data
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "route": route,
            "input_data": payload_data,
            "request": {
                "url": self.api_url,
                "headers": {'Content-Type': 'application/json'},
                "payload": full_payload
            }
        }
        
        try:
            # Send POST request
            # allow_redirects=True is standard, but explicit here because GAS redirects
            response = requests.post(
                self.api_url,
                json=full_payload,
                headers={'Content-Type': 'application/json'},
                allow_redirects=True,
                timeout=30
            )

            # Log response
            log_data["response"] = {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.text
            }

            # Check for HTTP errors (404, 500, etc)
            response.raise_for_status()

            # Parse JSON response
            data = response.json()

            # Check for Logical/Script errors (returned as JSON by Utils.gs)
            if data.get('status') == 'error':
                error_code = data.get('code', 'Unknown')
                error_msg = data.get('message', 'API Request failed')

                # Log error
                log_data["error"] = {
                    "type": "GAS_API_ERROR",
                    "code": error_code,
                    "message": error_msg
                }
                with open(log_path, 'w') as f:
                    json.dump(log_data, f, indent=2)

                raise Exception(f"GAS API Error [{error_code}]: {error_msg}")

            # Log success
            log_data["response_data"] = data.get('data')

            # Write log file
            with open(log_path, 'w') as f:
                json.dump(log_data, f, indent=2)

            # Return the clean data object
            return data.get('data')

        except requests.exceptions.RequestException as e:
            # Log network error
            log_data["error"] = {
                "type": "NETWORK_ERROR",
                "message": str(e)
            }
            with open(log_path, 'w') as f:
                json.dump(log_data, f, indent=2)

            raise Exception(f"Network Request Failed: {str(e)}")
        except json.JSONDecodeError:
            # Log JSON decode error
            log_data["error"] = {
                "type": "JSON_DECODE_ERROR",
                "message": "Failed to decode JSON response"
            }
            with open(log_path, 'w') as f:
                json.dump(log_data, f, indent=2)

            raise Exception("Failed to decode JSON. Check URL or Script Deployment.")

    def create_project(self, project_data):
        """
        Create a new project in Google Drive (creates folder and copies MPSF template)

        Args:
            project_data: Dictionary containing project information
                - customerName: Customer name
                - projectDescription: Project description
                - estimateNumber: Estimate/quote number
                - salesRep: Sales representative name

        Returns:
            Dictionary containing project folder and file URLs
        """
        return self._make_request("createFolder", project_data)

