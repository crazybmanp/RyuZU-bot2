import sourceMapSupport from 'source-map-support';
import { Bot } from './lib/Bot';
sourceMapSupport.install();

const bot = new Bot('config.json');

void bot.setup();