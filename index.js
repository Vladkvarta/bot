const { Telegraf, Markup,session } = require('telegraf')
const fs = require('fs')
const path = require('path')
const text = require("./const")
const positions = require('./options')
require("dotenv").config()

let bt_id;
let photo_id;
let msg;

// interface SessionData {
//     messageCount: number
//     // ... more session data go here
//   }


//fs.writeFile('qwerty.json', JSON.stringify(qwe), (err) => { if (err) console.log('error') });

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
                msg = createMSG(bt_id)//text[bt_id];
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

function createMSG(id) {
    let q;
    console.log(id);
    console.log(positions);
    try {
        q = positions[id].name
            + "\n" + "Вага: " + positions[id].weight + " гр." + '\n'
            + "Термін придатності: " + positions[id].best_before_date + '\n'
            + "Склад: " + positions[id].Compound + '\n'
            + "Ціна: " + positions[id].price + " грн";
        console.log(q)
    } catch (e) { q = "щось трапилось Т_Т"; console.log("щось трапилось Т_Т") }
    return (q)
}

replyButton()
//bot.action('delete', (ctx) => ctx.deleteMessage())
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))