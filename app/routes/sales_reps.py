from flask import Blueprint, request, jsonify
from app.models.sales_rep import SalesRep

sales_reps_bp = Blueprint('sales_reps', __name__, url_prefix='/api/sales-reps')

@sales_reps_bp.route('/', methods=['GET'])
def get_sales_reps():
    """Get all sales reps with optional filtering"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        sales_reps = SalesRep.get_all(active_only=active_only)

        # Format phone numbers for display
        formatted_reps = []
        for rep in sales_reps:
            formatted_rep = rep.copy()
            if formatted_rep['phone']:
                formatted_rep['phone'] = SalesRep.format_phone(formatted_rep['phone'])
            formatted_reps.append(formatted_rep)

        return jsonify({
            'success': True,
            'data': formatted_reps
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@sales_reps_bp.route('/', methods=['POST'])
def create_sales_rep():
    """Create a new sales rep"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'error': 'Sales rep name is required'
            }), 400

        # Validate email uniqueness if provided
        if 'email' in data and data['email']:
            existing_rep = SalesRep.get_by_email(data['email'])
            if existing_rep:
                return jsonify({
                    'success': False,
                    'error': 'Email already exists'
                }), 400

        rep_id = SalesRep.create(
            name=data['name'],
            email=data.get('email'),
            phone=data.get('phone'),
            is_active=data.get('is_active', True)
        )

        # Return the created sales rep
        created_rep = SalesRep.get_by_id(rep_id)
        if created_rep and created_rep['phone']:
            created_rep['phone'] = SalesRep.format_phone(created_rep['phone'])

        return jsonify({
            'success': True,
            'data': created_rep
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@sales_reps_bp.route('/<int:rep_id>', methods=['GET'])
def get_sales_rep(rep_id):
    """Get sales rep by ID"""
    try:
        sales_rep = SalesRep.get_by_id(rep_id)

        if not sales_rep:
            return jsonify({
                'success': False,
                'error': 'Sales rep not found'
            }), 404

        # Format phone number for display
        if sales_rep['phone']:
            sales_rep['phone'] = SalesRep.format_phone(sales_rep['phone'])

        return jsonify({
            'success': True,
            'data': sales_rep
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@sales_reps_bp.route('/<int:rep_id>', methods=['PUT'])
def update_sales_rep(rep_id):
    """Update sales rep information"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        # Check if sales rep exists
        existing_rep = SalesRep.get_by_id(rep_id)
        if not existing_rep:
            return jsonify({
                'success': False,
                'error': 'Sales rep not found'
            }), 404

        # Validate email uniqueness if provided and different from current
        if 'email' in data and data['email'] and data['email'] != existing_rep['email']:
            email_check = SalesRep.get_by_email(data['email'])
            if email_check and email_check['id'] != rep_id:
                return jsonify({
                    'success': False,
                    'error': 'Email already exists'
                }), 400

        success = SalesRep.update(
            rep_id=rep_id,
            name=data.get('name'),
            email=data.get('email'),
            phone=data.get('phone'),
            is_active=data.get('is_active')
        )

        if success:
            # Return the updated sales rep
            updated_rep = SalesRep.get_by_id(rep_id)
            if updated_rep and updated_rep['phone']:
                updated_rep['phone'] = SalesRep.format_phone(updated_rep['phone'])

            return jsonify({
                'success': True,
                'data': updated_rep
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Sales rep not found or no changes made'
            }), 404

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@sales_reps_bp.route('/<int:rep_id>', methods=['DELETE'])
def delete_sales_rep(rep_id):
    """Delete sales rep (sets is_active=False)"""
    try:
        # Check if sales rep exists
        existing_rep = SalesRep.get_by_id(rep_id)
        if not existing_rep:
            return jsonify({
                'success': False,
                'error': 'Sales rep not found'
            }), 404

        success = SalesRep.delete(rep_id)

        if success:
            return jsonify({
                'success': True
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Sales rep not found'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@sales_reps_bp.route('/migrate', methods=['POST'])
def migrate_legacy_sales_reps():
    """Migrate legacy string sales reps to structured format"""
    try:
        # First migrate sales reps from strings to sales_reps table
        migrated_reps = SalesRep.migrate_from_string_sales_reps()

        # Then update quotes to use sales_rep_id
        updated_quotes = SalesRep.migrate_quotes_to_sales_rep_ids()

        return jsonify({
            'success': True,
            'data': {
                'migrated_sales_reps': migrated_reps,
                'updated_quotes': updated_quotes,
                'message': f'Successfully migrated {migrated_reps} sales reps and updated {updated_quotes} quotes'
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@sales_reps_bp.route('/validate-email', methods=['POST'])
def validate_email():
    """Validate email format and uniqueness"""
    try:
        data = request.get_json()

        if not data or 'email' not in data:
            return jsonify({
                'success': False,
                'error': 'Email is required'
            }), 400

        email = data['email'].strip() if data['email'] else ''

        # Validate format
        if not SalesRep.validate_email(email):
            return jsonify({
                'success': False,
                'error': 'Invalid email format'
            })

        # Check uniqueness (optional exclude current rep)
        exclude_id = data.get('exclude_id')
        if email:
            existing_rep = SalesRep.get_by_email(email)
            if existing_rep and (not exclude_id or existing_rep['id'] != exclude_id):
                return jsonify({
                    'success': False,
                    'error': 'Email already exists'
                })

        return jsonify({
            'success': True,
            'message': 'Email is valid and available'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500