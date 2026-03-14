/**
 * Qwen Account Creator Automation Script
 * This script automates the creation of Qwen accounts using temporary browser data.
 * Inspired by wahdalo/chatgpt-account-creator, adapted for Qwen's registration flow.
 */

import { firefox } from "playwright";
import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";
import { v4 as uuidv4 } from "uuid";
import * as cheerio from "cheerio";
import { faker } from "@faker-js/faker";

class QwenAccountCreator {
  constructor() {
    this.accountsFile = "accounts.txt";
    this.createdAccounts = [];
    this.configFile = "config.json";
    this.config = this.loadConfig();
    this.currentProgress = null;
  }

  log(message, level = null) {
    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
    let label;
    if (this.currentProgress) {
      label = this.currentProgress;
    } else if (level) {
      label = level;
    } else {
      label = "INFO";
    }
    const logMessage = `[${timestamp}] [${label}] ${message}`;
    console.log(logMessage);
  }

  loadConfig() {
    const defaultConfig = {
      headless: false,
      slow_mo: 1000,
      timeout: 30000,
      password: null,
    };

    try {
      if (fs.existsSync(this.configFile)) {
        const configData = fs.readFileSync(this.configFile, "utf-8");
        const config = JSON.parse(configData);
        Object.assign(defaultConfig, config);

        if (!defaultConfig.password) {
          this.log(
            `❌ Error: Password is not set in config.json! Please add a 'password' field.`,
            "ERROR",
          );
          process.exit(1);
        }

        return defaultConfig;
      } else {
        fs.writeFileSync(
          this.configFile,
          JSON.stringify(defaultConfig, null, 2),
          "utf-8",
        );
        this.log(`📝 Created default config file: ${this.configFile}`);
        this.log(
          `⚠️  Please set your password in config.json before running again.`,
          "WARNING",
        );
        process.exit(1);
      }
    } catch (e) {
      this.log(
        `⚠️ Error loading config: ${e.message}, using defaults`,
        "WARNING",
      );
      return defaultConfig;
    }
  }

  randstr(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateIdentity() {
    return new Promise((resolve, reject) => {
      fetch("https://generator.email/", {
        method: "get",
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
          "accept-encoding": "gzip, deflate, br",
        },
      })
        .then((res) => res.text())
        .then((text) => {
          const $ = cheerio.load(text);
          const domains = [];
          $(".e7m.tt-suggestions")
            .find("div > p")
            .each(function (index, element) {
              domains.push($(element).text());
            });

          if (domains.length > 0) {
            const domain = domains[Math.floor(Math.random() * domains.length)];

            const firstName = faker.person.firstName().replace(/["']/g, "");
            const lastName = faker.person.lastName().replace(/["']/g, "");
            const fullName = `${firstName} ${lastName}`;

            const randomStr = this.randstr(5);
            const email =
              `${firstName}${lastName}${randomStr}@${domain}`.toLowerCase();

            this.log(`📧 Generated email: ${email}`);
            this.log(`👤 Generated name: ${fullName}`);

            resolve({ firstName, lastName, fullName, email });
          } else {
            reject(new Error("No domains found from generator.email"));
          }
        })
        .catch((err) => reject(err));
    });
  }

  saveAccount(email, password) {
    try {
      this.createdAccounts.push({ email, password });
      fs.appendFileSync(this.accountsFile, `${email}|${password}\n`, "utf-8");
      this.log(`💾 Saved account to ${this.accountsFile}: ${email}`);
    } catch (e) {
      this.log(`❌ Error saving account: ${e.message}`, "ERROR");
    }
  }

  async getActivationLink(email, maxRetries = 10, delay = 3) {
    const [username, domain] = email.split("@");

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch("https://generator.email/", {
          method: "GET",
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            cookie: `surl=${domain}/${username}`,
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          redirect: "follow",
        });

        const text = await response.text();
        const $ = cheerio.load(text);

        // Look for email from Qwen in the inbox list
        let activationLink = null;

        // Method 1: Search in inbox list for Qwen activation email
        const emailRows = $("#email-table .e7m.list-group-item");

        emailRows.each((index, row) => {
          const rowText = $(row).text();
          const senderText = $(row).find(".e7m.subj_div_45g45gg").text().trim();

          // Check if this is from Qwen
          if (
            rowText.includes("qwenlm") ||
            rowText.includes("qwen.ai") ||
            senderText.includes("active mail") ||
            senderText.includes("activate")
          ) {
            // Found the Qwen email, now look for activation link in the email body
            // The email content might be loaded on the same page
            const bodyHtml = $(row).html() || "";

            // Search for activation link in the row/email body
            $(row)
              .find("a")
              .each((i, anchor) => {
                const href = $(anchor).attr("href");
                const anchorText = $(anchor).text().trim();
                if (
                  href &&
                  (anchorText.includes("Activate") ||
                    href.includes("activate") ||
                    href.includes("verify"))
                ) {
                  activationLink = href;
                  return false; // break
                }
              });
          }
        });

        // Method 2: Search entire page for activation link from Qwen
        if (!activationLink) {
          $("a").each((i, anchor) => {
            const href = $(anchor).attr("href");
            const anchorText = $(anchor).text().trim();
            if (href && anchorText.includes("Activate My Account")) {
              activationLink = href;
              return false; // break
            }
          });
        }

        // Method 3: Search for any link that looks like a Qwen activation URL
        if (!activationLink) {
          $("a").each((i, anchor) => {
            const href = $(anchor).attr("href");
            if (
              href &&
              (href.includes("qwen.ai") || href.includes("qwenlm")) &&
              (href.includes("activate") ||
                href.includes("verify") ||
                href.includes("confirm") ||
                href.includes("active"))
            ) {
              activationLink = href;
              return false; // break
            }
          });
        }

        if (activationLink) {
          // Normalize relative URL
          if (activationLink.startsWith("/")) {
            activationLink = `https://generator.email${activationLink}`;
          }
          this.log(`✅ Retrieved activation link: ${activationLink}`);
          return activationLink;
        }

        if (attempt < maxRetries - 1) {
          this.log(
            `⏳ Activation email not found, waiting ${delay}s before retry ${attempt + 1}/${maxRetries}...`,
          );
          await this.sleep(delay * 1000);
        }
      } catch (e) {
        this.log(
          `⚠️ Error fetching activation link (attempt ${attempt + 1}): ${e.message}`,
          "WARNING",
        );
        if (attempt < maxRetries - 1) {
          await this.sleep(delay * 1000);
        }
      }
    }

    this.log(
      `❌ Failed to get activation link after ${maxRetries} attempts`,
      "ERROR",
    );
    return null;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  async createAccount(accountNumber, totalAccounts) {
    this.currentProgress = `${accountNumber}/${totalAccounts}`;

    let identity;
    try {
      identity = await this.generateIdentity();
    } catch (e) {
      this.log(`❌ Failed to generate identity: ${e.message}`, "ERROR");
      return false;
    }

    const { fullName, email } = identity;
    const password = this.config.password;

    const uniqueId = uuidv4().substring(0, 8);
    const timestamp = Date.now();
    const tempDir = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        `qwen_browser_${accountNumber}_${timestamp}_${uniqueId}_`,
      ),
    );

    try {
      const firefoxVersion = "131.0";
      const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;

      const extraHttpHeaders = {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      };

      const firefoxUserPrefs = {
        "dom.webdriver.enabled": false,
      };

      const context = await firefox.launchPersistentContext(tempDir, {
        headless: this.config.headless !== false,
        viewport: { width: 1366, height: 768 },
        userAgent: userAgent,
        locale: "en-US",
        timezoneId: "America/New_York",
        deviceScaleFactor: 0.9,
        hasTouch: false,
        isMobile: false,
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        extraHTTPHeaders: extraHttpHeaders,
        firefoxUserPrefs: firefoxUserPrefs,
        timeout: 30000,
      });

      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();

      const firefoxStealthScript = `
                (function() {
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                        configurable: true
                    });
                    
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => {
                            return {
                                length: 0,
                                item: function() { return null; },
                                namedItem: function() { return null; },
                                refresh: function() {}
                            };
                        },
                        configurable: true
                    });
                    
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en'],
                        configurable: true
                    });
                    
                    const originalQuery = window.navigator.permissions.query;
                    if (originalQuery) {
                        window.navigator.permissions.query = (parameters) => (
                            parameters.name === 'notifications' ?
                                Promise.resolve({ state: Notification.permission }) :
                                originalQuery(parameters)
                        );
                    }
                })();
            `;

      await page.addInitScript(firefoxStealthScript);

      // ========================================
      // STEP 1: Navigate to Qwen register page
      // ========================================
      this.log("🌐 Navigating to Qwen...");
      try {
        await page.goto("https://chat.qwen.ai/?mode=register", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await this.sleep(3000);
      } catch (e) {
        this.log(`❌ Error navigating to Qwen: ${e.message}`, "ERROR");
        await context.close();
        return false;
      }

      // ========================================
      // STEP 2: Click "Sign up" button
      // ========================================
      this.log("🔘 Clicking 'Sign up'...");
      try {
        // Check if we're already on the signup form
        const signupFormVisible = await page
          .getByPlaceholder("Enter Your Full Name")
          .isVisible()
          .catch(() => false);

        if (!signupFormVisible) {
          // Need to click Sign up button
          const signupButton = page.getByText("Sign up", { exact: true });
          await signupButton.waitFor({ state: "visible", timeout: 15000 });
          await this.sleep(1000);
          await signupButton.click({ timeout: 10000 });
          await this.sleep(this.randomFloat(2000, 3000));
        }

        // Wait for signup form to appear
        const nameInput = page.getByPlaceholder("Enter Your Full Name");
        await nameInput.waitFor({ state: "visible", timeout: 15000 });
        this.log("✅ Signup form loaded");
      } catch (e) {
        this.log(`❌ Error accessing signup form: ${e.message}`, "ERROR");
        await context.close();
        return false;
      }

      // ========================================
      // STEP 3: Fill the signup form
      // ========================================
      this.log("📝 Filling signup form...");
      try {
        // Fill Full Name
        const nameInput = page.getByPlaceholder("Enter Your Full Name");
        await nameInput.fill(fullName);
        await this.sleep(this.randomFloat(500, 1000));

        // Fill Email
        const emailInput = page.getByPlaceholder("Enter Your Email");
        await emailInput.fill(email);
        await this.sleep(this.randomFloat(500, 1000));

        // Fill Password
        const passwordInput = page
          .getByPlaceholder("Enter Your Password")
          .first();
        await passwordInput.fill(password);
        await this.sleep(this.randomFloat(500, 1000));

        // Fill Confirm Password
        const confirmPasswordInput = page.getByPlaceholder(
          "Enter Your Password Again",
        );
        await confirmPasswordInput.fill(password);
        await this.sleep(this.randomFloat(500, 1000));

        this.log(`✅ Form filled - Name: ${fullName}, Email: ${email}`);
      } catch (e) {
        this.log(`❌ Error filling form: ${e.message}`, "ERROR");
        await context.close();
        return false;
      }

      // ========================================
      // STEP 4: Accept Terms & Click Create Account
      // ========================================
      this.log("☑️ Accepting terms...");
      try {
        // Click the terms checkbox - look for checkbox near "I agree" text
        const agreeCheckbox = page.locator('input[type="checkbox"]').first();

        // Try clicking the checkbox directly
        if (await agreeCheckbox.isVisible({ timeout: 5000 })) {
          await agreeCheckbox.click();
        } else {
          // Fallback: click the text/label that contains "I agree"
          const agreeLabel = page.getByText("I agree", { exact: false });
          await agreeLabel.click();
        }

        await this.sleep(this.randomFloat(500, 1000));
        this.log("✅ Terms accepted");
      } catch (e) {
        this.log(`❌ Error accepting terms: ${e.message}`, "ERROR");
        await context.close();
        return false;
      }

      this.log("🔘 Clicking 'Create Account'...");
      try {
        const createButton = page.getByText("Create Account", { exact: true });
        await createButton.waitFor({ state: "visible", timeout: 10000 });

        await this.sleep(this.randomFloat(500, 1000));
        await createButton.click({ timeout: 10000 });

        await this.sleep(this.randomFloat(3000, 5000));
      } catch (e) {
        this.log(`❌ Error clicking Create Account: ${e.message}`, "ERROR");
        await context.close();
        return false;
      }

      // ========================================
      // STEP 5: Wait for pending activation page
      // ========================================
      this.log("⏳ Waiting for pending activation page...");
      try {
        // Check for known error messages first
        const pageText = await page.textContent("body").catch(() => "");

        if (
          pageText.includes("already been registered") ||
          pageText.includes("already exists")
        ) {
          this.log(`❌ Email already registered: ${email}`, "ERROR");
          await context.close();
          return false;
        }

        // Check for CAPTCHA/challenge
        const currentUrl = page.url();
        if (
          currentUrl.includes("captcha") ||
          currentUrl.includes("challenge") ||
          pageText.includes("verify you are human") ||
          pageText.includes("captcha")
        ) {
          this.log(
            `⚠️ CAPTCHA/challenge detected, skipping this account`,
            "WARNING",
          );
          await context.close();
          return false;
        }

        // Wait for the pending activation message
        const pendingText = page.getByText(
          "The account is pending activation",
          { exact: false },
        );
        await pendingText.waitFor({ state: "visible", timeout: 20000 });

        this.log("✅ Account created, pending activation");
      } catch (e) {
        // Maybe we got redirected somewhere else - check page state
        const pageText = await page.textContent("body").catch(() => "");
        if (
          pageText.includes("pending activation") ||
          pageText.includes("verification email")
        ) {
          this.log(
            "✅ Account created, pending activation (detected via text)",
          );
        } else {
          this.log(
            `❌ Error waiting for activation page: ${e.message}`,
            "ERROR",
          );
          await context.close();
          return false;
        }
      }

      // ========================================
      // STEP 6: Get activation link from email
      // ========================================
      this.log("📧 Waiting for activation email...");
      await this.sleep(8000); // Give email time to arrive

      const activationLink = await this.getActivationLink(email);

      if (!activationLink) {
        this.log(`❌ Failed to get activation link for ${email}`, "ERROR");
        await context.close();
        return false;
      }

      // ========================================
      // STEP 7: Open activation link
      // ========================================
      this.log("🔗 Opening activation link...");
      try {
        await page.goto(activationLink, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await this.sleep(3000);
        this.log("✅ Activation link opened");
      } catch (e) {
        this.log(
          `⚠️ Error opening activation link directly, trying in new tab...`,
          "WARNING",
        );
        try {
          const newPage = await context.newPage();
          await newPage.goto(activationLink, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await this.sleep(3000);
          await newPage.close();
          this.log("✅ Activation link opened in new tab");
        } catch (e2) {
          this.log(`❌ Failed to open activation link: ${e2.message}`, "ERROR");
          await context.close();
          return false;
        }
      }

      // ========================================
      // STEP 8: Go back to Qwen and click "Check Again"
      // ========================================
      this.log("🔄 Going back to Qwen to verify activation...");
      try {
        await page.goto("https://chat.qwen.ai/", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await this.sleep(3000);

        // Try clicking "Check Again" up to 3 times
        for (let checkAttempt = 0; checkAttempt < 3; checkAttempt++) {
          const checkAgainBtn = page.getByText("Check Again", { exact: true });
          const isCheckVisible = await checkAgainBtn
            .isVisible()
            .catch(() => false);

          if (isCheckVisible) {
            this.log(
              `🔘 Clicking 'Check Again' (attempt ${checkAttempt + 1}/3)...`,
            );
            await checkAgainBtn.click({ timeout: 10000 });
            await this.sleep(3000);
          }

          // Check if we've entered the app
          const currentUrl = page.url();
          const bodyText = await page.textContent("body").catch(() => "");

          const isAuthenticated =
            currentUrl.startsWith("https://chat.qwen.ai/") &&
            !currentUrl.includes("auth") &&
            !bodyText.includes("pending activation");

          if (isAuthenticated) {
            this.log(`✅ Account activated and logged in!`);
            this.saveAccount(email, password);
            await context.close();
            return true;
          }

          // Fallback: check for chat composer
          const hasComposer =
            (await page
              .locator("textarea")
              .first()
              .isVisible()
              .catch(() => false)) ||
            (await page
              .locator('[contenteditable="true"]')
              .first()
              .isVisible()
              .catch(() => false));

          if (hasComposer) {
            this.log(`✅ Account activated (detected chat composer)!`);
            this.saveAccount(email, password);
            await context.close();
            return true;
          }

          if (checkAttempt < 2) {
            await this.sleep(2000);
          }
        }

        // If we get here, still try to save - activation link was clicked
        this.log(
          `⚠️ Could not fully verify activation, but link was clicked. Saving account.`,
          "WARNING",
        );
        this.saveAccount(email, password);
        await context.close();
        return true;
      } catch (e) {
        this.log(
          `⚠️ Error during verification, but activation link was opened. Saving account.`,
          "WARNING",
        );
        this.saveAccount(email, password);
        await context.close();
        return true;
      }
    } catch (e) {
      this.log(`❌ Unexpected error: ${e.message}`, "ERROR");
      return false;
    } finally {
      try {
        await this.sleep(1000);
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  async createAccounts(numAccounts) {
    console.log(
      `🚀 Starting account creation for ${numAccounts} accounts...\n`,
    );

    let successful = 0;
    let failed = 0;

    for (let accountNum = 1; accountNum <= numAccounts; accountNum++) {
      this.currentProgress = `${accountNum}/${numAccounts}`;

      try {
        const success = await this.createAccount(accountNum, numAccounts);

        if (success) {
          successful++;
          this.log(`✅ Account completed successfully\n`);
        } else {
          failed++;
          this.log(`❌ Account failed\n`);
        }

        // Delay between accounts
        if (accountNum < numAccounts) {
          const delay = this.randomFloat(2000, 4000);
          await this.sleep(delay);
        }
      } catch (e) {
        this.log(`💥 Error: ${e.message}\n`);
        failed++;
      }
    }

    this.currentProgress = null;
    this.printSummary(successful, failed);
  }

  printSummary(successful, failed) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 ACCOUNT CREATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total accounts saved: ${this.createdAccounts.length}`);
    console.log(`💾 Accounts saved to: ${this.accountsFile}`);

    if (this.createdAccounts.length > 0) {
      console.log("\n✅ CREATED ACCOUNTS:");
      this.createdAccounts.forEach((account, i) => {
        console.log(`  ${i + 1}. ${account.email}`);
      });
    }

    console.log("=".repeat(60));
  }
}

async function main() {
  console.log("🤖 Qwen Account Creator");
  console.log("=".repeat(60));

  const creator = new QwenAccountCreator();

  console.log(`⚙️ Configuration loaded`);
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await new Promise((resolve) => {
      rl.question("\n📝 How many accounts do you want to create? ", resolve);
    });

    const numAccounts = parseInt(answer, 10);
    if (isNaN(numAccounts) || numAccounts <= 0) {
      console.log("❌ Please enter a positive number!");
      rl.close();
      return;
    }

    console.log(`\n🚀 Starting creation of ${numAccounts} account(s)...`);
    console.log(`   Processing one account at a time (sequential mode)\n`);

    await creator.createAccounts(numAccounts);
  } catch (e) {
    if (e.message === "readline was closed") {
      console.log("\n\n🛑 Script interrupted by user (Ctrl+C)");
      console.log("✅ Progress saved to accounts.txt");
    } else {
      console.log(`\n❌ Error: ${e.message}`);
    }
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C
process.on("SIGINT", () => {
  console.log("\n\n🛑 Script interrupted by user (Ctrl+C)");
  console.log("✅ Progress saved to accounts.txt");
  process.exit(0);
});

main().catch(console.error);
