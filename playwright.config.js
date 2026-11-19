const os = require('node:os');
const path = require('node:path');
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  testMatch: 'browser.e2e.test.js',
  use: { baseURL: 'http://127.0.0.1:3000', browserName: 'chromium', headless: true },
  webServer: {
    command: 'node src/server.js',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    env: { ...process.env, DATA_FILE: path.join(os.tmpdir(), `calendar-browser-${process.pid}.json`) },
  },
});
