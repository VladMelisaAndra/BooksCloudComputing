from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://{}:{}@{}/{}'.format(
    os.environ.get('DB_USER', 'postgres'),
    os.environ.get('DB_PASSWORD', 'password'),
    os.environ.get('DB_HOST', 'auth-db'),
    os.environ.get('DB_NAME', 'auth_db')
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secret')

db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)


with app.app_context():
    db.create_all()


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password') or not data.get('email'):
        return jsonify({'message': 'Missing required fields'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 400

    hashed_password = generate_password_hash(data['password'], method='scrypt')

    new_user = User(
        username=data['username'],
        password=hashed_password,
        email=data['email']
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing username or password'}), 400

    user = User.query.filter_by(username=data['username']).first()

    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Invalid username or password'}), 401

    token = jwt.encode({
        'user_id': user.id,
        'username': user.username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'])

    return jsonify({'token': token})

@app.route('/verify', methods=['POST'])
def verify():
    token = request.headers.get('Authorization')

    if not token or not token.startswith('Bearer '):
        return jsonify({'message': 'Token is missing'}), 401

    try:
        token = token.split(' ')[1]
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        user = User.query.get(data['user_id'])

        if not user:
            raise ValueError('User not found')

        return jsonify({
            'valid': True,
            'user_id': user.id,
            'username': user.username
        })
    except Exception as e:
        return jsonify({
            'valid': False,
            'message': str(e)
        }), 401

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)