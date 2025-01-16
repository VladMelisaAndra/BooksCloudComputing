import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Modal } from 'react-bootstrap';
import Cookies from 'js-cookie';
import 'bootstrap/dist/css/bootstrap.min.css';

const AUTH_URL = process.env.REACT_APP_AUTH_URL || 'http://localhost:5005';
const BOOKS_URL = process.env.REACT_APP_BOOKS_URL || 'http://localhost:5006';
const STATS_URL = process.env.REACT_APP_STATS_URL || 'http://localhost:5007';

const App = () => {
    const [token, setToken] = useState(Cookies.get('token') || '');
    const [books, setBooks] = useState([]);
    const [stats, setStats] = useState({});
    const [bookStats, setBookStats] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [showLoginForm, setShowLoginForm] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [newBook, setNewBook] = useState({
        title: '',
        author: '',
        year: ''
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${AUTH_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (data.token) {
                Cookies.set('token', data.token, { expires: 1 });
                setToken(data.token);
                fetchBooks();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${AUTH_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, email }),
            });
            const data = await response.json();
            if (response.ok) {
                setShowLoginForm(true);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleLogout = () => {
        Cookies.remove('token');
        setToken('');
        setBooks([]);
    };

    const fetchBooks = async () => {
        try {
            const response = await fetch(`${BOOKS_URL}/books`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setBooks(data);
            } else {
                setBooks([]);
            }
        } catch (error) {
            console.error('Error:', error);
            setBooks([]);
        }
    };

    const handleAddBook = async () => {
        try {
            await fetch(`${BOOKS_URL}/books`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newBook),
            });
            setShowAddModal(false);
            setNewBook({ title: '', author: '', year: '' });
            fetchBooks();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleDeleteBook = async (bookId) => {
        try {
            await fetch(`${BOOKS_URL}/books/${bookId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            fetchBooks();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleViewBook = async (bookId) => {
        try {
            const response = await fetch(`${BOOKS_URL}/books/${bookId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setSelectedBook(data);
            setShowViewModal(true);

            await fetch(`${STATS_URL}/stats/view/${bookId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            fetchStats();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(`${STATS_URL}/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const combineBookStats = (booksData, statsData) => {
        if (!booksData || !statsData) return [];

        return Object.entries(statsData)
            .map(([bookId, views]) => {
                const book = booksData.find(book => book._id === bookId);
                if (!book) return null;
                return {
                    id: bookId,
                    title: book.title,
                    views: views
                };
            })
            .filter(stat => stat !== null);
    };

    useEffect(() => {
        if (token) {
            fetchBooks();
            fetchStats();
        }
    }, [token]);

    useEffect(() => {
        setBookStats(combineBookStats(books, stats));
    }, [books, stats]);

    if (!token) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col md={6}>
                        <Card>
                            <Card.Body>
                                <h2 className="text-center mb-4">
                                    {showLoginForm ? 'Login' : 'Register'}
                                </h2>
                                <Form onSubmit={showLoginForm ? handleLogin : handleRegister}>
                                    <Form.Group className="mb-3">
                                        <Form.Control
                                            type="text"
                                            placeholder="Username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Control
                                            type="password"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </Form.Group>
                                    {!showLoginForm && (
                                        <Form.Group className="mb-3">
                                            <Form.Control
                                                type="email"
                                                placeholder="Email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </Form.Group>
                                    )}
                                    <Button variant="primary" type="submit" className="w-100 mb-2">
                                        {showLoginForm ? 'Login' : 'Register'}
                                    </Button>
                                    <Button
                                        variant="link"
                                        onClick={() => setShowLoginForm(!showLoginForm)}
                                        className="w-100"
                                    >
                                        {showLoginForm ? 'Need an account? Register' : 'Have an account? Login'}
                                    </Button>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <Button variant="danger" onClick={handleLogout} className="mb-4">
                Logout
            </Button>

            <Row className="mb-4">
                <Col>
                    <h2>Books</h2>
                    <Button variant="success" onClick={() => setShowAddModal(true)} className="mb-3">
                        Add Book
                    </Button>
                    <Row>
                        {Array.isArray(books) && books.map((book) => (
                            <Col md={4} key={book._id} className="mb-3">
                                <Card>
                                    <Card.Body>
                                        <Card.Title>{book.title}</Card.Title>
                                        <Card.Text>
                                            Author: {book.author}<br/>
                                            Year: {book.year}
                                        </Card.Text>
                                        <Button
                                            variant="primary"
                                            onClick={() => handleViewBook(book._id)}
                                            className="me-2"
                                        >
                                            View
                                        </Button>
                                        <Button
                                            variant="danger"
                                            onClick={() => handleDeleteBook(book._id)}
                                        >
                                            Delete
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Col>
            </Row>

            <Row>
                <Col>
                    <h2>Statistics</h2>
                    <Card>
                        <Card.Body>
                            {bookStats.map((stat) => (
                                <p key={stat.id}>"{stat.title}": {stat.views} views</p>
                            ))}
                            {bookStats.length === 0 && (
                                <p className="text-muted">No statistics available</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add New Book</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Title</Form.Label>
                            <Form.Control
                                type="text"
                                value={newBook.title}
                                onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Author</Form.Label>
                            <Form.Control
                                type="text"
                                value={newBook.author}
                                onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Year</Form.Label>
                            <Form.Control
                                type="number"
                                value={newBook.year}
                                onChange={(e) => setNewBook({...newBook, year: e.target.value})}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleAddBook}>
                        Add Book
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Book Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedBook && (
                        <>
                            <h4>{selectedBook.title}</h4>
                            <p><strong>Author:</strong> {selectedBook.author}</p>
                            <p><strong>Year:</strong> {selectedBook.year}</p>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default App;