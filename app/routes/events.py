from flask import Blueprint, request, jsonify
from app.models import Event

events_bp = Blueprint('events', __name__, url_prefix='/api')

@events_bp.route('/events/quote/<int:quote_id>', methods=['GET'])
def get_events(quote_id):
    events = Event.get_by_quote_id(quote_id)
    return jsonify(events)

@events_bp.route('/events', methods=['POST'])
def create_event():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    quote_id = data.get('quote_id')
    description = data.get('description', '')
    past = data.get('past')
    present = data.get('present')
    if not quote_id or description is None:
        return jsonify({'error': 'Quote ID and description are required'}), 400
    try:
        event_id = Event.create(quote_id, description, past, present)
        return jsonify({'id': event_id, 'message': 'Event created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@events_bp.route('/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    if Event.delete(event_id):
        return jsonify({'message': 'Event deleted successfully'})
    else:
        return jsonify({'error': 'Event not found'}), 404

