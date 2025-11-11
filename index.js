require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const bodyParser = require("body-parser");

const token = process.env.TELEGRAM_TOKEN || "SIZNING_TOKEN";
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL; // masalan: https://sizning-app.koyeb.app

if (!token || !webhookUrl) {
    console.error("❌ TELEGRAM_TOKEN yoki TELEGRAM_WEBHOOK_URL .env da topilmadi");
    process.exit(1);
}

// 🔹 Botni webhook rejimida yaratamiz
const bot = new TelegramBot(token);
bot.setWebHook(`${webhookUrl}/bot${token}`);

// 🔹 Express server yaratish
const app = express();
app.use(bodyParser.json());

// 🔹 Telegram webhook requestlarini qabul qilish
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// 🔹 Foydalanuvchi va chat ma’lumotlari
let waitingUser = [];
let activeChats = {};
let allUsers = new Set();
let lastActive = {};

// 🔹 5 daqiqadan oldingi userlarni online ro‘yxatdan o‘chirish
setInterval(() => {
    const now = Date.now();
    for (let userId in lastActive) {
        if (now - lastActive[userId] > 5 * 60 * 1000) {
            delete lastActive[userId];
        }
    }
}, 30000);

// 🔹 Majburiy kanallar
const requiredChannels = [
    { username: "@WorkedLink", name: "Kanal 1" },
    { username: "@brown_blog", name: "Kanal 2" }
];

// /start komandasi
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    allUsers.add(chatId);

    bot.sendMessage(chatId, "Salom! Anonim suhbat botiga xush kelibsiz ✌😉", {
        reply_markup: {
            keyboard: [
                [{ text: "Chat izlash" }],
                [{ text: "To'xtatish" }],
                [{ text: "📊 Statistika" }]
            ],
            resize_keyboard: true
        }
    });
});

// 🔹 Foydalanuvchi xabarlari
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    allUsers.add(chatId);
    lastActive[chatId] = Date.now();

    // 📊 Statistika
    if (text === "📊 Statistika" || text === "/stats") {
        let stats = `
📊 *Statistika:*

👥 Jami foydalanuvchilar: *${allUsers.size}*
🔎 Chat izlayotganlar: *${waitingUser.length}*
💬 Aktiv chatlar: *${Object.keys(activeChats).length / 2}*
🟢 Online (5 daqiqa ichida): *${Object.keys(lastActive).length}*
        `;
        bot.sendMessage(chatId, stats.trim(), { parse_mode: "Markdown" });
        return;
    }

    // 🔹 Chat izlash
    if (text === "Chat izlash") {
        if (activeChats[chatId])
            return bot.sendMessage(chatId, "Siz allaqachon suhbatdasiz ✅");

        if (waitingUser.includes(chatId))
            return bot.sendMessage(chatId, "⏳ Siz allaqachon kutyapsiz...");

        // 🔹 Obuna tekshirish
        let notSubscribed = [];
        for (let channel of requiredChannels) {
            try {
                const member = await bot.getChatMember(channel.username, chatId);
                if (["left", "kicked"].includes(member.status)) {
                    notSubscribed.push(channel);
                }
            } catch (err) {
                console.log("Xatolik kanal tekshirishda:", err);
                notSubscribed.push(channel);
            }
        }

        if (notSubscribed.length > 0) {
            // 🔹 Inline tugmalar bilan obuna bo‘lish
            const buttons = notSubscribed.map(c => [{ text: `Obuna bo‘lish: ${c.name}`, url: `https://t.me/${c.username.replace("@","")}` }]);
            return bot.sendMessage(chatId, "❌ Suhbat boshlash uchun quyidagi kanallarga obuna bo‘ling:", {
                reply_markup: { inline_keyboard: buttons }
            });
        }

        // 🔹 Suhbat izlash
        if (waitingUser.length > 0) {
            let partnerId = waitingUser.shift();

            if (partnerId === chatId) {
                if (waitingUser.length > 0) partnerId = waitingUser.shift();
                else {
                    waitingUser.push(chatId);
                    return bot.sendMessage(chatId, "🔍 Suhbatdosh izlanmoqda...");
                }
            }

            activeChats[chatId] = partnerId;
            activeChats[partnerId] = chatId;

            bot.sendMessage(chatId, "✅ Suhbat boshlandi");
            bot.sendMessage(partnerId, "✅ Suhbat boshlandi");
        } else {
            waitingUser.push(chatId);
            bot.sendMessage(chatId, "🔍 Suhbatdosh izlanmoqda...");
        }
        return;
    }

    // 🔹 Suhbatni to‘xtatish
    if (text === "To'xtatish") {
        if (activeChats[chatId]) {
            const partnerId = activeChats[chatId];
            bot.sendMessage(partnerId, "❌ Suhbatdosh suhbatni tark etdi.");
            bot.sendMessage(chatId, "❌ Suhbat yakunlandi.");
            delete activeChats[partnerId];
            delete activeChats[chatId];
        } else {
            bot.sendMessage(chatId, "Siz hozir hech kim bilan gaplashmayapsiz ❗");
        }
        return;
    }

    // 🔹 Xabarlarni uzatish
    if (activeChats[chatId]) {
        bot.sendMessage(activeChats[chatId], text);
    }
});

// 🔹 Oddiy endpoint (bot ishlayotganini tekshirish uchun)
app.get("/", (req, res) => {
    res.send("Webhook bot is running ✅");
});

// 🔹 Serverni ishga tushirish
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
