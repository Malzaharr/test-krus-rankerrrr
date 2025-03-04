const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();
const port = 3307;

app.use(cors({
    origin: 'https://spiffy-peony-6368f0.netlify.app', // Замените на свой домен Netlify
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'diplom'
});

db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
        return;
    }
    console.log('Успешно подключено к базе данных!');
});

const getTableData = (table, res) => {
    const sql = `SELECT * FROM ${table}`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(`Ошибка выполнения запроса к таблице ${table}:`, err);
            res.status(500).json({ error: 'Ошибка сервера', details: err.message });
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.json(results);
    });
};

app.get('/users', (req, res) => getTableData('users', res));
app.get('/products', (req, res) => getTableData('products', res));
app.get('/orders', (req, res) => getTableData('orders', res));
app.get('/categories', (req, res) => getTableData('categories', res));
app.get('/brands', (req, res) => getTableData('brands', res));
app.get('/delivery_addresses', (req, res) => getTableData('delivery_addresses', res));
app.get('/order_items', (req, res) => getTableData('order_items', res));
app.get('/reviews', (req, res) => getTableData('reviews', res));
app.get('/payment_methods', (req, res) => getTableData('payment_methods', res));
app.get('/promotions', (req, res) => getTableData('tovar', res));

app.listen(port, () => {
    console.log(`Сервер API запущен на http://localhost:${port}`);
});