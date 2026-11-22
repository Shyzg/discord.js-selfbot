<div align="center">
 <p>
  <a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
 </p>
</div>

## About

discord.js-selfbot is a powerful [Node.js](https://nodejs.org) module that allows your (Discord) account to easily interact with the [Discord API](https://discord.com/developers/docs/intro).

> **Status:** this is a user-account (selfbot) library — it works with **user tokens only**, not bot tokens. Log in with `client.login(userToken)`, or obtain a token via `normalLogin` (email/password + MFA/captcha), `QRLogin` (QR code), or `passkeyLogin` (WebAuthn passkey).
>
> ⚠️ **Automating a user account violates [Discord's Terms of Service](https://discord.com/terms) and can get the account permanently banned.** Use at your own risk.

- Object-oriented
- Predictable abstractions
- Performant
- 100% coverage of the Discord API

## Installation

**Node.js 24.22.3 or newer is required.**

```sh
npm install @shyzg/discord.js-selfbot
yarn add @shyzg/discord.js-selfbot
pnpm add @shyzg/discord.js-selfbot
bun add @shyzg/discord.js-selfbot
```

## Contributing

Before creating an issue, please ensure that it hasn't already been reported/suggested, and double-check the
[documentation][documentation].

## Credits

- [discord.js]
- [discord.js-selfbot-v13]

## Help

If you don't understand something in the documentation, you are experiencing problems, or you just need a gentle nudge in the right direction, please don't hesitate to join our official [Shyzago Server][discord].

[documentation]: https://discord-js-selfbot.shyzago.dev
[discord]: https://discord.gg/shyzago
[discord.js]: https://github.com/discordjs/discord.js
[discord.js-selfbot-v13]: https://github.com/aiko-chan-ai/discord.js-selfbot-v13
