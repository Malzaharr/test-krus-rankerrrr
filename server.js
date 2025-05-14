
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();

// 1. Используем переменные окружения
const port = process.env.PORT || 3000; // Получаем порт из переменной окружения или используем 3000 по умолчанию

// CORS (закомментировано для деплоя, Render.com обрабатывает это автоматически)
app.use(cors({
    origin: ['https://spiffy-peony-6368f0.netlify.app', 'http://localhost:5173'], // Оставьте только нужные origin для разработки
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let db; // Объявляем db вне функции createConnection

function createConnection() {
    const dbConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'diplom'
    };

    const db = mysql.createConnection(dbConfig);

    db.connect((err) => {
        if (err) {
            console.error('Ошибка подключения к базе данных:', err);
            console.error('Попытка переподключения через 5 секунд...');
            setTimeout(createConnection, 5000);
            return;
        }
        console.log('Успешно подключено к базе данных!');
    });

    db.on('error', (err) => {
        console.error('Ошибка базы данных:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Соединение с базой данных потеряно. Попытка переподключения...');
            setTimeout(createConnection, 5000);
        } else {
            throw err;
        }
    });

    return db;
}

db = createConnection(); // Инициализируем db

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

// Функция для удаления старых заказов
const deleteOldOrders = () => {
    const sql = 'DELETE FROM orders WHERE order_date_end < NOW()';
    db.query(sql, (err, result) => {
        if (err) {
            return console.error('Ошибка при удалении старых заказов:', err);
        }
        console.log('Старые заказы удалены:', result.affectedRows);
    });
};

// Не запускаем удаление старых заказов во время старта сервера
// deleteOldOrders();

// Запуск удаления старых заказов каждый день
setInterval(deleteOldOrders, 24 * 60 * 60 * 1000); // Каждые 24 часа

app.get('/users', (req, res) => getTableData('users', res));
app.get('/products', (req, res) => getTableData('products', res));
app.get('/orders', (req, res) => getTableData('orders', res));
app.get('/categories', (req, res) => getTableData('categories', res));
app.get('/brands', (req, res) => getTableData('brands', res));
app.get('/delivery_addresses', (req, res) => getTableData('delivery_addresses', res));
app.get('/order_items', (req, res) => getTableData('order_items', res));
app.get('/reviews', (req, res) => getTableData('reviews', res));
app.get('/payment_methods', (req, res) => getTableData('payment_methods', res));
app.get('/tovar', (req, res) => getTableData('promotions', res));

app.put('/update/:table/:id', (req, res) => {
    const { table, id } = req.params;
    const data = req.body;

    console.log("PUT /update/:table/:id", table, id, data);

    const allowedTables = ['users', 'products', 'orders', 'categories', 'brands', 'delivery_addresses', 'order_items', 'reviews', 'payment_methods', 'promotions'];
    if (!allowedTables.includes(table)) {
        console.log("Invalid table name");
        return res.status(400).json({error: 'Invalid table name'});
    }

    if (table === 'users' && data.email) {
        console.log("Checking email...");
        const checkEmailSql = 'SELECT * FROM users WHERE email = ? AND id != ?';
        db.query(checkEmailSql, [data.email, id], (err, results) => {
            if (err) {
                console.error('Ошибка при проверке email:', err);
                return res.status(500).json({error: 'Ошибка сервера', details: err.message });
            }

            console.log("Email check results:", results);

            if (results.length > 0) {
                console.log("Email already exists");
                return res.status(400).json({error: 'Email already exists'});
            }

            console.log("Email is ok, performing update...");
            performUpdate(table, id, data, res);
        });
    } else {
        console.log("Not checking email or not users table, performing update...");
        performUpdate(table, id, data, res);
    }
});

app.post('/add/orders', (req, res) => {
    const data = req.body;

    if (!data.user_id || !data.delivery_address_id) {
        return res.status(400).json({ error: 'User ID and Delivery Address ID are required' });
    }

    const sql = `INSERT INTO orders (user_id, delivery_address_id, total, products_id, order_date_end) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`;
    const values = [data.user_id, data.delivery_address_id, data.total, data.products_id];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении заказа:', err);
            return res.status(500).json({ error: 'Ошибка при добавлении заказа', details: err.message });
        }
        res.json({ message: 'Заказ успешно создан', id: result.insertId });
    });
});

app.post('/add/order_items', (req, res) => {
    const data = req.body;

    if (!data.order_id || !data.product_id || !data.quantity) {
        return res.status(400).json({ error: 'Order ID, Product ID, and Quantity are required' });
    }

    const sql = `INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)`;
    const values = [data.order_id, data.product_id, data.quantity];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении товара в заказ:', err);
            return res.status(500).json({ error: 'Ошибка при добавлении товара в заказ', details: err.message });
        }
        res.json({ message: 'Товар успешно добавлен в заказ', id: result.insertId });
    });
});

app.get('/order_expiration_notifications', (req, res) => {
    const sql = 'SELECT * FROM order_expiration_notifications ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Ошибка при получении уведомлений:', err);
            return res.status(500).json({ error: 'Ошибка при получении уведомлений', details: err.message });
        }
        res.json(results);
    });
});

function performUpdate(table, id, data, res) {
    console.log("performUpdate called", table, id, data);
    let sql = `UPDATE ${table} SET `;
    const values = [];
    for (const key in data) {
        sql += `${key} = ?, `;
        values.push(data[key]);
    }
    sql = sql.slice(0, -2);
    sql += ` WHERE id = ?`;
    values.push(id);

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(`Ошибка при обновлении записи в таблице ${table}:`, err);
            return res.status(500).json({ error: 'Ошибка при обновлении записи', details: err.message });
        }
        res.json({ message: 'Запись успешно обновлена' });
    });
}

app.delete('/delete/:table/:id', (req, res) => {
    const { table, id } = req.params;
    const userId = id;

    if (table === 'users') {
        db.beginTransaction(err => {
            if (err) {
                console.error('Ошибка при начале транзакции:', err);
                return res.status(500).json({ error: 'Ошибка сервера', details: err.message });
            }

            const deleteDeliveryAddressesSql = 'DELETE FROM delivery_addresses WHERE user_id = ?';
            db.query(deleteDeliveryAddressesSql, [userId], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Ошибка при удалении записей из delivery_addresses:', err);
                        return res.status(500).json({ error: 'Ошибка при удалении связанных записей', details: err.message });
                    });
                }

                const deleteOrdersSql = 'DELETE FROM orders WHERE user_id = ?';
                db.query(deleteOrdersSql, [userId], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Ошибка при удалении записей из orders:', err);
                            return res.status(500).json({ error: 'Ошибка при удалении связанных записей', details: err.message });
                        });
                    }

                    const deleteReviewsSql = 'DELETE FROM reviews WHERE user_id = ?';
                    db.query(deleteReviewsSql, [userId], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Ошибка при удалении записей из reviews:', err);
                                return res.status(500).json({ error: 'Ошибка при удалении связанных записей', details: err.message });
                            });
                        }

                        const deletePaymentMethodsSql = 'DELETE FROM payment_methods WHERE user_id = ?';
                        db.query(deletePaymentMethodsSql, [userId], (err, result) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error('Ошибка при удалении записей из payment_methods:', err);
                                    return res.status(500).json({ error: 'Ошибка при удалении связанных записей', details: err.message });
                                });
                            }

                            const deleteUserSql = `DELETE FROM ${table} WHERE id = ?`;
                            db.query(deleteUserSql, [userId], (err, result) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error('Ошибка при удалении пользователя:', err);
                                        return res.status(500).json({ error: 'Ошибка при удалении пользователя', details: err.message });
                                    });
                                }

                                db.commit(err => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error('Ошибка при фиксации транзакции:', err);
                                            return res.status(500).json({ error: 'Ошибка сервера', details: err.message });
                                        });
                                    }
                                    res.json({ message: 'Пользователь и связанные записи успешно удалены' });
                                });
                            });
                        });
                    });
                });
            });
        });
    } else if (table === 'products') {
        const productId = id;

        const deleteOrderItemsSql = 'DELETE FROM order_items WHERE product_id = ?';
        db.query(deleteOrderItemsSql, [productId], (err, result) => {
            if (err) {
                console.error('Ошибка при удалении записей из order_items:', err);
                return res.status(500).json({ error: 'Ошибка при удалении связанных записей', details: err.message });
            }

            const deleteProductSql = `DELETE FROM ${table} WHERE id = ?`;
            db.query(deleteProductSql, [id], (err, result) => {
                if (err) {
                    console.error('Ошибка при удалении товара:', err);
                    return res.status(500).json({ error: 'Ошибка при удалении товара', details: err.message });
                }
                res.json({ message: 'Товар и связанные записи успешно удалены' });
            });
        });
    }  else {
        const sql = `DELETE FROM ${table} WHERE id = ?`;
        db.query(sql, [id], (err, result) => {
            if (err) {
                console.error(`Ошибка при удалении записи из таблицы ${table}:`, err);
                return res.status(500).json({ error: 'Ошибка при удалении записи', details: err.message });
            }
            res.json({ message: 'Запись успешно удалена' });
        });
    }
});

app.post('/add/:table', (req, res) => {
    const { table } = req.params;
    const data = req.body;

    const allowedTables = ['users', 'products', 'orders', 'categories', 'brands', 'delivery_addresses', 'order_items', 'reviews', 'payment_methods', 'promotions'];
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    if (table === 'users') {
        delete data.registration_date;
    }
    if (table === 'orders') {
        delete data.order_date;
    }
    if (table === 'reviews') {
        delete data.review_date;
    }
    if (table === 'orders') {
        delete data.order_date_end;
    }

    let sql = `INSERT INTO ${table} (`;
    const columns = Object.keys(data);
    sql += columns.join(', ');
    sql += ') VALUES (';
    sql += columns.map(() => '?').join(', ');
    sql += ')';

    const values = columns.map(column => data[column]);

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(`Ошибка при добавлении записи в таблицу ${table}:`, err);
            return res.status(500).json({ error: 'Ошибка при добавлении записи', details: err.message });
        }
        res.json({ message: 'Запись успешно добавлена', id: result.insertId });
    });
});

app.get('/products/below/:price', (req, res) => {
    const maxPrice = parseFloat(req.params.price);
    const sql = 'SELECT * FROM products WHERE price < ?';

    db.query(sql, [maxPrice], (err, results) => {
        if (err) {
            console.error('Ошибка при выборке товаров по цене:', err);
            return res.status(500).json({ error: 'Ошибка при выборке товаров', details: err.message });
        }
        res.json(results);
    });
});

app.get('/products/thismonth', (req, res) => {
    const sql = `
        SELECT * FROM products
        WHERE YEAR(products.created_at) = YEAR(CURDATE())
        AND MONTH(products.created_at) = MONTH(CURDATE())
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Ошибка при выборке товаров за текущий месяц:', err);
            return res.status(500).json({ error: 'Ошибка при выборке товаров за месяц', details: err.message });
        }
        res.json(results);
    });
});

app.get('/users/below/:price', (req, res) => {
    const maxPrice = parseFloat(req.params.price);
    const sql = 'SELECT * FROM users WHERE price < ?';

    db.query(sql, [maxPrice], (err, results) => {
        if (err) {
            console.error('Ошибка при выборке товаров по цене:', err);
            return res.status(500).json({ error: 'Ошибка при выборке товаров', details: err.message });
        }
        res.json(results);
    });
});

app.get('/users/thismonth', (req, res) => {
    const sql = `
        SELECT * FROM users
        WHERE YEAR(users.registration_date) = YEAR(CURDATE())
        AND MONTH(users.registration_date) = MONTH(CURDATE())
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Ошибка при выборке товаров за текущий месяц:', err);
            return res.status(500).json({ error: 'Ошибка при выборке товаров за месяц', details: err.message });
        }
        res.json(results);
    });
});

app.get('/users/search', (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email is required for search' });
    }

    const sql = 'SELECT * FROM users WHERE email LIKE ?';
    db.query(sql, [`%${email}%`], (err, results) => {
        if (err) {
            console.error('Error searching for users by email:', err);
            return res.status(500).json({ error: 'Error searching for users', details: err.message });
        }
        res.json(results);
    });
});

app.get('/:table/search', (req, res) => {
    const { table } = req.params;
    const { column, value } = req.query;

    if (!table || !column || !value) {
        return res.status(400).json({ error: 'Table, column, and value are required' });
    }

    const sql = `SELECT * FROM ${table} WHERE ${column} LIKE ?`;
    db.query(sql, [`%${value}%`], (err, results) => {
        if (err) {
            console.error('Error searching by column:', err);
            return res.status(500).json({ error: 'Error searching by column', details: err.message });
        }
        res.json(results);
    });
});

// 2. Обработка ошибок при запуске сервера
app.listen(port, (err) => {
    if (err) {
        console.error('Ошибка при запуске сервера:', err);
        process.exit(1); // Завершаем процесс с кодом ошибки
    }
    console.log(`Сервер API запущен на порту ${port}`);
});
