from flask import Blueprint, request, jsonify
from app.models import Quote, VendorQuote, Note, Event
import json

from app.services.config_service import ConfigService

def clean_description(description):
    """Convert description to single line by removing line breaks"""
    if not description:
        return description
    return ' '.join(str(description).split()).strip()

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
    
    vendor_quotes = VendorQuote.get_by_quote_id(quote_id)
    notes = Note.get_by_quote_id(quote_id)
    events = Event.get_by_quote_id(quote_id)

    result = {
        'id': quote['id'],
        'customer': quote['customer'],
        'quote_no': quote['quote_no'],
        'description': quote['description'],
        'sales_rep': quote['sales_rep'],
        'sales_rep_info': quote.get('sales_rep_info'),
        'sales_rep_id': quote.get('sales_rep_id'),
        'mpsf_link': quote['mpsf_link'],
        'folder_link': quote['folder_link'],
        'method_link': quote['method_link'],
        'hidden': quote['hidden'],
        'status': quote.get('status', 'Not Started'),
        'created_at': quote['created_at'],
        'updated_at': quote['updated_at'],
        'tasks': [],  # Empty array since tasks are no longer supported
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
    description = clean_description(data.get('description'))
    sales_rep = data.get('sales_rep')
    sales_rep_id = data.get('sales_rep_id')
    
    if not customer or not quote_no:
        return jsonify({'error': 'Customer and quote number are required'}), 400
    
    try:
        # Create the quote with empty project fields
        quote_id = Quote.create(
            customer,
            quote_no,
            description,
            sales_rep,
            None,
            None,
            None,
            sales_rep_id
        )
        # Log creation event with present state
        Event.create(
            quote_id,
            'Quote created',
            None,
            json.dumps({
                'customer': customer,
                'quote_no': quote_no,
                'description': description,
                'sales_rep': sales_rep
            })
        )
        
        # If create_project flag is set, handle project creation
        if data.get('create_project') and (sales_rep or sales_rep_id):
            try:
                gas_api = ConfigService.get_gas_api()
                
                # Get the sales rep name for Google API
                sales_rep_name = sales_rep
                if sales_rep_id and not sales_rep_name:
                    # If we only have sales_rep_id, fetch the name from database
                    from app.models.sales_rep import SalesRep
                    sales_rep_obj = SalesRep.get_by_id(sales_rep_id)
                    sales_rep_name = sales_rep_obj['name'] if sales_rep_obj else 'Unknown'

                # Make the API call to create the project
                project_result = gas_api.create_project({
                    'customerName': customer,
                    'projectDescription': data.get('project_description', description),
                    'estimateNumber': quote_no,
                    'salesRep': sales_rep_name
                })
                
                # Update the quote with project links (map GAS response to database fields)
                Quote.update(quote_id, customer, quote_no, description, sales_rep,
                             project_result.get('fileUrl'),    # MPSF link
                             project_result.get('folderUrl'),  # Drive folder link
                             None,                           # No method link
                             None,                           # No hidden status change
                             sales_rep_id)                   # Pass sales_rep_id for new system
                             
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
    description = clean_description(data.get('description'))
    sales_rep = data.get('sales_rep')
    mpsf_link = data.get('mpsf_link')
    folder_link = data.get('folder_link')
    method_link = data.get('method_link')
    hidden = data.get('hidden')  # Can be None, in which case it won't be updated
    status = data.get('status')  # Can be None, in which case it won't be updated
    
    if not customer or not quote_no:
        return jsonify({'error': 'Customer and quote number are required'}), 400
    
    old_quote = Quote.get_by_id(quote_id)
    if not old_quote:
        return jsonify({'error': 'Quote not found'}), 404

    if Quote.update(quote_id, customer, quote_no, description, sales_rep,
                    mpsf_link, folder_link, method_link, hidden, None, status):
        return jsonify({'message': 'Quote updated successfully'})
    else:
        return jsonify({'error': 'Quote not found or no changes made'}), 404

@quotes_bp.route('/quotes/<int:quote_id>', methods=['DELETE'])
def delete_quote(quote_id):
    if Quote.delete(quote_id):
        return jsonify({'message': 'Quote deleted successfully'})
    else:
        return jsonify({'error': 'Quote not found'}), 404
