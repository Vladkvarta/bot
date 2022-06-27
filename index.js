const { Telegraf, Markup } = require('telegraf')
require("dotenv").config()
const text = require("./const")

let bt_id;
let photo_id;
let msg;

const bot = new Telegraf(process.env.bot_token)
bot.start((ctx) => ctx.reply(text.commands))
bot.command("positions", (ctx) =>
    ctx.replyWithHTML('<b>Виберіть позицію про яку хочете дізнатися інформацію</b>',
        Markup.inlineKeyboard(
            [
                [
                    Markup.button.callback("Горішок", "btn_nut"),
                    Markup.button.callback("Трубочка", "btn_tubule"),
                    Markup.button.callback("Торт вафельний", "btn_wafer")
                ]
            ]
        ))
)



function replyButton() {
    bot.use(async (ctx, next) => {
        try {
            if (ctx.callbackQuery.data) {
                bt_id = ctx.callbackQuery.data;
                photo_id = "./img/" + bt_id + ".jpg";
                msg = text[bt_id];
            }

            await ctx.replyWithPhoto(
                {
                    source: photo_id
                },
                {
                    caption: msg,
                    parse_mode: 'Markdown'
                })

        } catch (e) {
            console.log(e)
        }
        await ctx.telegram.deleteMessage(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id);
        await ctx.replyWithHTML('<b>Виберіть позицію про яку хочете дізнатися інформацію</b>',
        Markup.inlineKeyboard(
            [
                [
                    Markup.button.callback("Горішок", "btn_nut"),
                    Markup.button.callback("Трубочка", "btn_tubule"),
                    Markup.button.callback("Торт вафельний", "btn_wafer")
                ]
            ]
        ))

        return next()
    })
}

replyButton()
//bot.action('delete', (ctx) => ctx.deleteMessage())
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))