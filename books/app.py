from flask import Flask, request, jsonify
from pymongo import MongoClient
import os
from bson import ObjectId
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

mongo_uri = f"mongodb://{os.environ.get('MONGO_USER', 'root')}:{os.environ.get('MONGO_PASSWORD', 'mongo123')}@{os.environ.get('MONGO_HOST', 'books-db')}:27017/books_db?authSource=admin&directConnection=true"
client = MongoClient(mongo_uri)
db = client.books_db

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


@app.route('/books', methods=['POST'])
def add_book():
    if not verify_token():
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    book = {
        'title': data['title'],
        'author': data['author'],
        'year': data.get('year')
    }

    result = db.books.insert_one(book)
    return jsonify({'message': 'Book added successfully', 'id': str(result.inserted_id)}), 201


@app.route('/books', methods=['GET'])
def get_books():
    if not verify_token():
        return jsonify({'message': 'Unauthorized'}), 401

    books = list(db.books.find())

    for book in books:
        book['_id'] = str(book['_id'])
    return jsonify(books)


@app.route('/books/<book_id>', methods=['GET'])
def get_book(book_id):
    if not verify_token():
        return jsonify({'message': 'Unauthorized'}), 401

    try:
        book = db.books.find_one({'_id': ObjectId(book_id)})
        if book:
            book['_id'] = str(book['_id'])
            return jsonify(book)
        return jsonify({'message': 'Book not found'}), 404
    except:
        return jsonify({'message': 'Invalid book ID'}), 400


@app.route('/books/<book_id>', methods=['DELETE'])
def delete_book(book_id):
    if not verify_token():
        return jsonify({'message': 'Unauthorized'}), 401

    try:
        result = db.books.delete_one({'_id': ObjectId(book_id)})
        if result.deleted_count:
            return jsonify({'message': 'Book deleted'})
        return jsonify({'message': 'Book not found'}), 404
    except:
        return jsonify({'message': 'Invalid book ID'}), 400


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)