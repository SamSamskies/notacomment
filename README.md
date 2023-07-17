# notacomment
Zaps nostr notes when you comment on them.

![screenshot of notacomment server logs](https://cdn.nostr.build/p/nZdM.png)

Whenever you post a comment that contains a lightning emoji followed by a number `⚡️21`, the note you are replying to will be zapped for that amount of sats.

Don't forget to turn off the script when you're done.

## Prerequisites

Node.js and npm - I suggest installing the latest Node.js LTS version from https://nodejs.org. That should also install npm.

## Usage With Strike

1. Create an account with Strike if you don't already have one https://strike.me/download/
1. Get a Strike API key with all the payment scopes from https://dashboard.strike.me/
1. Create a .env file and provide NOSTR_NSEC and STRIKE_API_KEY values (see .env.example)
1. Install the dependencies using npm or yarn or whatever your heart desires
1. Make sure you have money in your Strike account
1. Run the script `npm start`

Keep in mind that Strike pays the invoices from your cash balance. This means the payment rounds up to the nearest cent when paying an invoice, so if you set the zap amount to 1 sat, you'll be sending more money to Strike than the person you are zapping with every zap.

## Usage With LNbits

I recommend making a separate wallet from your main LNbits wallet for usage with notacomment in case you accidentally leak the admin key.

1. Create a .env file and provide NOSTR_NSEC, LNBITS_ADMIN_KEY, and LNBITS_URL values (see .env.example)
1. Install the dependencies using npm or yarn or whatever your heart desires
1. Make sure you have sats in your LNbits wallet
1. Run the script `npm start`
