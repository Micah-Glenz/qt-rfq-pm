from flask import Blueprint, request, jsonify
from app.models import Quote, Task, VendorQuote, Note

quotes_bp = Blueprint('quotes', __name__, url_prefix='/api')

@quotes_bp.route('/quotes', methods=['GET'])
def get_quotes():
    search = request.args.get('search', '')
    quotes = Quote.get_all(search)
    return jsonify(quotes)

@quotes_bp.route('/quotes/<int:quote_id>', methods=['GET'])
def get_quote(quote_id):
    quote = Quote.get_by_id(quote_id)
    if not quote:
        return jsonify({'error': 'Quote not found'}), 404
    
    tasks = Task.get_by_quote_id(quote_id)
    vendor_quotes = VendorQuote.get_by_quote_id(quote_id)
    notes = Note.get_by_quote_id(quote_id)
    
    result = {
        'id': quote.id,
        'customer': quote.customer,
        'quote_no': quote.quote_no,
        'description': quote.description,
        'sales_rep': quote.sales_rep,
        'created_at': quote.created_at,
        'updated_at': quote.updated_at,
        'tasks': tasks,
        'vendor_quotes': vendor_quotes,
        'notes': notes
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
        quote_id = Quote.create(customer, quote_no, description, sales_rep)
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
    
    if not customer or not quote_no:
        return jsonify({'error': 'Customer and quote number are required'}), 400
    
    if Quote.update(quote_id, customer, quote_no, description, sales_rep):
        return jsonify({'message': 'Quote updated successfully'})
    else:
        return jsonify({'error': 'Quote not found or no changes made'}), 404

@quotes_bp.route('/quotes/<int:quote_id>', methods=['DELETE'])
def delete_quote(quote_id):
    if Quote.delete(quote_id):
        return jsonify({'message': 'Quote deleted successfully'})
    else:
        return jsonify({'error': 'Quote not found'}), 404
