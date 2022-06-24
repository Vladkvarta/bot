const { Telegraf, Markup } = require('telegraf')
require("dotenv").config()
const text = require("./const")

const fs = require('fs');
const { stringify } = require('querystring');
let bt_id;
const bot = new Telegraf(process.env.bot_token)
bot.start((ctx) => ctx.reply("Hi"))
bot.help((ctx) => ctx.reply(text.commands))
bot.command("positions", (ctx) => {
    ctx.replyWithHTML('<b>Виберіть позицію про яку хочете дізнатися інформацію</b>', Markup.inlineKeyboard(
        [
            [Markup.button.callback("Горішок", "btn_nut"), Markup.button.callback("Трубочка", "btn_tubule"), Markup.button.callback("Торт вафельний", "btn_wafer")]
        ]
    ))
})
bot.use(async (ctx, next) => {
    if (ctx.callbackQuery.data) {
        bt_id = ctx.callbackQuery.data
        console.log(bt_id)
        await ctx.answerCbQuery()
    try {
        ctx.reply(text[bt_id]) 
    } catch (e){
        console.log(e)
    }
}

    return next()
})

// bot.action('btn_nut', async (ctx)=>{
//     await ctx.answerCbQuery()
//     try {
//         ctx.reply(text.btn_nut)
//     } catch (e){
//         console.loge(e)
//     }

// })

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))