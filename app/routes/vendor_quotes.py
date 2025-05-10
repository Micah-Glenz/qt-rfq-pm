from flask import Blueprint, request, jsonify
from app.models import VendorQuote

vendor_quotes_bp = Blueprint('vendor_quotes', __name__, url_prefix='/api')

@vendor_quotes_bp.route('/vendor-quotes/quote/<int:quote_id>', methods=['GET'])
def get_vendor_quotes(quote_id):
    vendor_quotes = VendorQuote.get_by_quote_id(quote_id)
    return jsonify(vendor_quotes)

@vendor_quotes_bp.route('/vendor-quotes', methods=['POST'])
def create_vendor_quote():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    quote_id = data.get('quote_id')
    type_ = data.get('type')
    vendor = data.get('vendor')
    requested = data.get('requested', False)
    entered = data.get('entered', False)
    notes = data.get('notes')
    date = data.get('date')
    
    if not quote_id or not type_ or not vendor:
        return jsonify({'error': 'Quote ID, type, and vendor are required'}), 400
    
    if type_ not in ['freight', 'install', 'forward']:
        return jsonify({'error': 'Type must be either "freight", "install", or "forward"'}), 400
    
    try:
        vendor_quote_id = VendorQuote.create(
            quote_id, type_, vendor, requested, entered, notes, date
        )
        return jsonify({
            'id': vendor_quote_id, 
            'message': 'Vendor quote created successfully'
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@vendor_quotes_bp.route('/vendor-quotes/<int:vendor_quote_id>', methods=['PUT'])
def update_vendor_quote(vendor_quote_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    type_ = data.get('type')
    vendor = data.get('vendor')
    requested = data.get('requested')
    entered = data.get('entered')
    notes = data.get('notes')
    date = data.get('date')
    
    if type_ and type_ not in ['freight', 'install']:
        return jsonify({'error': 'Type must be either "freight" or "install"'}), 400
    
    if VendorQuote.update(vendor_quote_id, type_, vendor, requested, entered, notes, date):
        return jsonify({'message': 'Vendor quote updated successfully'})
    else:
        return jsonify({'error': 'Vendor quote not found or no changes made'}), 404

@vendor_quotes_bp.route('/vendor-quotes/<int:vendor_quote_id>', methods=['DELETE'])
def delete_vendor_quote(vendor_quote_id):
    if VendorQuote.delete(vendor_quote_id):
        return jsonify({'message': 'Vendor quote deleted successfully'})
    else:
        return jsonify({'error': 'Vendor quote not found'}), 404

# Add this new route to handle creating vendor quotes for a specific quote
@vendor_quotes_bp.route('/quotes/<int:quote_id>/vendor-quotes', methods=['POST'])
def create_vendor_quote_for_quote(quote_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    type_ = data.get('type')
    vendor = data.get('vendor')
    requested = data.get('requested', False)
    entered = data.get('entered', False)
    notes = data.get('notes')
    date = data.get('date')
    
    if not type_ or not vendor:
        return jsonify({'error': 'Type and vendor are required'}), 400
    
    if type_ not in ['freight', 'install', 'forward']:
        return jsonify({'error': 'Type must be either "freight", "install", or "forward"'}), 400
    
    try:
        vendor_quote_id = VendorQuote.create(
            quote_id, type_, vendor, requested, entered, notes, date
        )
        return jsonify({
            'id': vendor_quote_id, 
            'message': 'Vendor quote created successfully'
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
