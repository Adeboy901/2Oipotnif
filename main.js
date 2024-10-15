const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { DateTime } = require("luxon");
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const stripAnsi = (str) => {
  // Regular expression to match ANSI color codes
  const ansiRegex = /\x1b\[.*?m/g;
  return str.replace(ansiRegex, '');
};

class Fintopio {
  constructor() {
    this.baseUrl = "https://fintopio-tg.fintopio.com/api";
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://fintopio-tg.fintopio.com/",
      "Sec-Ch-Ua":
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36",
    };
    // Initialize Telegram Bot
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
  }

  async log(msg, color = "white") {
    const coloredMsg = colors[color](msg);
    console.log(coloredMsg);
    await this.logToFile(stripAnsi(coloredMsg));
    await this.sendLogToTelegram(stripAnsi(coloredMsg));
  }

  async logToFile(msg) {
    const logFile = path.join(__dirname, "logfile.log");
    const timestamp = DateTime.now().toISO();
    const logMessage = `[${timestamp}] ${msg}\n`;
    await fs.appendFile(logFile, logMessage);
  }

  async sendLogToTelegram(msg) {
    if (!this.telegramBotToken || !this.telegramChatId) {
      console.log("Telegram bot token or chat ID not set. Skipping Telegram message.");
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.telegramChatId,
        text: msg
      });
    } catch (error) {
      console.error(`Failed to send log to Telegram: ${error.message}`);
    }
  }

  
  async waitWithCountdown(seconds, msg = 'continue') {
    // Add randomness to the delay: ±3 seconds
    const randomSeconds = seconds + Math.floor(Math.random() * 7) - 3;
    const actualSeconds = Math.max(1, randomSeconds); // Ensure positive delay

    const spinners = ["|", "/", "-", "\\"];
    let i = 0;
    for (let s = actualSeconds; s >= 0; s--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        colors.cyan(`${spinners[i]} Waiting ${s} seconds to ${msg} ${spinners[i]}`)
      );
      i = (i + 1) % spinners.length;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("");
  }

  async auth(userData) {
    const url = `${this.baseUrl}/auth/telegram`;
    const headers = { ...this.headers, Webapp: "true" };

    try {
      const response = await axios.get(`${url}?${userData}`, { headers });
      return response.data.token;
    } catch (error) {
      await this.log(`Authentication error: ${error.message}`, "red");
      return null;
    }
  }

  async getProfile(token) {
    const url = `${this.baseUrl}/referrals/data`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      Webapp: "false, true",
    };

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      await this.log(`Error fetching profile: ${error.message}`, "red");
      return null;
    }
  }

  async checkInDaily(token) {
    const url = `${this.baseUrl}/daily-checkins`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      await axios.post(url, {}, { headers });
      await this.log("Daily check-in successful!", "green");
    } catch (error) {
      await this.log(`Daily check-in error: ${error.message}`, "red");
    }
  }

  async getFarmingState(token) {
    const url = `${this.baseUrl}/farming/state`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      await this.log(`Error fetching farming state: ${error.message}`, "red");
      return null;
    }
  }

  async startFarming(token) {
    // Add delay before starting farming
    await this.waitWithCountdown(Math.floor(Math.random() * 11) + 5, 'start farming');
    
    const url = `${this.baseUrl}/farming/farm`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await axios.post(url, {}, { headers });
      const finishTimestamp = response.data.timings.finish;

      if (finishTimestamp) {
        const finishTime = DateTime.fromMillis(finishTimestamp).toLocaleString(
          DateTime.DATETIME_FULL
        );
        await this.log(`Starting farm...`, "yellow");
        await this.log(`Farming completion time: ${finishTime}`, "green");
      } else {
        await this.log("No completion time available.", "yellow");
      }
    } catch (error) {
      await this.log(`Error starting farming: ${error.message}`, "red");
    }
  }

  async claimFarming(token) {
    // Add delay before claiming farming rewards
    await this.waitWithCountdown(Math.floor(Math.random() * 11) + 5, 'claim farming rewards');
    
    const url = `${this.baseUrl}/farming/claim`;
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      await axios.post(url, {}, { headers });
      await this.log("Farm claimed successfully!", "green");
    } catch (error) {
      await this.log(`Error claiming farm: ${error.message}`, "red");
    }
  }

  async getDiamondInfo(token){
    const url = `${this.baseUrl}/clicker/diamond/state`;
    const headers = {
        ...this.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        await this.log(`Error fetching diamond state: ${error.message}`, "red");
        return null;
    }
  }

  async claimDiamond(token, diamondNumber, totalReward) {
    const url = `${this.baseUrl}/clicker/diamond/complete`;
    const headers = {
        ...this.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    const payload = { "diamondNumber": diamondNumber };

    try {
        await axios.post(url, payload, { headers });
        await this.log(`Success claim ${totalReward} diamonds!`, "green");
    } catch (error) {
        await this.log(`Error claiming Diamond: ${error.message}`, "red");
    }
  }

  async getTask(token) {
    const url = `${this.baseUrl}/hold/tasks`;
    const headers = {
        ...this.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        await this.log(`Error fetching task state: ${error.message}`, "red");
        return null;
    }
  }

  async startTask(token, taskId, slug) {
    // Add delay before starting tasks
    await this.waitWithCountdown(Math.floor(Math.random() * 6) + 3, `start task ${slug}`);
    
    const url = `${this.baseUrl}/hold/tasks/${taskId}/start`;
    const headers = {
        ...this.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
        "origin": "https://fintopio-tg.fintopio.com"
    };
    try {
        await axios.post(url, {}, { headers });
        await this.log(`Starting task ${slug}!`, "green");
    } catch (error) {
        await this.log(`Error starting task: ${error.message}`, "red");
    }
  }

  async claimTask(token, taskId, slug, rewardAmount) {
    // Add delay before claiming tasks
    await this.waitWithCountdown(Math.floor(Math.random() * 6) + 3, `claim task ${slug}`);
    
    const url = `${this.baseUrl}/hold/tasks/${taskId}/claim`;
    const headers = {
        ...this.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
        "origin": "https://fintopio-tg.fintopio.com"
    };
    try {
        await axios.post(url, {}, { headers });
        await this.log(`Task ${slug} complete, reward ${rewardAmount} diamonds!`, "green");
    } catch (error) {
        await this.log(`Error claiming task: ${error.message}`, "red");
    }
  }

  extractFirstName(userData) {
    try {
      const userPart = userData.match(/user=([^&]*)/)[1];
      const decodedUserPart = decodeURIComponent(userPart);
      const userObj = JSON.parse(decodedUserPart);
      return userObj.first_name || "Unknown";
    } catch (error) {
      this.log(`Error extracting first_name: ${error.message}`, "red");
      return "Unknown";
    }
  }

  calculateWaitTime(firstAccountFinishTime) {
    if (!firstAccountFinishTime) return null;

    const now = DateTime.now();
    const finishTime = DateTime.fromMillis(firstAccountFinishTime);
    const duration = finishTime.diff(now);

    return duration.as("milliseconds");
  }

  async main() {
    while (true) {
      const dataFile = path.join(__dirname, "data.txt");
      const data = await fs.readFile(dataFile, "utf8");
      const users = data.split("\n").filter(Boolean);

      let firstAccountFinishTime = null;

      for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        const first_name = this.extractFirstName(userData);
        await this.log(
          `${"=".repeat(5)} Account ${i + 1} | ${colors.green(first_name)} ${"=".repeat(
            5
          )}`,
          "blue"
        );
        const token = await this.auth(userData);
        if (token) {
          await this.log(`Login successful!`, "green");
          const profile = await this.getProfile(token);
          if (profile) {
            const balance = profile.balance;
            await this.log(`Balance: ${balance}`, "green");

            await this.checkInDaily(token);

            const diamond = await this.getDiamondInfo(token);
            if(diamond.state === 'available') {
              await this.waitWithCountdown(Math.floor(Math.random() * (21 - 10)) + 10, 'claim Diamonds');
              await this.claimDiamond(token, diamond.diamondNumber, diamond.settings.totalReward);
            } else {
              const nextDiamondTimeStamp = diamond.timings.nextAt;
              if(nextDiamondTimeStamp) {
                const nextDiamondTime = DateTime.fromMillis(nextDiamondTimeStamp).toLocaleString(DateTime.DATETIME_FULL);
                await this.log(`Next Diamond time: ${nextDiamondTime}`, 'green');

                if (i === 0) {
                  firstAccountFinishTime = nextDiamondTimeStamp;
                }
              }
            }

            const farmingState = await this.getFarmingState(token);

            if (farmingState) {
              if (farmingState.state === "idling") {
                await this.startFarming(token);
              } else if (
                farmingState.state === "farmed" ||
                farmingState.state === "farming"
              ) {
                const finishTimestamp = farmingState.timings.finish;
                if (finishTimestamp) {
                  const finishTime = DateTime.fromMillis(finishTimestamp).toLocaleString(DateTime.DATETIME_FULL);
                  await this.log(`Farming completion time: ${finishTime}`, "green");

                  const currentTime = DateTime.now().toMillis();
                  if (currentTime > finishTimestamp) {
                    await this.claimFarming(token);
                    await this.startFarming(token);
                  }
                }
              }
            }

            const taskState = await this.getTask(token);

            if(taskState) {
              for (const item of taskState.tasks) {
                if(item.status === 'available') {
                  await this.startTask(token, item.id, item.slug);
                } else if(item.status === 'verified') {
                  await this.claimTask(token, item.id, item.slug, item.rewardAmount);
                } else if(item.status === 'in-progress') {
                  continue;
                } else {
                  await this.log(`Verifying task ${item.slug}!`, "green");
                }
              }
            }
          }
        }
      }

      // Add delay between processing users (10-20 seconds)
          if (i < users.length - 1) {
            await this.waitWithCountdown(Math.floor(Math.random() * 11) + 10, 'process next user');
        }
      }

      // Add randomness to the main loop delay
      const waitTime = this.calculateWaitTime(firstAccountFinishTime);
      if (waitTime && waitTime > 0) {
        const randomWaitTime = waitTime + (Math.random() * 300000) - 150000; // Add ±2.5 minutes
        await this.waitWithCountdown(Math.floor(randomWaitTime / 1000), 'start next cycle');
      } else {
        await this.waitWithCountdown(Math.floor(Math.random() * 31) + 30, 'start next cycle'); // 30-60 seconds if no valid wait time
      }
    }
  }

if (require.main === module) {
  const fintopio = new Fintopio();
  fintopio.main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
