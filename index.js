const { Telegraf } = require('telegraf')
require("dotenv").config()
const text = require("./const")

const bot = new Telegraf(process.env.bot_token)
bot.start((ctx) => ctx.reply('Welcome'))
bot.help((ctx) => ctx.reply(text.commands))

//bot.on('sticker', (ctx) => ctx.reply('👍'))
//bot.hears('hi', (ctx) => ctx.reply('Hey there!'))

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))