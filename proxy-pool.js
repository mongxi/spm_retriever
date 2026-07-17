// proxy-pool.js  代理池管理
const { chromium } = require('playwright');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ensureBrowser } = require("./crawler-utils");

//  国内代理抓取
async function fetchProxiesFromZdaye() {
    const browserPath = await ensureBrowser();
    if (!browserPath) throw new Error('未找到/下载浏览器，无法继续');

    const browser = await chromium.launch({
        executablePath: browserPath,
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const url = 'https://www.zdaye.com/free/';
    console.log(`正在访问站大爷国内免费代理页: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const html = await page.content();
    const $ = cheerio.load(html);

    const proxies = [];
    $('.ul-row').each((i, row) => {
        const ipElem = $(row).find('.proxy_ip');
        const portElem = $(row).find('.proxy_port');
        const protocolElem = $(row).find('.protocol_span');

        if (ipElem.length && portElem.length) {
            const ip = ipElem.text().trim();
            const portText = portElem.text().trim();
            const portMatch = portText.match(/Port[：:]\s*(\d+)/);
            if (ip && portMatch) {
                const port = portMatch[1];
                const protocol = protocolElem.length ? protocolElem.text().trim().toLowerCase() : 'http';
                proxies.push({
                    server: `${ip}:${port}`,
                    protocol: protocol,
                    ip: ip,
                    port: port
                });
            }
        }
    });

    await browser.close();
    console.log(`抓取到 ${proxies.length} 个国内代理（未验证）`);
    return proxies;
}

//  海外代理抓取
async function fetchProxiesFromZdayeOversea() {
    const browserPath = await ensureBrowser();
    if (!browserPath) throw new Error('未找到/下载浏览器，无法继续');

    const browser = await chromium.launch({
        executablePath: browserPath,
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const url = 'https://www.zdaye.com/free_haiwai/';
    console.log(`正在访问站大爷海外免费代理页: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const html = await page.content();
    const $ = cheerio.load(html);

    const proxies = [];
    $('.ul-row').each((i, row) => {
        const ipElem = $(row).find('.proxy_ip');
        const portElem = $(row).find('.proxy_port');
        const protocolElem = $(row).find('.protocol_span');

        if (ipElem.length && portElem.length) {
            const ip = ipElem.text().trim();
            const portText = portElem.text().trim();
            const portMatch = portText.match(/Port[：:]\s*(\d+)/);
            if (ip && portMatch) {
                const port = portMatch[1];
                const protocol = protocolElem.length ? protocolElem.text().trim().toLowerCase() : 'http';
                proxies.push({
                    server: `${ip}:${port}`,
                    protocol: protocol,
                    ip: ip,
                    port: port
                });
            }
        }
    });

    await browser.close();
    console.log(`抓取到 ${proxies.length} 个海外代理（未验证）`);
    return proxies;
}

//  通用验证函数
async function validateProxy(proxy) {
    try {
        const response = await axios.get('http://httpbin.org/ip', {
            proxy: {
                host: proxy.ip,
                port: parseInt(proxy.port),
                protocol: proxy.protocol === 'https' ? 'https' : 'http'
            },
            timeout: 5000,
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

//  国内代理池管理
let validProxyList = [];

async function refreshProxyPool() {
    console.log('开始刷新国内代理池...');
    const allProxies = await fetchProxiesFromZdaye();
    if (allProxies.length === 0) {
        console.log('未抓取到任何国内代理，代理池清空');
        validProxyList = [];
        return [];
    }

    const httpProxies = allProxies.filter(p => p.protocol === 'http' || p.protocol === 'https');
    console.log(`HTTP/HTTPS 代理数量: ${httpProxies.length}，开始验证...`);

    const valid = [];
    for (const proxy of httpProxies) {
        const isValid = await validateProxy(proxy);
        if (isValid) {
            valid.push(proxy.server);
            console.log(`✓ 可用: ${proxy.server}`);
        } else {
            console.log(`✗ 失效: ${proxy.server}`);
        }
    }

    validProxyList = valid;
    console.log(`国内代理池刷新完成，有效代理数: ${validProxyList.length}`);
    return validProxyList;
}

function getRandomProxy() {
    if (validProxyList.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * validProxyList.length);
    return validProxyList[randomIndex];
}

function getAllProxies() {
    return [...validProxyList];
}

//  海外代理池管理
let validOverseaProxyList = [];

async function refreshOverseaProxyPool() {
    console.log('开始刷新海外代理池...');
    const allProxies = await fetchProxiesFromZdayeOversea();
    if (allProxies.length === 0) {
        console.log('未抓取到任何海外代理，代理池清空');
        validOverseaProxyList = [];
        return [];
    }

    const httpProxies = allProxies.filter(p => p.protocol === 'http' || p.protocol === 'https');
    console.log(`HTTP/HTTPS 海外代理数量: ${httpProxies.length}，开始验证...`);

    const valid = [];
    for (const proxy of httpProxies) {
        const isValid = await validateProxy(proxy);
        if (isValid) {
            valid.push(proxy.server);
            console.log(`✓ 海外可用: ${proxy.server}`);
        } else {
            console.log(`✗ 海外失效: ${proxy.server}`);
        }
    }

    validOverseaProxyList = valid;
    console.log(`海外代理池刷新完成，有效代理数: ${validOverseaProxyList.length}`);
    return validOverseaProxyList;
}

function getRandomOverseaProxy() {
    if (validOverseaProxyList.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * validOverseaProxyList.length);
    return validOverseaProxyList[randomIndex];
}

function getAllOverseaProxies() {
    return [...validOverseaProxyList];
}

//  主入口（测试用）
if (require.main === module) {
    (async () => {
        console.log('测试国内代理 ');
        await refreshProxyPool();
        console.log('随机国内代理:', getRandomProxy());
        console.log('所有国内代理:', getAllProxies());

        console.log('\n测试海外代理');
        await refreshOverseaProxyPool();
        console.log('随机海外代理:', getRandomOverseaProxy());
        console.log('所有海外代理:', getAllOverseaProxies());
    })().catch(console.error);
}

module.exports = {
    // 国内代理
    refreshProxyPool,
    getRandomProxy,
    getAllProxies,
    // 海外代理
    refreshOverseaProxyPool,
    getRandomOverseaProxy,
    getAllOverseaProxies
};
