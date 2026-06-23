from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

def role_required(*roles):
    """
    Decorator to protect endpoints by requiring specific roles.
    Expects JWT claims to contain a 'role' key.
    Usage: @role_required('SUPER_ADMIN', 'ADMIN')
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get('role', 'USER')
            
            if user_role not in roles:
                return jsonify({"message": f"Forbidden: Requires one of {list(roles)}"}), 403
                
            return fn(*args, **kwargs)
        return decorator
    return wrapper
