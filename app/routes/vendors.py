from flask import Blueprint, request, jsonify
from app.models.vendor import Vendor
from app.models.vendor_quote import VendorQuote

vendors_bp = Blueprint('vendors', __name__, url_prefix='/api/vendors')

@vendors_bp.route('/', methods=['GET'])
def get_vendors():
    """Get all vendors with optional filtering"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        specialization = request.args.get('specialization')

        if specialization:
            vendors = Vendor.get_by_specialization(specialization)
        else:
            vendors = Vendor.get_all(active_only=active_only)

        return jsonify({
            'success': True,
            'data': vendors
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vendors_bp.route('/', methods=['POST'])
def create_vendor():
    """Create a new vendor"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'error': 'Vendor name is required'
            }), 400

        vendor_id = Vendor.create(
            name=data['name'],
            contact_name=data.get('contact_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            specialization=data.get('specialization', 'general'),
            notes=data.get('notes')
        )

        return jsonify({
            'success': True,
            'data': {'id': vendor_id}
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vendors_bp.route('/<int:vendor_id>', methods=['GET'])
def get_vendor(vendor_id):
    """Get vendor by ID"""
    try:
        vendor = Vendor.get_by_id(vendor_id)

        if not vendor:
            return jsonify({
                'success': False,
                'error': 'Vendor not found'
            }), 404

        return jsonify({
            'success': True,
            'data': vendor
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vendors_bp.route('/<int:vendor_id>', methods=['PUT'])
def update_vendor(vendor_id):
    """Update vendor information"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        success = Vendor.update(
            vendor_id=vendor_id,
            name=data.get('name'),
            contact_name=data.get('contact_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            specialization=data.get('specialization'),
            is_active=data.get('is_active'),
            notes=data.get('notes')
        )

        if success:
            return jsonify({
                'success': True
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Vendor not found or no changes made'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vendors_bp.route('/<int:vendor_id>', methods=['DELETE'])
def delete_vendor(vendor_id):
    """Delete vendor (sets is_active=False)"""
    try:
        success = Vendor.delete(vendor_id)

        if success:
            return jsonify({
                'success': True
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Vendor not found'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500