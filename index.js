require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const token = process.env.TOKEN

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
    let chatId = msg.chat.id
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

    // 📊 STATISTIKA
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

    // 🔍 CHAT IZLASH
    if (text === "Chat izlash") {
        if (activeChats[chatId]) {
            bot.sendMessage(chatId, "Siz allaqachon suhbatdasiz ✅")
            return
        }

        if (waitingUser.includes(chatId)) {
            bot.sendMessage(chatId, "⏳ Siz allaqachon suhbatdosh kutyapsiz...")
            return
        }

        if (waitingUser.length > 0) {
            let partnerId = waitingUser.shift()

            if (partnerId === chatId) {
                if (waitingUser.length > 0) {
                    partnerId = waitingUser.shift()
                } else {
                    waitingUser.push(chatId)
                    bot.sendMessage(chatId, "🔍 Suhbatdosh izlanmoqda...")
                    return
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

    // ❌ SUHBATNI TO‘XTATISH
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

    // 💬 Xabarni boshqa tomonga uzatish
    if (activeChats[chatId]) {
        bot.sendMessage(activeChats[chatId], text)
    }
})
