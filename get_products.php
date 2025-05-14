<?php
// api/get_products.php

// Настройка CORS (Cross-Origin Resource Sharing)
header('Access-Control-Allow-Origin: *'); // Разрешить запросы со всех доменов (для разработки)
header('Content-Type: application/json; charset=utf-8'); // Установить заголовок Content-Type

// Параметры подключения к базе данных (замените на свои)
$host = '127.0.0.1'; //  Имя хоста
$db   = 'test'; //  Имя вашей базы данных
$user = 'root'; //  Имя пользователя MySQL
$pass = ''; //  Пароль пользователя MySQL
$charset = 'utf8mb4'; // Кодировка

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // В случае ошибки подключения отправить сообщение об ошибке в формате JSON
    http_response_code(500); // Установить код ответа HTTP 500 (Internal Server Error)
    echo json_encode(['error' => 'Ошибка подключения к базе данных: ' . $e->getMessage()]);
    exit; // Прекратить выполнение скрипта
}

// SQL-запрос для получения данных о товарах с объединением таблицы brands
$sql = "SELECT
            p.id,
            p.name,
            p.description,
            p.price,
            b.name AS brand_name
        FROM
            products p
        INNER JOIN
            brands b ON p.brand_id = b.id";

try {
    $stmt = $pdo->query($sql);
    $products = $stmt->fetchAll();

    // Отправить данные о товарах в формате JSON
    echo json_encode($products, JSON_UNESCAPED_UNICODE);
} catch (\PDOException $e) {
    // В случае ошибки запроса отправить сообщение об ошибке в формате JSON
    http_response_code(500); // Установить код ответа HTTP 500 (Internal Server Error)
    echo json_encode(['error' => 'Ошибка запроса к базе данных: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit; // Прекратить выполнение скрипта
}

// Закрыть соединение с базой данных
$pdo = null;
?>