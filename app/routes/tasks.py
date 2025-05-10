from flask import Blueprint, request, jsonify
from app.models import Task

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api')

@tasks_bp.route('/tasks/quote/<int:quote_id>', methods=['GET'])
def get_tasks(quote_id):
    tasks = Task.get_by_quote_id(quote_id)
    return jsonify(tasks)

@tasks_bp.route('/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    quote_id = data.get('quote_id')
    label = data.get('label')
    is_separator = data.get('is_separator', False)
    
    if not quote_id or not label:
        return jsonify({'error': 'Quote ID and label are required'}), 400
    
    try:
        task_id = Task.create(quote_id, label, is_separator)
        return jsonify({'id': task_id, 'message': 'Task created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tasks_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    label = data.get('label')
    done = data.get('done')
    is_separator = data.get('is_separator')
    
    if Task.update(task_id, label, done, is_separator):
        return jsonify({'message': 'Task updated successfully'})
    else:
        return jsonify({'error': 'Task not found or no changes made'}), 404

@tasks_bp.route('/tasks/<int:task_id>/toggle', methods=['POST'])
def toggle_task(task_id):
    """Toggle the done status of a task"""
    try:
        from app.db import DatabaseContext
        with DatabaseContext() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE tasks
                SET done = CASE WHEN done = 1 THEN 0 ELSE 1 END
                WHERE id = ?
            ''', (task_id,))
            conn.commit()
            
            if cursor.rowcount > 0:
                # Get the updated task to return the new status
                cursor.execute('''
                    SELECT done FROM tasks WHERE id = ?
                ''', (task_id,))
                
                row = cursor.fetchone()
                if row:
                    return jsonify({
                        'message': 'Task status toggled',
                        'done': bool(row['done'])
                    })
            
            return jsonify({'error': 'Task not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tasks_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    if Task.delete(task_id):
        return jsonify({'message': 'Task deleted successfully'})
    else:
        return jsonify({'error': 'Task not found'}), 404

# Add route to handle creating tasks for a specific quote
@tasks_bp.route('/quotes/<int:quote_id>/tasks', methods=['POST'])
def create_task_for_quote(quote_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    label = data.get('label')
    is_separator = data.get('is_separator', False)
    
    if not label:
        return jsonify({'error': 'Label is required'}), 400
    
    try:
        task_id = Task.create(quote_id, label, is_separator)
        return jsonify({'id': task_id, 'message': 'Task created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
