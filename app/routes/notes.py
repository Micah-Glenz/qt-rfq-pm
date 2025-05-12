from flask import Blueprint, request, jsonify
from app.models import Note

notes_bp = Blueprint('notes', __name__, url_prefix='/api')

@notes_bp.route('/notes/quote/<int:quote_id>', methods=['GET'])
def get_notes(quote_id):
    notes = Note.get_by_quote_id(quote_id)
    return jsonify(notes)

@notes_bp.route('/notes', methods=['POST'])
def create_note():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    quote_id = data.get('quote_id')
    content = data.get('content', '')  # Default to empty string if not provided
    
    if not quote_id:
        return jsonify({'error': 'Quote ID is required'}), 400
    
    try:
        note_id = Note.create(quote_id, content)
        return jsonify({'id': note_id, 'message': 'Note created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@notes_bp.route('/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    if Note.delete(note_id):
        return jsonify({'message': 'Note deleted successfully'})
    else:
        return jsonify({'error': 'Note not found'}), 404

@notes_bp.route('/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    content = data.get('content', '')
    
    try:
        if Note.update(note_id, content):
            return jsonify({'message': 'Note updated successfully'})
        else:
            return jsonify({'error': 'Note not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Add this new route to handle creating notes for a specific quote
@notes_bp.route('/quotes/<int:quote_id>/notes', methods=['POST'])
def create_note_for_quote(quote_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    content = data.get('content', '')  # Default to empty string if not provided
    
    # Allow empty content for inline editing
    try:
        note_id = Note.create(quote_id, content)
        return jsonify({'id': note_id, 'message': 'Note created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
