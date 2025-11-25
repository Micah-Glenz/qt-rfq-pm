"""
Standardized error handling utilities for QT RFQ application
Provides consistent error response format and logging across all endpoints
"""

import logging
import traceback
from functools import wraps
from flask import jsonify, request
from app.db_enhanced import (DatabaseError, ValidationError, ConcurrencyError,
                            format_error_response)

logger = logging.getLogger(__name__)


def handle_api_errors(operation_name: str = None):
    """
    Decorator for standardized API error handling

    Args:
        operation_name: Name of the operation for error logging

    Returns:
        Decorated function with consistent error handling
    """
    def decorator(f):
        @wraps(f)
        def wrapped_function(*args, **kwargs):
            operation = operation_name or f.__name__
            start_time = None

            try:
                # Log request start for debugging
                logger.info(f"Starting operation: {operation}")
                start_time = time.time()

                # Execute the original function
                result = f(*args, **kwargs)

                # Log successful completion
                if start_time:
                    duration = time.time() - start_time
                    logger.info(f"Operation {operation} completed successfully in {duration:.3f}s")

                return result

            except ValidationError as e:
                logger.warning(f"Validation error in {operation}: {e}")
                response = format_error_response(e, operation)
                return jsonify(response), 400

            except ConcurrencyError as e:
                logger.warning(f"Concurrency error in {operation}: {e}")
                response = format_error_response(e, operation)
                return jsonify(response), 409

            except DatabaseError as e:
                logger.error(f"Database error in {operation}: {e}")
                if e.original_error:
                    logger.error(f"Original error: {e.original_error}")
                response = format_error_response(e, operation)
                return jsonify(response), 500

            except Exception as e:
                logger.error(f"Unexpected error in {operation}: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                response = format_error_response(e, operation)
                return jsonify(response), 500

        return wrapped_function
    return decorator


def validate_request_data(required_fields: list = None, optional_fields: list = None):
    """
    Decorator to validate request data

    Args:
        required_fields: List of required field names
        optional_fields: List of optional field names (for validation only)

    Returns:
        Decorated function with request validation
    """
    def decorator(f):
        @wraps(f)
        def wrapped_function(*args, **kwargs):
            try:
                # Get JSON data
                data = request.get_json()

                if data is None:
                    response = format_error_response(
                        ValidationError("No JSON data provided"),
                        "request_validation"
                    )
                    return jsonify(response), 400

                # Check required fields
                if required_fields:
                    missing_fields = []
                    for field in required_fields:
                        if field not in data or data[field] is None or (isinstance(data[field], str) and not data[field].strip()):
                            missing_fields.append(field)

                    if missing_fields:
                        response = format_error_response(
                            ValidationError(f"Required fields missing: {', '.join(missing_fields)}"),
                            "request_validation"
                        )
                        return jsonify(response), 400

                # Validate field types and formats
                all_fields = (required_fields or []) + (optional_fields or [])
                if all_fields:
                    validation_errors = []

                    for field in all_fields:
                        if field in data and data[field] is not None:
                            value = data[field]

                            # Email validation
                            if field == 'email' and value:
                                if not isinstance(value, str) or '@' not in value or '.' not in value:
                                    validation_errors.append(f"Invalid email format for {field}")

                            # Phone validation
                            elif field == 'phone' and value:
                                if not isinstance(value, str) or not value.replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
                                    validation_errors.append(f"Invalid phone format for {field}")

                            # Numeric validation
                            elif field in ['cost', 'price'] and value is not None:
                                try:
                                    float(value)
                                    if float(value) < 0:
                                        validation_errors.append(f"{field} must be non-negative")
                                except (ValueError, TypeError):
                                    validation_errors.append(f"{field} must be a valid number")

                            # Integer validation
                            elif field in ['vendor_id', 'quote_id', 'lead_time_days'] and value is not None:
                                try:
                                    int(value)
                                    if field == 'lead_time_days' and int(value) <= 0:
                                        validation_errors.append(f"{field} must be a positive integer")
                                except (ValueError, TypeError):
                                    validation_errors.append(f"{field} must be a valid integer")

                            # Boolean validation
                            elif field in ['is_active', 'hidden', 'done', 'requested', 'entered'] and value is not None:
                                if not isinstance(value, bool):
                                    validation_errors.append(f"{field} must be a boolean")

                    if validation_errors:
                        response = format_error_response(
                            ValidationError(f"Validation errors: {'; '.join(validation_errors)}"),
                            "request_validation"
                        )
                        return jsonify(response), 400

                return f(*args, **kwargs)

            except Exception as e:
                logger.error(f"Request validation error: {e}")
                response = format_error_response(e, "request_validation")
                return jsonify(response), 400

        return wrapped_function
    return decorator


def log_api_request(response):
    """
    Log API request and response for debugging

    Args:
        response: Flask response object

    Returns:
        Modified response with logging
    """
    try:
        # Log request details
        logger.info(f"API Request: {request.method} {request.path}")
        logger.debug(f"Request headers: {dict(request.headers)}")

        # Log request data for POST/PUT requests (but not sensitive data)
        if request.method in ['POST', 'PUT'] and request.get_json():
            data = request.get_json()
            # Remove sensitive fields for logging
            safe_data = {k: v for k, v in data.items()
                        if k not in ['password', 'token', 'secret', 'key']}
            logger.debug(f"Request data: {safe_data}")

        # Log response status
        logger.info(f"Response status: {response.status_code}")

    except Exception as e:
        logger.error(f"Error logging API request: {e}")

    return response


def create_success_response(data=None, message: str = None, meta: dict = None) -> dict:
    """
    Create standardized success response

    Args:
        data: Response data
        message: Success message
        meta: Additional metadata

    Returns:
        Standardized success response dictionary
    """
    response = {
        'success': True,
        'timestamp': datetime.utcnow().isoformat()
    }

    if data is not None:
        response['data'] = data

    if message:
        response['message'] = message

    if meta:
        response['meta'] = meta

    return response


def create_pagination_response(data: list, page: int, per_page: int, total: int,
                             message: str = None) -> dict:
    """
    Create standardized paginated response

    Args:
        data: List of items
        page: Current page number
        per_page: Items per page
        total: Total number of items
        message: Optional message

    Returns:
        Standardized paginated response
    """
    total_pages = (total + per_page - 1) // per_page

    return {
        'success': True,
        'data': data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        },
        'timestamp': datetime.utcnow().isoformat(),
        'message': message
    }


# Import time for timing operations
import time
from datetime import datetime


class APIError(Exception):
    """Custom API error class with additional context"""
    def __init__(self, message: str, status_code: int = 400, error_code: str = None, details: dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class BusinessLogicError(APIError):
    """Error for business logic violations"""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, 422, "business_logic_error", details)


class ResourceNotFoundError(APIError):
    """Error for missing resources"""
    def __init__(self, resource_type: str, resource_id: str = None):
        message = f"{resource_type} not found"
        if resource_id:
            message += f" with ID: {resource_id}"
        super().__init__(message, 404, "resource_not_found", {"resource_type": resource_type, "resource_id": resource_id})


class PermissionDeniedError(APIError):
    """Error for permission/access issues"""
    def __init__(self, message: str = "Permission denied", details: dict = None):
        super().__init__(message, 403, "permission_denied", details)