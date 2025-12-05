from flask import Blueprint, request, jsonify
from app.models.email_template import EmailTemplate
from app.models.email_history import EmailHistory
from app.models.vendor import Vendor
from app.models.vendor_quote import VendorQuote
from app.models.quote import Quote
from app.services.config_service import ConfigService
from datetime import datetime

# Create blueprint
email_bp = Blueprint('email', __name__, url_prefix='/api')

# Initialize GAS API with proper config service
gas_api = ConfigService.get_gas_api()

# ================== EMAIL TEMPLATES ==================

@email_bp.route('/email-templates', methods=['GET'])
def get_email_templates():
    """Get all email templates with optional filtering"""
    try:
        query = request.args.get('search')

        if query:
            templates = EmailTemplate.search(query)
        else:
            templates = EmailTemplate.get_all()

        return jsonify({
            'success': True,
            'data': templates
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/email-templates', methods=['POST'])
def create_email_template():
    """Create a new email template"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'vendor_id' not in data or 'subject_template' not in data or 'body_template' not in data:
            return jsonify({
                'success': False,
                'error': 'vendor_id, subject_template, and body_template are required'
            }), 400

        # Validate vendor exists
        vendor = Vendor.get_by_id(data['vendor_id'])
        if not vendor:
            return jsonify({
                'success': False,
                'error': 'Vendor not found'
            }), 404

        template_id = EmailTemplate.create(
            vendor_id=data['vendor_id'],
            subject_template=data['subject_template'],
            body_template=data['body_template']
        )

        # Return the created template
        template = EmailTemplate.get_by_id(template_id)
        return jsonify({
            'success': True,
            'data': template
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/email-templates/<int:template_id>', methods=['GET'])
def get_email_template(template_id):
    """Get email template by ID"""
    try:
        template = EmailTemplate.get_by_id(template_id)

        if not template:
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

        return jsonify({
            'success': True,
            'data': template
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/email-templates/<int:template_id>', methods=['PUT'])
def update_email_template(template_id):
    """Update email template"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        success = EmailTemplate.update(
            template_id=template_id,
            subject_template=data.get('subject_template'),
            body_template=data.get('body_template')
        )

        if success:
            # Return the updated template
            template = EmailTemplate.get_by_id(template_id)
            return jsonify({
                'success': True,
                'data': template
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Template not found or no changes made'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/email-templates/<int:template_id>', methods=['DELETE'])
def delete_email_template(template_id):
    """Delete email template"""
    try:
        success = EmailTemplate.delete(template_id)

        if success:
            return jsonify({
                'success': True
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/email-templates/<int:template_id>/preview', methods=['GET'])
def preview_email_template(template_id):
    """Preview email template with variable substitution"""
    try:
        # Get optional variables from query parameters
        variables = {}

        # Get vendor_quote_id if provided to gather context variables
        vendor_quote_id = request.args.get('vendor_quote_id')
        if vendor_quote_id:
            variables = _gather_variables_for_vendor_quote(int(vendor_quote_id))

        # Add any custom variables from query params
        for key, value in request.args.items():
            if key not in ['vendor_quote_id']:
                variables[key] = value

        preview = EmailTemplate.get_preview(template_id, variables)

        if not preview:
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

        return jsonify({
            'success': True,
            'data': preview
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ================== EMAIL SENDING ==================

@email_bp.route('/vendor-quotes/<int:vendor_quote_id>/send-email', methods=['POST'])
def send_vendor_email(vendor_quote_id):
    """Send email to vendor with optional template and variable substitution"""
    try:
        data = request.get_json()

        # Gather variables for substitution
        variables = _gather_variables_for_vendor_quote(vendor_quote_id)

        # Validate we have the necessary data
        if not variables.get('vendor_id') or not variables.get('quote_id'):
            return jsonify({
                'success': False,
                'error': 'Unable to find vendor quote details'
            }), 404

        # Get vendor information
        vendor = Vendor.get_by_id(variables['vendor_id'])
        if not vendor:
            return jsonify({
                'success': False,
                'error': 'Vendor not found'
            }), 404

        # Get quote information
        quote = Quote.get_by_id(variables['quote_id'])
        if not quote:
            return jsonify({
                'success': False,
                'error': 'Quote not found'
            }), 404

        # Update variables with actual quote data
        variables.update({
            'customer': quote.customer,
            'quote_no': quote.quote_no,
            'description': quote.description or '',
            'sales_rep': quote.sales_rep or ''
        })

        # Determine email content
        subject = data.get('subject')
        body = data.get('body')

        # If template_id is provided, use template
        if 'template_id' in data:
            template = EmailTemplate.get_by_id(data['template_id'])
            if not template:
                return jsonify({
                    'success': False,
                    'error': 'Template not found'
                }), 404

            # Substitute variables in template
            subject = EmailTemplate.substitute_variables(template['subject_template'], variables)
            body = EmailTemplate.substitute_variables(template['body_template'], variables)

        # Override with custom content if provided
        if data.get('subject'):
            subject = EmailTemplate.substitute_variables(data['subject'], variables)
        if data.get('body'):
            body = EmailTemplate.substitute_variables(data['body'], variables)

        # Determine recipient - prioritize vendor email
        # Check if we're in test mode (can be overridden via config or request)
        is_test_mode = data.get('test_mode', False)
        config = ConfigService.get_config()
        is_test_mode = is_test_mode or config.get('email_test_mode', False)

        # Define test email fallback
        test_email = 'micah+gasapitest@commfitness.com'

        if is_test_mode:
            # Test mode: always use test email
            to_email = data.get('to_email') or test_email
        else:
            # Production mode: use vendor email or custom email
            to_email = data.get('to_email') or vendor.get('email')
            if not to_email:
                # No vendor email available, use test email as fallback
                to_email = test_email
                # Note: In production, you might want to handle this differently
                print(f"Warning: No email found for vendor {vendor.get('name')}, using test email")

        # Prepare email data for GAS API
        email_data = {
            'to': to_email,
            'subject': subject,
            'body': body,
            'quote_id': variables['quote_id'],
            'vendor_quote_id': vendor_quote_id,
            'vendor_id': vendor['id']
        }

        # Add optional fields
        if 'cc' in data:
            email_data['cc'] = data['cc']
        if 'bcc' in data:
            email_data['bcc'] = data['bcc']
        if 'fromName' in data:
            email_data['fromName'] = data['fromName']
        if 'replyTo' in data:
            email_data['replyTo'] = data['replyTo']

        # Validate that GAS API is properly configured
        config = ConfigService.get_config()
        if not config.get('gas_api_url') or 'your-script-id' in config.get('gas_api_url', ''):
            return jsonify({
                'success': False,
                'error': 'Email service not properly configured. Please update config.json with your deployed Google Apps Script URL.'
            }), 500

        # Send email via GAS API
        gas_response = gas_api.send_vendor_email(email_data)

        # Create email history record
        # Determine status based on whether we're using test email
        status = 'test_sent' if to_email == test_email else 'sent'

        history_id = EmailHistory.create(
            quote_id=variables['quote_id'],
            vendor_quote_id=vendor_quote_id,
            vendor_id=vendor['id'],
            to_email=to_email,
            subject=subject,
            body=body,
            template_id=data.get('template_id'),
            status=status,
            gas_response=str(gas_response)
        )

        return jsonify({
            'success': True,
            'data': {
                'email_id': history_id,
                'final_subject': subject,
                'final_body': body,
                'variables_used': variables,
                'gas_response': gas_response
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ================== EMAIL HISTORY ==================

@email_bp.route('/quotes/<int:quote_id>/email-history', methods=['GET'])
def get_email_history_by_quote(quote_id):
    """Get email history for a specific quote"""
    try:
        history = EmailHistory.get_by_quote(quote_id)

        return jsonify({
            'success': True,
            'data': history
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/vendors/<int:vendor_id>/email-history', methods=['GET'])
def get_email_history_by_vendor(vendor_id):
    """Get email history for a specific vendor"""
    try:
        # Note: We would need to add pagination to EmailHistory.get_by_vendor
        history = EmailHistory.get_by_vendor(vendor_id)

        return jsonify({
            'success': True,
            'data': history
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/email-history', methods=['GET'])
def get_all_email_history():
    """Get all email history with pagination and search"""
    try:
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        search = request.args.get('search')

        if search:
            history = EmailHistory.search(search, limit, offset)
        else:
            history = EmailHistory.get_all(limit, offset)

        # Get total count for pagination
        total_count = EmailHistory.get_count()

        return jsonify({
            'success': True,
            'data': history,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total': total_count
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ================== HELPER FUNCTIONS ==================

def _gather_variables_for_vendor_quote(vendor_quote_id):
    """Gather available variables for a vendor quote"""
    try:
        # We need to find the vendor quote by checking all quotes
        # This is a workaround since we don't have a direct VendorQuote.get_by_id method
        all_quotes = Quote.get_all()

        for quote in all_quotes:
            vendor_quotes = VendorQuote.get_by_quote_id(quote['id'])
            for vq in vendor_quotes:
                if vq['id'] == vendor_quote_id:
                    # Found the vendor quote, now gather all data
                    vendor_id = vq['vendor_id']
                    quote_id = vq['quote_id']

                    # Get vendor information
                    vendor = Vendor.get_by_id(vendor_id)
                    if not vendor:
                        continue

                    # Get quote information
                    quote_obj = Quote.get_by_id(quote_id)
                    if not quote_obj:
                        continue

                    # Return all available variables
                    return {
                        'customer': quote_obj.customer,
                        'quote_no': quote_obj.quote_no,
                        'description': quote_obj.description or '',
                        'sales_rep': quote_obj.sales_rep or '',
                        'vendor_name': vendor.get('name', ''),
                        'contact_name': vendor.get('contact_name', ''),
                        'vendor_email': vendor.get('email', ''),
                        'vendor_phone': vendor.get('phone', ''),
                        'quote_type': vq.get('type', ''),
                        'quote_id': quote_id,
                        'vendor_id': vendor_id,
                        'vendor_quote_id': vendor_quote_id,
                        'current_date': datetime.now().strftime('%Y-%m-%d')
                    }

        # If we get here, the vendor quote was not found
        return {
            'current_date': datetime.now().strftime('%Y-%m-%d'),
            'vendor_quote_id': vendor_quote_id
        }
    except Exception as e:
        print(f"Error gathering variables: {e}")
        return {
            'current_date': datetime.now().strftime('%Y-%m-%d'),
            'vendor_quote_id': vendor_quote_id
        }