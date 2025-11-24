from flask import Blueprint, request, jsonify
from app.models.vendor_quote import VendorQuote

vendor_quotes_bp = Blueprint('vendor_quotes', __name__, url_prefix='/api')

@vendor_quotes_bp.route('/vendor-quotes/quote/<int:quote_id>', methods=['GET'])
def get_vendor_quotes(quote_id):
    vendor_quotes = VendorQuote.get_by_quote_id(quote_id)
    return jsonify(vendor_quotes)

@vendor_quotes_bp.route('/vendor-quotes', methods=['POST'])
def create_vendor_quote():
    """Legacy vendor quote creation for backward compatibility"""
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
    """Legacy vendor quote update for backward compatibility"""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    type_ = data.get('type')
    vendor = data.get('vendor')
    requested = data.get('requested')
    entered = data.get('entered')
    notes = data.get('notes')
    date = data.get('date')

    if type_ and type_ not in ['freight', 'install', 'forward']:
        return jsonify({'error': 'Type must be either "freight", "install", or "forward"'}), 400

    if VendorQuote.update(vendor_quote_id, type_, vendor, requested, entered, notes, date):
        return jsonify({'message': 'Vendor quote updated successfully'})
    else:
        return jsonify({'error': 'Vendor quote not found or no changes made'}), 404

@vendor_quotes_bp.route('/vendor-quotes/<int:vendor_quote_id>', methods=['DELETE'])
def delete_vendor_quote(vendor_quote_id):
    """Delete a vendor quote"""
    if VendorQuote.delete(vendor_quote_id):
        return jsonify({'message': 'Vendor quote deleted successfully'})
    else:
        return jsonify({'error': 'Vendor quote not found'}), 404

@vendor_quotes_bp.route('/quotes/<int:quote_id>/vendor-quotes', methods=['POST'])
def create_vendor_quote_for_quote(quote_id):
    """Create a vendor quote for a specific quote (legacy method)"""
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

# Enhanced vendor quote endpoints
@vendor_quotes_bp.route('/quotes/<int:quote_id>/vendor-quotes/enhanced', methods=['POST'])
def create_enhanced_vendor_quote(quote_id):
    """Create a new enhanced vendor quote with cost, lead time, and status tracking"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        vendor_id = data.get('vendor_id')
        type_ = data.get('type')
        status = data.get('status', 'draft')
        cost = data.get('cost')
        lead_time_days = data.get('lead_time_days')
        valid_until = data.get('valid_until')
        quote_date = data.get('quote_date')
        contact_person = data.get('contact_person')
        notes = data.get('notes')

        if not vendor_id or not type_:
            return jsonify({'error': 'Vendor ID and type are required'}), 400

        if type_ not in ['freight', 'install', 'forward']:
            return jsonify({'error': 'Type must be either "freight", "install", or "forward"'}), 400

        valid_statuses = ['draft', 'requested', 'received', 'reviewing', 'selected', 'rejected', 'expired']
        if status not in valid_statuses:
            return jsonify({'error': f'Status must be one of: {", ".join(valid_statuses)}'}), 400

        vendor_quote_id = VendorQuote.create_enhanced(
            quote_id=quote_id,
            vendor_id=vendor_id,
            type=type_,
            status=status,
            cost=cost,
            lead_time_days=lead_time_days,
            valid_until=valid_until,
            quote_date=quote_date,
            contact_person=contact_person,
            notes=notes
        )

        return jsonify({
            'id': vendor_quote_id,
            'message': 'Enhanced vendor quote created successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@vendor_quotes_bp.route('/vendor-quotes/<int:vendor_quote_id>/enhanced', methods=['PUT'])
def update_enhanced_vendor_quote(vendor_quote_id):
    """Update enhanced vendor quote fields (cost, lead time, status, etc.)"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        status = data.get('status')
        cost = data.get('cost')
        lead_time_days = data.get('lead_time_days')
        valid_until = data.get('valid_until')
        quote_date = data.get('quote_date')
        contact_person = data.get('contact_person')
        notes = data.get('notes')

        if status is not None:
            valid_statuses = ['draft', 'requested', 'received', 'reviewing', 'selected', 'rejected', 'expired']
            if status not in valid_statuses:
                return jsonify({'error': f'Status must be one of: {", ".join(valid_statuses)}'}), 400

        if VendorQuote.update_enhanced(
            vendor_quote_id=vendor_quote_id,
            status=status,
            cost=cost,
            lead_time_days=lead_time_days,
            valid_until=valid_until,
            quote_date=quote_date,
            contact_person=contact_person,
            notes=notes
        ):
            return jsonify({'message': 'Enhanced vendor quote updated successfully'})
        else:
            return jsonify({'error': 'Vendor quote not found or no changes made'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 400