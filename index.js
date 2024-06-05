const setTitle = require("node-bash-title");
const fs = require("fs");
const prompt = require("prompt-sync")();
const colors = require("colors");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const crypto = require("crypto");
const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const { uniqueNamesGenerator, animals } = require("unique-names-generator");
const { PuppeteerBlocker } = require("@cliqz/adblocker-puppeteer");
const { fetch } = require("cross-fetch");

setTitle("Cyber & Woxy Token Generator");

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.clear();
    ("use-strict");

    console.log("Coded by Cellzx");
    console.log("[" + "1".brightBlue + "] [" + "Start Token Generation".green + "]");
    console.log("[" + "2".brightBlue + "] Help");
    console.log("[" + "3".brightBlue + "] Exit");

    let choice = prompt("[" + "?".brightBlue + "]>");

    if (choice == 1) {
        startTokenGeneration();
    } else if (choice == 2) {
        displayHelp();
    } else if (choice == 3) {
        await sleep(1000);
        process.exit();
    } else {
        console.log("WRONG SELECTION".red);
        await sleep(1000);
        main();
    }
}

async function startTokenGeneration() {
    console.log("[" + "1".brightBlue + "] Temp-mail");
    console.log("[" + "2".brightBlue + "] 10minemail (Recommended)");
    console.log("[" + "3".brightBlue + "] Tempmaildev");
    let emailChoice = prompt("[?]>");

    console.log("[" + "!".red + "] Don't forget to star the project: https://github.com/Cellzx/Discord-Token-Generator");
    let useWebhook = prompt("Do you want to use a webhook? (y/n) [y]>");
    let webhook = useWebhook.toLowerCase() === "y" ? prompt("Enter Webhook URL: ") : null;

    console.log("[" + "!".green + "] Do you want to send tokens to a server? (Premium Feature, contact on Discord, Price: 20 TL)");
    let useServerInvite = prompt("Use Server Invite? (y/n) [y]>");
    let serverInvite = useServerInvite.toLowerCase() === "y" ? prompt("Enter Server Invite Link [No Premium]: ") : null;

    let tokensName = prompt("Token Names (Optional, leave empty for random): ");
    let tokenCount = parseInt(prompt("How many tokens do you want to generate: "), 10);

    const accounts = fs.createWriteStream("tokens.txt", { flags: "a" });
    puppeteer.use(StealthPlugin());
    puppeteer.use(RecaptchaPlugin({
        provider: { id: "2captcha" },
        visualFeedback: true,
        throwOnError: true,
    }));

    const cfg = {
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-infobars", "--window-position=0,0", "--window-size=1366,768"],
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        headless: false,
    };

    for (let i = 0; i < tokenCount; i++) {
        const browser = await puppeteer.launch(cfg);
        try {
            const page = await browser.newPage();
            const token = await createAccount(browser, page, emailChoice, tokensName);
            if (token) {
                accounts.write(token + "\n");
                if (webhook) {
                    await sendTokenToWebhook(webhook, token);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            await browser.close();
            await sleep(60000);
        }
    }
}

async function createAccount(browser, page, emailChoice, tokensName) {
    const username = uniqueNamesGenerator({
        dictionaries: [animals, [tokensName]],
        separator: " ",
        style: "capital",
        length: 2,
    });
    const password = "cyberwoxyninsikidassagi";
    let email;

    while (!email) {
        try {
            email = await generateEmail(page, emailChoice);
        } catch (e) {
            console.error("Error generating email:", e);
        }
    }

    await registerDiscordAccount(page, username, password, email);
    await solveCaptcha(page);

    const verificationLink = await getEmailVerificationLink(page, emailChoice);
    if (verificationLink) {
        await verifyEmail(browser, verificationLink);
        const token = await getTokenFromNetwork(page);
        return token;
    }
    return null;
}

async function generateEmail(page, emailChoice) {
    const emailProviders = [
        { url: "https://temp-mail.org/", selector: "#mail" },
        { url: "https://10minemail.com/", selector: "#mail" },
        { url: "https://tempmail.dev/en/Gmail", selector: "#current-mail" },
    ];

    const { url, selector } = emailProviders[emailChoice - 1];
    await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch).then(blocker => blocker.enableBlockingInPage(page));
    await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

    await page.waitForSelector(selector);
    await page.waitForFunction(selector => document.querySelector(selector).value.includes("@"), {}, selector);
    return await page.$eval(selector, el => el.value);
}

async function registerDiscordAccount(page, username, password, email) {
    await page.goto("https://discord.com/register", { waitUntil: "networkidle0", timeout: 100000 });

    await selectRandomOption(page, "react-select-4-input", 17, 24);
    await selectRandomOption(page, "react-select-3-input", 0, 28);
    await selectRandomOption(page, "react-select-2-input", 0, 11);

    await inputText(page, "username", username);
    await inputText(page, "password", password);
    await inputText(page, "email", email);
    await page.$eval("button[type=submit]", el => el.click());
}

async function inputText(page, inputName, text) {
    const input = await page.$(`input[name=${inputName}]`);
    await input.focus();
    await page.keyboard.type(text);
}

async function selectRandomOption(page, inputId, min, max) {
    const input = await page.$(`input[id=${inputId}]`);
    await input.click();

    const randomIndex = Math.floor(Math.random() * (max - min + 1)) + min;
    await page.waitForSelector("[class*=option]");
    await page.$eval("[class$=option]", (el, index) => el.parentNode.childNodes[index].click(), randomIndex);
}

async function solveCaptcha(page) {
    try {
        await page.waitForSelector("[src*=sitekey]");
        await page.addScriptTag({ content: `hcaptcha.execute()` });

        while (true) {
            try {
                await page.solveRecaptchas();
                return;
            } catch (err) {
                await sleep(3000);
            }
        }
    } catch (e) {
        console.error("Captcha solving failed:", e);
    }
}

async function getEmailVerificationLink(page, emailChoice) {
    const selectors = ["[title*=Discord]", "[title*=Discord]", "#inbox-dataList"];
    const emailLinkSelectors = ["td > a[href*='discord'][style*=background]", "td > a[href*='discord'][style*=background]", "td > a[href*='discord'][style*=background]"];
    const selector = selectors[emailChoice - 1];
    const emailLinkSelector = emailLinkSelectors[emailChoice - 1];

    while (true) {
        try {
            await page.waitForSelector(selector, { timeout: 500 });
            await page.$eval(selector, e => e.parentNode.click());

            await page.waitForSelector(emailLinkSelector);
            return await page.$eval(emailLinkSelector, el => el.href);
        } catch (e) {
            await sleep(500);
        }
    }
}

async function verifyEmail(browser, link) {
    const page = await browser.newPage();
    await page.goto(link, { waitUntil: "networkidle0", timeout: 60000 });
    await solveCaptcha(page);
}

async function getTokenFromNetwork(page) {
    return new Promise(resolve => {
        page.on("response", async response => {
            if (response.url().includes("https://discord.com/api/v9/auth/login")) {
                const json = await response.json();
                resolve(json.token);
            }
        });
    });
}

async function sendTokenToWebhook(webhook, token) {
    await fetch(webhook, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: token }),
    });
}

async function displayHelp() {
    console.log("Created by Cellzx");
    prompt("Press Enter to return to the main menu.");
    main();
}

main();
