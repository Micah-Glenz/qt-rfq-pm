from flask import Blueprint, request, jsonify
from app.models import DefaultTask

default_tasks_bp = Blueprint('default_tasks', __name__, url_prefix='/api')

@default_tasks_bp.route('/default-tasks', methods=['GET'])
def get_default_tasks():
    tasks = DefaultTask.get_all()
    return jsonify(tasks)

@default_tasks_bp.route('/default-tasks', methods=['POST'])
def create_default_task():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    label = data.get('label')
    sort_order = data.get('sort_order')
    is_separator = data.get('is_separator', False)
    
    if not label:
        return jsonify({'error': 'Label is required'}), 400
    
    try:
        task_id = DefaultTask.create(label, sort_order, is_separator)
        return jsonify({'id': task_id, 'message': 'Default task created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@default_tasks_bp.route('/default-tasks/<int:task_id>', methods=['PUT'])
def update_default_task(task_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    label = data.get('label')
    sort_order = data.get('sort_order')
    is_separator = data.get('is_separator')
    
    if DefaultTask.update(task_id, label, sort_order, is_separator):
        return jsonify({'message': 'Default task updated successfully'})
    else:
        return jsonify({'error': 'Default task not found or no changes made'}), 404

@default_tasks_bp.route('/default-tasks/<int:task_id>', methods=['DELETE'])
def delete_default_task(task_id):
    if DefaultTask.delete(task_id):
        return jsonify({'message': 'Default task deleted successfully'})
    else:
        return jsonify({'error': 'Default task not found'}), 404

@default_tasks_bp.route('/default-tasks/reorder', methods=['POST'])
def reorder_default_tasks():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        DefaultTask.reorder_all(data)
        return jsonify({'message': 'Default tasks reordered successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
