const { Telegraf, Markup } = require('telegraf')
require("dotenv").config()
const text = require("./const")

const fs = require('fs');

const bot = new Telegraf(process.env.bot_token)
bot.start((ctx) => ctx.reply("Hi"))
bot.help((ctx) => ctx.reply(text.commands))
bot.command("positions", (ctx)=>{
    ctx.replyWithHTML('<b>Виберіть позицію про яку хочете дізнатися інформацію</b>', Markup.inlineKeyboard(
        [
            [Markup.button.callback("Nut","btn_nut")]
        ]
    ))
})

bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply("Hi, bro"))

bot.action('btn_nut', async (ctx)=>{
    await ctx.answerCbQuery()
    try {
        ctx.reply(text.nut)
    } catch (e){
        console.loge(e)
    }
    
})

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))