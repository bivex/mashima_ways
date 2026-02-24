/**
 * Copyright (c) 2026 Bivex
 *
 * Author: Bivex
 * Available for contact via email: support@b-b.top
 * For up-to-date contact information:
 * https://github.com/bivex
 *
 * Created: 2026-02-24 23:49
 * Last Updated: 2026-02-24 23:49
 *
 * Licensed under the MIT License.
 * Commercial licensing available upon request.
 */

export class UserAgentManager {
    constructor() {
        // Реалистичные user agents для разных платформ и браузеров
        this.userAgents = {
            desktop: {
                windows: {
                    chrome: [
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                        'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ],
                    firefox: [
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
                        'Mozilla/5.0 (Windows NT 11.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
                    ],
                    edge: [
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
                    ]
                },
                macos: {
                    chrome: [
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ],
                    safari: [
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
                    ],
                    firefox: [
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:119.0) Gecko/20100101 Firefox/119.0'
                    ]
                },
                linux: {
                    chrome: [
                        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'
                    ]
                }
            },
            mobile: {
                android: {
                    chrome: [
                        'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
                        'Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                    ]
                },
                ios: {
                    safari: [
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                        'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
                    ]
                }
            }
        };

        this.currentIndex = {
            desktop: {
                windows: {chrome: 0, firefox: 0, edge: 0},
                macos: {chrome: 0, safari: 0, firefox: 0},
                linux: {chrome: 0}
            },
            mobile: {android: {chrome: 0}, ios: {safari: 0}}
        };
    }

    /**
     * Получить случайный user agent для указанной платформы и браузера
     */
    getRandom(platform = 'desktop', os = 'windows', browser = 'chrome') {
        const agents = this.userAgents[platform]?.[os]?.[browser];
        if (!agents || agents.length === 0) {
            // Fallback to most common desktop Chrome
            return this.userAgents.desktop.windows.chrome[0];
        }
        return agents[Math.floor(Math.random() * agents.length)];
    }

    /**
     * Получить следующий user agent в ротации (round-robin)
     */
    getNext(platform = 'desktop', os = 'windows', browser = 'chrome') {
        const agents = this.userAgents[platform]?.[os]?.[browser];
        if (!agents || agents.length === 0) {
            return this.userAgents.desktop.windows.chrome[0];
        }

        const currentIdx = this.currentIndex[platform]?.[os]?.[browser] || 0;
        const nextAgent = agents[currentIdx];

        // Update index for next call
        this.currentIndex[platform][os][browser] = (currentIdx + 1) % agents.length;

        return nextAgent;
    }

    /**
     * Получить наиболее популярный user agent для desktop
     */
    getPopularDesktop() {
        return this.getRandom('desktop', 'windows', 'chrome');
    }

    /**
     * Получить наиболее популярный user agent для mobile
     */
    getPopularMobile() {
        return this.getRandom('mobile', 'android', 'chrome');
    }

    /**
     * Получить user agent, имитирующий реального пользователя
     * Случайный выбор между desktop и mobile с учетом популярности
     */
    getRealistic() {
        // 70% desktop, 30% mobile (примерные статистики использования)
        const isMobile = Math.random() < 0.3;

        if (isMobile) {
            // 80% Android, 20% iOS
            return Math.random() < 0.8
                ? this.getRandom('mobile', 'android', 'chrome')
                : this.getRandom('mobile', 'ios', 'safari');
        } else {
            // Desktop: 60% Windows Chrome, 20% macOS Chrome, 10% Windows Firefox, 10% others
            const rand = Math.random();
            if (rand < 0.6) {
                return this.getRandom('desktop', 'windows', 'chrome');
            } else if (rand < 0.8) {
                return this.getRandom('desktop', 'macos', 'chrome');
            } else if (rand < 0.9) {
                return this.getRandom('desktop', 'windows', 'firefox');
            } else {
                return this.getRandom('desktop', 'macos', 'safari');
            }
        }
    }

    /**
     * Проверить, является ли user agent подозрительным (содержит headless, bot и т.д.)
     */
    isSuspicious(userAgent) {
        const suspiciousPatterns = [
            /headless/i,
            /bot/i,
            /crawler/i,
            /spider/i,
            /scraper/i,
            /automation/i,
            /selenium/i,
            /webdriver/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(userAgent));
    }

    /**
     * Получить безопасный user agent (гарантированно без подозрительных паттернов)
     */
    getSafe(platform = 'desktop', os = 'windows', browser = 'chrome') {
        let userAgent;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            userAgent = this.getRandom(platform, os, browser);
            attempts++;
        } while (this.isSuspicious(userAgent) && attempts < maxAttempts);

        // Если все равно подозрительный, возвращаем заведомо безопасный
        if (this.isSuspicious(userAgent)) {
            return this.userAgents.desktop.windows.chrome[0];
        }

        return userAgent;
    }
}

// Singleton instance
export const userAgentManager = new UserAgentManager();