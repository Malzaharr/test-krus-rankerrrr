const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();
const port = 3307;

app.use(cors({
    origin: ['https://spiffy-peony-6368f0.netlify.app','http://localhost:3000','http://37.212.31.223:3307'], // Замените на свой домен Netlify
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));

function createConnection() {
    const db = mysql.createConnection({
        host: 'localhost',// Значение по умолчанию для локальной разработки
        user: 'root',      // Значение по умолчанию для локальной разработки
        password: '',  // Значение по умолчанию для локальной разработки
        database: 'diplom' // Значение по умолчанию для локальной разработки
    });

    db.connect((err) => {
        if (err) {
            console.error('Ошибка подключения к базе данных:', err);
            console.error('Попытка переподключения через 5 секунд...');
            setTimeout(createConnection, 5000); // Повторная попытка через 5 секунд
            return;
        }
        console.log('Успешно подключено к базе данных!');
    });

    db.on('error', (err) => {
        console.error('Ошибка базы данных:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Соединение с базой данных потеряно. Попытка переподключения...');
            setTimeout(createConnection, 5000); // Повторная попытка через 5 секунд
        } else {
            throw err; // Перебросить другие ошибки
        }
    });

    return db;
}

// Создаем соединение с базой данных
const db = createConnection();

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
    console.log(`Сервер API запущен на http://localhost:${port}`);
});

