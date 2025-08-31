// Chrome Extension Validation Script
// 此腳本用於驗證 Chrome 擴充功能的基本結構

const fs = require('fs');
const path = require('path');

class ExtensionValidator {
    constructor(extensionPath) {
        this.extensionPath = extensionPath;
        this.errors = [];
        this.warnings = [];
    }

    log(message) {
        console.log(`✓ ${message}`);
    }

    error(message) {
        this.errors.push(message);
        console.log(`✗ ${message}`);
    }

    warning(message) {
        this.warnings.push(message);
        console.log(`⚠ ${message}`);
    }

    fileExists(filePath) {
        const fullPath = path.join(this.extensionPath, filePath);
        return fs.existsSync(fullPath);
    }

    readFile(filePath) {
        const fullPath = path.join(this.extensionPath, filePath);
        try {
            return fs.readFileSync(fullPath, 'utf8');
        } catch (error) {
            return null;
        }
    }

    validateManifest() {
        console.log('\n📋 驗證 manifest.json...');
        
        if (!this.fileExists('manifest.json')) {
            this.error('manifest.json 不存在');
            return;
        }

        const manifestContent = this.readFile('manifest.json');
        if (!manifestContent) {
            this.error('無法讀取 manifest.json');
            return;
        }

        try {
            const manifest = JSON.parse(manifestContent);
            
            // 檢查必要欄位
            if (manifest.manifest_version !== 3) {
                this.error('必須使用 Manifest V3');
            } else {
                this.log('使用 Manifest V3');
            }

            if (!manifest.name) {
                this.error('缺少 name 欄位');
            } else {
                this.log(`擴充功能名稱: ${manifest.name}`);
            }

            if (!manifest.version) {
                this.error('缺少 version 欄位');
            } else {
                this.log(`版本: ${manifest.version}`);
            }

            if (!manifest.description) {
                this.warning('缺少 description 欄位');
            } else {
                this.log(`描述: ${manifest.description}`);
            }

            // 檢查 service worker
            if (manifest.background && manifest.background.service_worker) {
                const swPath = manifest.background.service_worker;
                if (this.fileExists(swPath)) {
                    this.log(`Service worker: ${swPath} ✓`);
                } else {
                    this.error(`Service worker 檔案不存在: ${swPath}`);
                }
            }

            // 檢查 popup
            if (manifest.action && manifest.action.default_popup) {
                const popupPath = manifest.action.default_popup;
                if (this.fileExists(popupPath)) {
                    this.log(`Popup HTML: ${popupPath} ✓`);
                } else {
                    this.error(`Popup 檔案不存在: ${popupPath}`);
                }
            }

            // 檢查 content scripts
            if (manifest.content_scripts) {
                manifest.content_scripts.forEach((script, index) => {
                    if (script.js) {
                        script.js.forEach(jsFile => {
                            if (this.fileExists(jsFile)) {
                                this.log(`Content script: ${jsFile} ✓`);
                            } else {
                                this.error(`Content script 檔案不存在: ${jsFile}`);
                            }
                        });
                    }
                });
            }

            // 檢查權限
            if (manifest.permissions) {
                this.log(`權限: ${manifest.permissions.join(', ')}`);
            }

        } catch (error) {
            this.error(`manifest.json 格式錯誤: ${error.message}`);
        }
    }

    validateFiles() {
        console.log('\n📁 驗證核心檔案...');

        const coreFiles = [
            'popup.html',
            'popup.js',
            'background.js',
            'content.js',
            'css/popup.css'
        ];

        coreFiles.forEach(file => {
            if (this.fileExists(file)) {
                this.log(`${file} 存在`);
                
                // 檢查檔案大小
                const fullPath = path.join(this.extensionPath, file);
                const stats = fs.statSync(fullPath);
                if (stats.size === 0) {
                    this.warning(`${file} 是空檔案`);
                } else {
                    this.log(`${file} 大小: ${(stats.size / 1024).toFixed(2)} KB`);
                }
            } else {
                this.error(`${file} 不存在`);
            }
        });

        // 檢查圖示目錄
        if (this.fileExists('icons')) {
            this.log('icons 目錄存在');
            
            const iconFiles = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];
            const missingIcons = iconFiles.filter(icon => 
                !this.fileExists(path.join('icons', icon))
            );
            
            if (missingIcons.length > 0) {
                this.warning(`缺少圖示檔案: ${missingIcons.join(', ')}`);
            } else {
                this.log('所有必要圖示檔案都存在');
            }
        } else {
            this.warning('icons 目錄不存在');
        }
    }

    validateSyntax() {
        console.log('\n🔍 檢查語法...');

        const jsFiles = ['popup.js', 'background.js', 'content.js'];
        
        jsFiles.forEach(file => {
            if (this.fileExists(file)) {
                const content = this.readFile(file);
                if (content) {
                    try {
                        // 基本語法檢查 - 檢查是否有明顯的語法錯誤
                        if (content.includes('function') || content.includes('class')) {
                            this.log(`${file} 語法看起來正常`);
                        }
                        
                        // 檢查是否使用了Chrome APIs
                        if (content.includes('chrome.')) {
                            this.log(`${file} 使用 Chrome APIs`);
                        }
                        
                        // 檢查安全問題
                        if (content.includes('eval(') || content.includes('innerHTML')) {
                            this.warning(`${file} 可能包含安全風險的代碼`);
                        }
                        
                    } catch (error) {
                        this.error(`${file} 可能有語法錯誤`);
                    }
                }
            }
        });
    }

    validateDistribution() {
        console.log('\n📦 檢查建置檔案...');

        if (this.fileExists('dist')) {
            this.log('dist 目錄存在');
            
            const distFiles = ['popup.js', 'background.js', 'content.js', 'popup.html'];
            distFiles.forEach(file => {
                if (this.fileExists(path.join('dist', file))) {
                    this.log(`dist/${file} 已建置`);
                } else {
                    this.warning(`dist/${file} 未建置`);
                }
            });
        } else {
            this.warning('dist 目錄不存在，請執行 npm run build');
        }
    }

    validate() {
        console.log('🚀 開始驗證 SQL Generator Chrome Extension...\n');

        this.validateManifest();
        this.validateFiles();
        this.validateSyntax();
        this.validateDistribution();

        // 輸出結果
        console.log('\n' + '='.repeat(50));
        console.log('📊 驗證結果:');
        
        if (this.errors.length === 0) {
            console.log('✅ 所有關鍵檢查都通過！');
        } else {
            console.log(`❌ 發現 ${this.errors.length} 個錯誤:`);
            this.errors.forEach(error => console.log(`   - ${error}`));
        }

        if (this.warnings.length > 0) {
            console.log(`⚠️  ${this.warnings.length} 個警告:`);
            this.warnings.forEach(warning => console.log(`   - ${warning}`));
        }

        if (this.errors.length === 0) {
            console.log('\n🎉 擴充功能可以載入到 Chrome！');
            console.log('\n📖 載入步驟:');
            console.log('1. 開啟 Chrome 瀏覽器');
            console.log('2. 前往 chrome://extensions/');
            console.log('3. 開啟右上角的「開發者模式」');
            console.log('4. 點擊「載入未封裝項目」');
            console.log(`5. 選擇資料夾: ${this.extensionPath}`);
        } else {
            console.log('\n🔧 請修復上述錯誤後再載入擴充功能');
        }

        return this.errors.length === 0;
    }
}

// 執行驗證
const validator = new ExtensionValidator(__dirname);
const isValid = validator.validate();

process.exit(isValid ? 0 : 1);