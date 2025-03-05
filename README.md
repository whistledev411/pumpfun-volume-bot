# 🤖 Pumpfun Volume Bot

This bot allows you to increase the volume of spl tokens on Pumpfun.
<br />
Bot distributes SOL to multiple wallets and use the distributed wallets to buy and sell permanently on the Pumpfun platform.

## 👀 Warning

Please don't use free RPC for my bot, with free rpc, bot can't work correctly cause of network traffic.

## 🐱‍🏍 Update

Sorry for the loss of $sol during the distribution process.<br>
In previous versions, there was a small issue during the distribution process.<br>
If there was an error during this process, the information in the subwallet would not be saved.<br>
I just fixed this issue.<br>
Thank you for reporting this kind of issue.

## 🤞 Upgraded version

Just completed multi dex volume bot that can works for all dexs like pump, raydium, meteora...

## 💬 Contact Me

If you have any question or something, feel free to reach out me anytime via telegram, discord or twitter.
<br>
#### 🌹You're always welcome🌹

Telegram: [@whistle](https://t.me/devbeast5775) <br>

## 👀 Usage
1. Clone the repository

    ```
    git clone https://github.com/whistledev411/pumpfun-volume-bot.git
    cd pumpfun-volume-bot
    ```
2. Install dependencies

    ```
    npm install
    ```
3. Configure the environment variables

    Rename the .env.copy file to .env and set RPC and WSS, main keypair's secret key, and jito auth keypair.

4. Run the bot

    ```
    npm start
    ```
