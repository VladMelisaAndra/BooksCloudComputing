from flask import Flask, request, jsonify
import redis
import os
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

redis_client = redis.Redis(
    host=os.environ.get('REDIS_HOST', 'stats-db'),
    port=6379,
    password=os.environ.get('REDIS_PASSWORD', 'redis123'),
    decode_responses=True
)


def verify_token():
    token = request.headers.get('Authorization')
    if not token:
        return None

    try:
        auth_service_url = os.environ.get('AUTH_SERVICE_URL', 'http://auth-service:5000')
        response = requests.post(
            f"{auth_service_url}/verify",
            headers={"Authorization": token}
        )

        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None


def check_book_exists(book_id, token):
    try:
        books_service_url = os.environ.get('BOOKS_SERVICE_URL', 'http://books-service:5000')
        response = requests.get(
            f"{books_service_url}/books/{book_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.status_code == 200
    except:
        return False


@app.route('/stats/view/<book_id>', methods=['POST'])
def record_view(book_id):
    token_data = verify_token()
    if not token_data:
        return jsonify({'message': 'Unauthorized'}), 401

    token = request.headers.get('Authorization').split(' ')[1]
    if not check_book_exists(book_id, token):
        return jsonify({'message': 'Book not found'}), 404

    redis_client.incr(f'views:{book_id}')
    return jsonify({'message': 'View recorded'})


@app.route('/stats', methods=['GET'])
def get_stats():
    if not verify_token():
        return jsonify({'message': 'Unauthorized'}), 401

    stats = {}
    for key in redis_client.keys('views:*'):
        book_id = key.split(':')[1]
        views = int(redis_client.get(key))
        stats[book_id] = views

    return jsonify(stats)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)