require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = (process.env.WEBAPP_URL || '').trim();

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing. Put it into bot/.env');
  process.exit(1);
}
if (!WEBAPP_URL || !WEBAPP_URL.startsWith('https://')) {
  console.error('❌ WEBAPP_URL is missing or not https. Example: https://username.github.io/repo/');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  const text =
    'Открой генератор резюме в Telegram Mini App 👇\n' +
    'Если откроешь в браузере — тоже работает.';

  return ctx.reply(
    text,
    Markup.inlineKeyboard([
      Markup.button.webApp('Открыть приложение', WEBAPP_URL),
      Markup.button.url('Открыть в браузере', WEBAPP_URL)
    ])
  );
});

bot.command('app', async (ctx) => {
  return ctx.reply(
    'Открыть мини-приложение:',
    Markup.inlineKeyboard([ Markup.button.webApp('Открыть', WEBAPP_URL) ])
  );
});

// полезно: ping
bot.command('ping', (ctx) => ctx.reply('pong ✅'));

bot.launch().then(() => console.log('✅ Bot started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
