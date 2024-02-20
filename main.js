const OpenAI = require("openai");
const {Telegraf} = require("telegraf");
require('dotenv').config();

let busy = false;
const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // is the default and can be omitted
});

const bot = new Telegraf(process.env["TELEGRAM_TOKEN"]);
bot.start((ctx) => ctx.reply(`Чтобы спросить chat gpt нужно начать запрос с 'gpt ....' например
gpt Как установить python на ubuntu?
gpt что значит ls -l
gpt как установить гит
контекст не сохраняется, каждый запрос идет по новой, пока один запрос идет новые запросы посылать нельзя
пожалуйста, используйте ответственно
фидбек приветствуется!
исходник бота: https://github.com/ruslan-yusupov-open/open-ai-telegram-js
`))
    .on('message', async (ctx) => {
        const {text, message_id} = ctx.message ?? {};
        const channelId = ctx.chat?.id;

        if (text?.match(/^gpt .{4}/i) && channelId) {
            const content = text.substring(4);
            if (busy) {
                bot.telegram
                    .sendMessage(channelId, `sorry I'm already busy, please wait!`)
                    .catch(console.error);
            } else {
                busy = true;
                bot.telegram
                    .sendMessage(channelId, `asked gpt '${content}', please wait...`)
                    .then(async (message) => {
                        let msg = message.text;
                        let finished = false;
                        let i = 0;
                        let intervalId;
                        intervalId = setInterval(() => finished || i++ >= 10
                            ? clearInterval(intervalId)
                            : bot.telegram
                                .editMessageText(channelId, message.message_id, undefined, (msg += '...'))
                                .catch(console.error), 1000);
                        const chatCompletion = await openai.chat.completions.create({
                            messages: [{role: 'user', content}],
                            model: 'gpt-4-1106-preview',
                        });
                        bot.telegram
                            .deleteMessage(channelId, message.message_id)
                            .catch(console.error);
                        busy = false;
                        finished = true;
                        bot.telegram
                            .sendMessage(channelId, `${chatCompletion.choices[0]?.message.content}`, {
                                parse_mode: 'Markdown',
                                ...(message_id && {
                                    reply_to_message_id: message_id,
                                }),
                            })
                            .catch(console.error);
                    })
            }

        }
    })
    .launch()
    .catch(console.error);
