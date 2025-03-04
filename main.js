const TelegramBot = require('node-telegram-bot-api');

const token = '7060657317:AAF4lVq19M9NP9Cv0d8GH2dd_knHjKVNE5w';
const url = 'https://spiffy-peony-6368f0.netlify.app'

const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/echo (.+)/, (msg, match) => {

  const chatId = msg.chat.id;
  const resp = match[1]; 

  bot.sendMessage(chatId, resp);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text
  if(text == "/start"){
    bot.sendMessage(chatId, 'Нажми на кнопки ниже, чтобы перейти на наш сайт!', {
     reply_markup:{
      inline_keyboard:[
        [{text: 'Войти', web_app: {url}}]
      ]
     }
   })
  }

  
});