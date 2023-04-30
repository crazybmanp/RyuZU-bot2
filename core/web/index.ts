import web, { webCog } from './web';
import { IWebConsumer } from './IWebConsumer';
import { SessionAccessor } from './session';
import { DiscordAuthProviderPublicSession } from './auth';

export default web;
export { webCog, IWebConsumer, SessionAccessor, DiscordAuthProviderPublicSession };