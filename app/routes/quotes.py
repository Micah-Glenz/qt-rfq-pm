from flask import Blueprint, request, jsonify
from app.models import Quote, Task, VendorQuote, Note, Event
import json
from app.services.config_service import ConfigService

quotes_bp = Blueprint('quotes', __name__, url_prefix='/api')

@quotes_bp.route('/quotes', methods=['GET'])
def get_quotes():
    search = request.args.get('search', '')
    include_hidden = request.args.get('include_hidden', 'false').lower() == 'true'
    quotes = Quote.get_all(search, include_hidden)
    return jsonify(quotes)

@quotes_bp.route('/quotes/<int:quote_id>', methods=['GET'])
def get_quote(quote_id):
    quote = Quote.get_by_id(quote_id)
    if not quote:
        return jsonify({'error': 'Quote not found'}), 404
    
    tasks = Task.get_by_quote_id(quote_id)
    vendor_quotes = VendorQuote.get_by_quote_id(quote_id)
    notes = Note.get_by_quote_id(quote_id)
    events = Event.get_by_quote_id(quote_id)
    
    result = {
        'id': quote.id,
        'customer': quote.customer,
        'quote_no': quote.quote_no,
        'description': quote.description,
        'sales_rep': quote.sales_rep,
        'project_sheet_url': quote.project_sheet_url,
        'mpsf_link': quote.mpsf_link,
        'folder_link': quote.folder_link,
        'method_link': quote.method_link,
        'hidden': quote.hidden,
        'created_at': quote.created_at,
        'updated_at': quote.updated_at,
        'tasks': tasks,
        'vendor_quotes': vendor_quotes,
        'notes': notes,
        'events': events
    }
    
    return jsonify(result)

@quotes_bp.route('/quotes', methods=['POST'])
def create_quote():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    customer = data.get('customer')
    quote_no = data.get('quote_no')
    description = data.get('description')
    sales_rep = data.get('sales_rep')
    
    if not customer or not quote_no:
        return jsonify({'error': 'Customer and quote number are required'}), 400
    
    try:
        # Create the quote with empty project fields
        quote_id = Quote.create(customer, quote_no, description, sales_rep,
                                None, None, None)
        # Log creation event
        Event.create(quote_id, 'Quote created')
        
        # If create_project flag is set, handle project creation
        if data.get('create_project') and sales_rep and data.get('spreadsheet_id'):
            try:
                gas_api = ConfigService.get_gas_api()
                
                # Make the API call to create the project
                project_result = gas_api.create_project({
                    'customerName': customer,
                    'projectDescription': data.get('project_description', description),
                    'estimateNumber': quote_no,
                    'salesRep': sales_rep,
                    'spreadsheetId': data.get('spreadsheet_id')
                })
                
                # Update the quote with project links
                Quote.update(quote_id, customer, quote_no, description, sales_rep,
                             project_result.get('sheetUrl'),
                             project_result.get('mpsfLink'),
                             project_result.get('folderLink'))
                             
                print(f"Project creation result: {project_result}")  # Debug logging
                             
            except Exception as e:
                # Don't fail quote creation if project creation fails
                print(f"Project creation failed: {e}")
                return jsonify({
                    'id': quote_id, 
                    'message': 'Quote created, but project creation failed',
                    'project_error': str(e)
                }), 201
        
        return jsonify({'id': quote_id, 'message': 'Quote created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@quotes_bp.route('/quotes/<int:quote_id>', methods=['PUT'])
def update_quote(quote_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    customer = data.get('customer')
    quote_no = data.get('quote_no')
    description = data.get('description')
    sales_rep = data.get('sales_rep')
    project_sheet_url = data.get('project_sheet_url')
    mpsf_link = data.get('mpsf_link')
    folder_link = data.get('folder_link')
    method_link = data.get('method_link')
    hidden = data.get('hidden')  # Can be None, in which case it won't be updated
    
    if not customer or not quote_no:
        return jsonify({'error': 'Customer and quote number are required'}), 400
    
    old_quote = Quote.get_by_id(quote_id)
    if not old_quote:
        return jsonify({'error': 'Quote not found'}), 404

    if Quote.update(quote_id, customer, quote_no, description, sales_rep,
                    project_sheet_url, mpsf_link, folder_link, method_link, hidden):
        # Determine what changed
        old_values = {}
        fields = [
            ('customer', customer),
            ('quote_no', quote_no),
            ('description', description),
            ('sales_rep', sales_rep),
            ('project_sheet_url', project_sheet_url),
            ('mpsf_link', mpsf_link),
            ('folder_link', folder_link),
            ('method_link', method_link)
        ]
        for field, new_value in fields:
            if getattr(old_quote, field) != new_value:
                old_values[field] = getattr(old_quote, field)
        if hidden is not None and old_quote.hidden != hidden:
            old_values['hidden'] = old_quote.hidden

        if old_values:
            Event.create(quote_id, 'Quote updated', json.dumps(old_values))

        return jsonify({'message': 'Quote updated successfully'})
    else:
        return jsonify({'error': 'Quote not found or no changes made'}), 404

@quotes_bp.route('/quotes/<int:quote_id>', methods=['DELETE'])
def delete_quote(quote_id):
    if Quote.delete(quote_id):
        return jsonify({'message': 'Quote deleted successfully'})
    else:
        return jsonify({'error': 'Quote not found'}), 404
