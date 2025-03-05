const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();

// Получаем порт из переменной окружения, если не задан, используем 3307
const port = process.env.PORT || 3307;

// Получаем origin из переменной окружения, если не задан, используем массив безопасных значений
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://spiffy-peony-6368f0.netlify.app', 'http://localhost:3000', 'http://37.212.31.223:3307'];

app.use(cors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));

// Получаем параметры подключения к базе данных из переменных окружения
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', // Значение по умолчанию для локальной разработки
    user: process.env.DB_USER || 'root',      // Значение по умолчанию для локальной разработки
    password: process.env.DB_PASSWORD || '',  // Значение по умолчанию для локальной разработки
    database: process.env.DB_DATABASE || 'diplom' // Значение по умолчанию для локальной разработки
});

db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err);
        // Важно завершить процесс при невозможности подключения к базе данных в production
        process.exit(1);
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
app.get('/tovar', (req, res) => getTableData('tovar', res));

app.listen(port, () => {
    console.log(`Сервер API запущен на порту ${port}`);
});