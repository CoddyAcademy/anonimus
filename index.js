require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const http = require("http")

const token = process.env.TELEGRAM_TOKEN
const bot = new TelegramBot(token, { polling: true })

let waitingUser = []
let activeChats = {}
let allUsers = new Set()
let lastActive = {}

setInterval(() => {
    const now = Date.now()
    for (let userId in lastActive) {
        if (now - lastActive[userId] > 5 * 60 * 1000) {
            delete lastActive[userId]
        }
    }
}, 30000)

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id
    allUsers.add(chatId)

    bot.sendMessage(chatId, "Salom! Anonim suhbat botiga xush kelibsiz ✌😉", {
        reply_markup: {
            keyboard: [
                [{ text: "Chat izlash" }],
                [{ text: "To'xtatish" }],
                [{ text: "📊 Statistika" }]
            ],
            resize_keyboard: true
        }
    })
})

bot.on("message", (msg) => {
    let chatId = msg.chat.id
    let text = msg.text

    allUsers.add(chatId)
    lastActive[chatId] = Date.now()

    if (text === "📊 Statistika" || text === "/stats") {
        let stats = `
📊 *Statistika:*

👥 Jami foydalanuvchilar: *${allUsers.size}*
🔎 Chat izlayotganlar: *${waitingUser.length}*
💬 Aktiv chatlar: *${Object.keys(activeChats).length / 2}*
🟢 Online (5 daqiqa ichida): *${Object.keys(lastActive).length}*
        `
        bot.sendMessage(chatId, stats, { parse_mode: "Markdown" })
        return
    }

    if (text === "Chat izlash") {
        if (activeChats[chatId]) return bot.sendMessage(chatId, "Siz allaqachon suhbatdasiz ✅")

        if (waitingUser.includes(chatId)) return bot.sendMessage(chatId, "⏳ Siz allaqachon kutyapsiz...")

        if (waitingUser.length > 0) {
            let partnerId = waitingUser.shift()
            if (partnerId === chatId) {
                if (waitingUser.length > 0) partnerId = waitingUser.shift()
                else {
                    waitingUser.push(chatId)
                    return bot.sendMessage(chatId, "🔍 Suhbatdosh izlanmoqda...")
                }
            }

            activeChats[chatId] = partnerId
            activeChats[partnerId] = chatId

            bot.sendMessage(chatId, "✅ Suhbat boshlandi")
            bot.sendMessage(partnerId, "✅ Suhbat boshlandi")
        } else {
            waitingUser.push(chatId)
            bot.sendMessage(chatId, "🔍 Suhbatdosh izlanmoqda...")
        }
        return
    }

    if (text === "To'xtatish") {
        if (activeChats[chatId]) {
            const partnerId = activeChats[chatId]
            bot.sendMessage(partnerId, "❌ Suhbatdosh suhbatni tark etdi.")
            bot.sendMessage(chatId, "❌ Suhbat yakunlandi.")
            delete activeChats[partnerId]
            delete activeChats[chatId]
        } else {
            bot.sendMessage(chatId, "Siz hozir hech kim bilan gaplashmayapsiz ❗")
        }
        return
    }

    if (activeChats[chatId]) {
        bot.sendMessage(activeChats[chatId], text)
    }
})

// ✅ Fake HTTP server → Koyeb port xatosiz o‘tadi
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("Bot is running ✅")
}).listen(process.env.PORT || 8000)
