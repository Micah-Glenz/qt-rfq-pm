import requests
import json
from datetime import datetime

class GASAPI:
    """Google Apps Script API Client"""
    
    def __init__(self, api_url=None, api_key=None):
        self.api_url = api_url
        self.api_key = api_key
    
    def set_config(self, api_url, api_key):
        """Set the API configuration"""
        self.api_url = api_url
        self.api_key = api_key
    
    def _make_request(self, payload):
        """Make a request to the Google Apps Script API"""
        if not self.api_url or not self.api_key:
            raise ValueError("API URL and Key must be configured first")
        
        # Add the API key to the payload
        payload['apiKey'] = self.api_key
        
        try:
            response = requests.post(
                self.api_url,
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            data = response.json()
            
            if data.get('status') == 'error':
                raise Exception(data.get('message', 'API request failed'))
            
            return data.get('data')
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {str(e)}")
        except json.JSONDecodeError:
            raise Exception("Invalid JSON response from API")
    
    def create_project(self, project_data):
        """Create a project with folder and sheet"""
        payload = {
            'operation': 'addProjectSheet',
            'customerName': project_data.get('customerName'),
            'projectDescription': project_data.get('projectDescription'),
            'estimateNumber': project_data.get('estimateNumber'),
            'salesRep': project_data.get('salesRep'),
            'spreadsheetId': project_data.get('spreadsheetId')
        }
        
        return self._make_request(payload)
    
    def create_folder(self, folder_data):
        """Create folder only"""
        payload = {
            'operation': 'createFolder',
            'salesRep': folder_data.get('salesRep'),
            'customerName': folder_data.get('customerName'),
            'projectDescription': folder_data.get('projectDescription'),
            'estimateNumber': folder_data.get('estimateNumber')
        }
        
        return self._make_request(payload)
    
    def copy_template(self, template_data):
        """Copy template file"""
        payload = {
            'operation': 'copyTemplate',
            'folderId': template_data.get('folderId'),
            'customerName': template_data.get('customerName'),
            'estimateNumber': template_data.get('estimateNumber')
        }
        
        return self._make_request(payload)
    
    def create_project_sheet(self, sheet_data):
        """Create project sheet only"""
        payload = {
            'operation': 'createProjectSheet',
            'sheetName': sheet_data.get('sheetName'),
            'spreadsheetId': sheet_data.get('spreadsheetId'),
            'customerName': sheet_data.get('customerName'),
            'projectDescription': sheet_data.get('projectDescription'),
            'estimateNumber': sheet_data.get('estimateNumber'),
            'mpsfLink': sheet_data.get('mpsfLink'),
            'folderLink': sheet_data.get('folderLink')
        }
        
        return self._make_request(payload)
    
    def update_status_summary(self, spreadsheet_id):
        """Update status summary"""
        payload = {
            'operation': 'updateStatusSummary',
            'spreadsheetId': spreadsheet_id
        }
        
        return self._make_request(payload)
    
    def get_sheet_status(self, status_data):
        """Get sheet status"""
        payload = {
            'operation': 'getSheetStatus',
            'spreadsheetId': status_data.get('spreadsheetId'),
            'sheetName': status_data.get('sheetName')
        }
        
        return self._make_request(payload)
    
    def get_all_sheet_statuses(self, spreadsheet_id):
        """Get all sheet statuses"""
        payload = {
            'operation': 'getAllSheetStatuses',
            'spreadsheetId': spreadsheet_id
        }
        
        return self._make_request(payload)
