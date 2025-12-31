from flask import Blueprint, request, jsonify
from app.models.email_template import EmailTemplate
from app.models.email_history import EmailHistory
from app.models.vendor import Vendor
from app.models.vendor_quote import VendorQuote
from app.models.quote import Quote
from app.services.config_service import ConfigService
from datetime import datetime
import re

# Create blueprint
email_bp = Blueprint('email', __name__, url_prefix='/api')

# Initialize GAS API with proper config service
gas_api = ConfigService.get_gas_api()

# ================== EMAIL VALIDATION HELPERS ==================

def validate_email(email):
    """Validate a single email address"""
    if not email or not email.strip():
        return False

    email = email.strip()
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def parse_email_recipients(email_string):
    """Parse comma-separated email string into a list of valid emails"""
    if not email_string:
        return []

    # Split by comma and clean up
    emails = [email.strip() for email in email_string.split(',')]

    # Filter out empty strings and validate each email
    valid_emails = []
    for email in emails:
        if email and validate_email(email):
            valid_emails.append(email)

    return valid_emails

def validate_cc_bcc_emails(cc_data, bcc_data):
    """Validate and parse CC/BCC email data"""
    cc_emails = []
    bcc_emails = []

    # Handle CC emails
    if cc_data:
        if isinstance(cc_data, list):
            cc_emails = [email for email in cc_data if validate_email(email)]
        elif isinstance(cc_data, str):
            cc_emails = parse_email_recipients(cc_data)

    # Handle BCC emails
    if bcc_data:
        if isinstance(bcc_data, list):
            bcc_emails = [email for email in bcc_data if validate_email(email)]
        elif isinstance(bcc_data, str):
            bcc_emails = parse_email_recipients(bcc_data)

    return cc_emails, bcc_emails

def get_auto_cc_recipients(variables, is_test_mode=False):
    """Extract auto-CC recipients from quote data and configuration"""
    auto_cc_emails = []
    config = ConfigService.get_config()
    auto_cc_config = config.get('auto_cc', {})

    # Check if auto-CC is enabled
    if not auto_cc_config.get('enabled', True):
        return auto_cc_emails

    # Skip auto-CC in test mode unless configured otherwise
    if is_test_mode and not auto_cc_config.get('cc_in_test_mode', False):
        return auto_cc_emails

    # Add James email if configured
    james_email = auto_cc_config.get('james_email')
    if james_email and validate_email(james_email):
        auto_cc_emails.append(james_email)

    # Add sales rep email if enabled and available
    if auto_cc_config.get('sales_rep_auto_cc', True):
        sales_rep_email = variables.get('sales_rep_email')
        if sales_rep_email and validate_email(sales_rep_email):
            # Check for duplicates before adding
            if sales_rep_email not in auto_cc_emails:
                auto_cc_emails.append(sales_rep_email)

    return auto_cc_emails

# ================== EMAIL TEMPLATES ==================

@email_bp.route('/email-templates/specialties', methods=['GET'])
def get_template_specialties():
    """Get all available template specialties with counts"""
    try:
        specialties = EmailTemplate.get_specialties()
        return jsonify({
            'success': True,
            'data': specialties
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/email-templates/specialty/<specialty>', methods=['GET'])
def get_templates_by_specialty(specialty):
    """Get email templates for a specific specialty"""
    try:
        templates = EmailTemplate.get_by_specialty(specialty)
        return jsonify({
            'success': True,
            'data': templates
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/email-templates/specialty/<specialty>/default', methods=['GET'])
def get_default_template_for_specialty(specialty):
    """Get the default email template for a specific specialty"""
    try:
        template = EmailTemplate.get_default_for_specialty(specialty)

        if not template:
            return jsonify({
                'success': False,
                'error': f'No default template found for specialty: {specialty}'
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

@email_bp.route('/email-templates/for-vendor/<int:vendor_id>', methods=['GET'])
def get_template_for_vendor(vendor_id):
    """Get the best template for a vendor based on their specialization"""
    try:
        # Get vendor information to determine specialization
        vendor = Vendor.get_by_id(vendor_id)
        if not vendor:
            return jsonify({
                'success': False,
                'error': 'Vendor not found'
            }), 404

        # Get template based on vendor's specialization
        template = EmailTemplate.get_template_for_vendor(vendor.get('specialization', 'general'))

        if not template:
            return jsonify({
                'success': False,
                'error': 'No templates available for this vendor type'
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

@email_bp.route('/email-templates', methods=['GET'])
def get_email_templates():
    """Get all email templates grouped by specialty with optional filtering"""
    try:
        query = request.args.get('search')
        specialty = request.args.get('specialty')
        include_all = request.args.get('include_all', 'false').lower() == 'true'
        flat_format = request.args.get('flat', 'true').lower() == 'true'  # Default to flat for backward compatibility

        if specialty:
            # Get templates for specific specialty
            templates = EmailTemplate.get_by_specialty(specialty, include_all)
        elif query:
            # Search templates - always return flat array
            templates = EmailTemplate.search(query)
        elif flat_format:
            # Return flat array for backward compatibility
            templates = EmailTemplate.get_all()
        else:
            # Get all templates grouped by specialty
            templates = EmailTemplate.get_by_specialties()

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
    """Create a new email template with specialty-based categorization"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['name', 'specialty', 'subject_template', 'body_template']
        if not data or not all(field in data for field in required_fields):
            return jsonify({
                'success': False,
                'error': f'Required fields: {", ".join(required_fields)}'
            }), 400

        # Validate specialty
        valid_specialties = ['freight', 'install', 'forward', 'general']
        if data['specialty'] not in valid_specialties:
            return jsonify({
                'success': False,
                'error': f'Invalid specialty. Must be one of: {", ".join(valid_specialties)}'
            }), 400

        template_id = EmailTemplate.create(
            name=data['name'],
            specialty=data['specialty'],
            subject_template=data['subject_template'],
            body_template=data['body_template'],
            is_default=data.get('is_default', False)
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

        # Validate specialty if provided
        if 'specialty' in data:
            valid_specialties = ['freight', 'install', 'forward', 'general']
            if data['specialty'] not in valid_specialties:
                return jsonify({
                    'success': False,
                    'error': f'Invalid specialty. Must be one of: {", ".join(valid_specialties)}'
                }), 400

        success = EmailTemplate.update(
            template_id=template_id,
            name=data.get('name'),
            specialty=data.get('specialty'),
            subject_template=data.get('subject_template'),
            body_template=data.get('body_template'),
            is_default=data.get('is_default')
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
                'error': 'Cannot delete default template or template not found'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@email_bp.route('/email-templates/<int:template_id>/set-default', methods=['POST'])
def set_template_as_default(template_id):
    """Set a template as the default for its specialty"""
    try:
        success = EmailTemplate.set_as_default(template_id)

        if success:
            return jsonify({
                'success': True,
                'message': 'Template set as default for its specialty'
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

# ================== EMAIL AUTO-CC API ==================

@email_bp.route('/vendor-quotes/<int:vendor_quote_id>/auto-cc-info', methods=['GET'])
def get_auto_cc_info(vendor_quote_id):
    """Get auto-CC information for a vendor quote"""
    try:
        # Gather variables for the vendor quote
        variables = _gather_variables_for_vendor_quote(vendor_quote_id)

        # Validate we have the necessary data
        if not variables.get('quote_id'):
            return jsonify({
                'success': False,
                'error': 'Unable to find vendor quote details'
            }), 404

        # Get quote information to determine test mode status
        quote = Quote.get_by_id(variables['quote_id'])
        if not quote:
            return jsonify({
                'success': False,
                'error': 'Quote not found'
            }), 404

        # Determine test mode
        config = ConfigService.get_config()
        is_test_mode = config.get('email_test_mode', False)

        # Get auto-CC recipients
        auto_cc_emails = get_auto_cc_recipients(variables, is_test_mode)

        # Build auto-CC recipient information with details
        auto_cc_recipients = []

        # Add James email info
        james_email = config.get('auto_cc', {}).get('james_email')
        if james_email and james_email in auto_cc_emails:
            auto_cc_recipients.append({
                'email': james_email,
                'source_type': 'james_email',
                'allow_user_override': config.get('auto_cc', {}).get('allow_user_override', True),
                'include_in_test_mode': config.get('auto_cc', {}).get('cc_in_test_mode', False)
            })

        # Add sales rep info
        sales_rep_email = variables.get('sales_rep_email')
        sales_rep_name = variables.get('sales_rep')
        if sales_rep_email and sales_rep_email in auto_cc_emails:
            auto_cc_recipients.append({
                'email': sales_rep_email,
                'source_type': 'sales_rep',
                'allow_user_override': config.get('auto_cc', {}).get('allow_user_override', True),
                'include_in_test_mode': config.get('auto_cc', {}).get('cc_in_test_mode', False)
            })

        # Return configuration and recipient info
        return jsonify({
            'success': True,
            'data': {
                'auto_cc_enabled': config.get('auto_cc', {}).get('enabled', True),
                'auto_cc_recipients': auto_cc_recipients,
                'is_test_mode': is_test_mode,
                'cc_in_test_mode': config.get('auto_cc', {}).get('cc_in_test_mode', False),
                'allow_user_override': config.get('auto_cc', {}).get('allow_user_override', True)
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ================== EMAIL SENDING ==================

@email_bp.route('/vendor-quotes/<int:vendor_quote_id>/send-email', methods=['POST'])
def send_vendor_email(vendor_quote_id):
    """Send email to vendor with automatic template selection based on vendor specialty"""
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

        # Update variables with actual quote data and enhanced sales rep information
        sales_rep_name = quote['sales_rep'] or ''
        sales_rep_email = ''
        sales_rep_phone = ''

        # If we have sales_rep_info (from JOIN with sales_reps table), use it
        if 'sales_rep_info' in quote and quote['sales_rep_info']:
            rep_info = quote['sales_rep_info']
            sales_rep_name = rep_info.get('name', sales_rep_name)
            sales_rep_email = rep_info.get('email', '')
            sales_rep_phone = rep_info.get('phone', '')

        variables.update({
            'customer': quote['customer'],
            'quote_no': quote['quote_no'],
            'description': quote['description'] or '',
            'sales_rep': sales_rep_name,
            'sales_rep_email': sales_rep_email,
            'sales_rep_phone': sales_rep_phone
        })

        # Determine email content
        subject = data.get('subject')
        body = data.get('body')

        # Auto-select template based on vendor specialty if no template_id provided
        if 'template_id' in data:
            template = EmailTemplate.get_by_id(data['template_id'])
            if not template:
                return jsonify({
                    'success': False,
                    'error': 'Template not found'
                }), 404
        else:
            # Auto-select template based on vendor's specialization
            template = EmailTemplate.get_template_for_vendor(vendor.get('specialization', 'general'))
            if not template:
                return jsonify({
                    'success': False,
                    'error': f'No template available for vendor specialty: {vendor.get("specialization", "general")}'
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

        # Validate primary recipient email
        if not validate_email(to_email):
            return jsonify({
                'success': False,
                'error': f'Invalid primary recipient email: {to_email}'
            }), 400

        # Get auto-CC recipients
        auto_cc_emails = get_auto_cc_recipients(variables, is_test_mode)

        # Validate and parse CC/BCC emails
        cc_emails, bcc_emails = validate_cc_bcc_emails(data.get('cc'), data.get('bcc'))

        # Check if user overrides are allowed
        config = ConfigService.get_config()
        allow_user_override = config.get('auto_cc', {}).get('allow_user_override', True)

        # Handle CC merging based on user override setting
        if allow_user_override:
            # User overrides allowed - intelligently determine user intent
            # If user provided CC emails, use those as the base and add any auto-CC not already present
            # If user provided no CC emails, use auto-CC as the base
            all_cc_emails = cc_emails.copy() if cc_emails else auto_cc_emails.copy()

            # Add any missing auto-CC emails (this handles cases where user added some CC but didn't include all auto-CC)
            for auto_cc_email in auto_cc_emails:
                if auto_cc_email not in all_cc_emails:
                    all_cc_emails.append(auto_cc_email)
        else:
            # User overrides not allowed - always merge auto-CC with manual CC
            all_cc_emails = cc_emails.copy()
            for auto_cc_email in auto_cc_emails:
                if auto_cc_email not in all_cc_emails:
                    all_cc_emails.append(auto_cc_email)

        # Add optional fields (already validated as strings)
        if all_cc_emails:
            # Convert to comma-separated string for Google Apps Script compatibility
            email_data['cc'] = ', '.join(all_cc_emails) if isinstance(all_cc_emails, list) else all_cc_emails
        if bcc_emails:
            # Convert to comma-separated string for Google Apps Script compatibility
            email_data['bcc'] = ', '.join(bcc_emails) if isinstance(bcc_emails, list) else bcc_emails
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
        status = 'test_sent' if to_email == test_email else 'sent'
        email_status = 'current'  # New emails are always 'current' by default

        history_id = EmailHistory.create(
            quote_id=variables['quote_id'],
            vendor_quote_id=vendor_quote_id,
            vendor_id=vendor['id'],
            to_email=to_email,
            subject=subject,
            body=body,
            template_id=template['id'],
            status=status,
            email_status=email_status,
            gas_response=str(gas_response),
            cc_emails=all_cc_emails,  # Include all CC recipients (auto + manual)
            bcc_emails=bcc_emails
        )

        # Update vendor quote status to 'Sent' when email is successfully sent
        if gas_response and not is_test_mode:
            try:
                from app.db import DatabaseContext
                with DatabaseContext() as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        UPDATE vendor_quotes
                        SET status = 'Sent'
                        WHERE id = ?
                    ''', (vendor_quote_id,))
                    conn.commit()
                    print(f"Updated vendor quote {vendor_quote_id} status to 'Sent'")
            except Exception as update_error:
                print(f"Warning: Failed to update vendor quote status: {update_error}")

        return jsonify({
            'success': True,
            'data': {
                'email_id': history_id,
                'final_subject': subject,
                'final_body': body,
                'template_used': template,
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

@email_bp.route('/vendor-quotes/<int:vendor_quote_id>/email-history', methods=['GET'])
def get_email_history_by_vendor_quote(vendor_quote_id):
    """Get email history for a specific vendor quote"""
    try:
        history = EmailHistory.get_by_vendor_quote(vendor_quote_id)

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

@email_bp.route('/email-history/<int:email_id>/status', methods=['PUT'])
def update_email_status(email_id):
    """Update the email_status of an email history record"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'email_status' not in data:
            return jsonify({
                'success': False,
                'error': 'email_status field is required'
            }), 400

        # Validate email_status value
        valid_statuses = ['current', 'superceded']
        email_status = data['email_status']

        if email_status not in valid_statuses:
            return jsonify({
                'success': False,
                'error': f'email_status must be one of: {", ".join(valid_statuses)}'
            }), 400

        # Update the email status
        success = EmailHistory.update_email_status(email_id, email_status)

        if success:
            # Get updated email record
            updated_email = EmailHistory.get_by_id(email_id)
            return jsonify({
                'success': True,
                'data': updated_email,
                'message': f'Email status updated to {email_status}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Email not found or update failed'
            }), 404

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

                    # Extract sales rep information with enhanced details
                    sales_rep_name = quote_obj['sales_rep'] or ''
                    sales_rep_email = ''
                    sales_rep_phone = ''

                    # If we have sales_rep_info (from JOIN with sales_reps table), use it
                    if 'sales_rep_info' in quote_obj and quote_obj['sales_rep_info']:
                        rep_info = quote_obj['sales_rep_info']
                        sales_rep_name = rep_info.get('name', sales_rep_name)
                        sales_rep_email = rep_info.get('email', '')
                        sales_rep_phone = rep_info.get('phone', '')

                    # Return all available variables
                    return {
                        'customer': quote_obj['customer'],
                        'quote_no': quote_obj['quote_no'],
                        'description': quote_obj['description'] or '',
                        'sales_rep': sales_rep_name,
                        'sales_rep_email': sales_rep_email,
                        'sales_rep_phone': sales_rep_phone,
                        'vendor_name': vendor.get('name', ''),
                        'contact_name': vendor.get('contact_name', ''),
                        'vendor_email': vendor.get('email', ''),
                        'vendor_phone': vendor.get('phone', ''),
                        'quote_type': vq.get('type', ''),
                        'pickup_location': '',  # These can be added later if needed
                        'delivery_location': '',
                        'installation_location': '',
                        'origin_location': '',
                        'destination_location': '',
                        'scope_of_work': '',
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