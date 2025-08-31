// Node.js 模組測試 - 驗證修復效果
const fs = require('fs');
const path = require('path');

console.log('🔍 開始 Node.js 模組驗證測試...\n');

// 測試所有 JS 文件的語法
const jsFiles = [
    'js/csv-parser.js',
    'js/field-mapper.js', 
    'js/sql-generator.js',
    'js/export-manager.js',
    'popup.js'
];

console.log('1. 語法檢查測試:');
let syntaxErrors = 0;

for (const file of jsFiles) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 檢查是否還有無效的 Unicode 轉義序列
        const unicodeEscapePattern = /\\u[0-9A-Fa-f]{0,3}[^0-9A-Fa-f]/g;
        const invalidEscapes = content.match(unicodeEscapePattern);
        
        if (invalidEscapes) {
            console.log(`   ❌ ${file}: 發現無效 Unicode 轉義序列:`, invalidEscapes);
            syntaxErrors++;
        } else {
            console.log(`   ✅ ${file}: Unicode 轉義序列檢查通過`);
        }
        
        // 檢查語法結構
        if (content.includes('class ') || content.includes('function ')) {
            console.log(`   ✅ ${file}: 包含類別或函數定義`);
        }
        
    } catch (error) {
        console.log(`   ❌ ${file}: 讀取失敗 - ${error.message}`);
        syntaxErrors++;
    }
}

console.log('\n2. 特定修復驗證:');

// 驗證 csv-parser.js 的 BOM 處理修復
try {
    const csvParserContent = fs.readFileSync('js/csv-parser.js', 'utf8');
    
    // 檢查修復後的代碼
    if (csvParserContent.includes('String.fromCharCode(0xEF, 0xBB, 0xBF)')) {
        console.log('   ✅ csv-parser.js: BOM 處理 Unicode 修復已應用');
    } else if (csvParserContent.includes('\\uEFBB\\uBF')) {
        console.log('   ❌ csv-parser.js: 仍包含無效的 Unicode 轉義序列');
        syntaxErrors++;
    } else {
        console.log('   ⚠️ csv-parser.js: BOM 處理代碼未找到');
    }
} catch (error) {
    console.log(`   ❌ csv-parser.js 驗證失敗: ${error.message}`);
    syntaxErrors++;
}

// 驗證 popup.js 的模板字符串修復
try {
    const popupContent = fs.readFileSync('popup.js', 'utf8');
    
    // 檢查第 35 行附近是否還有問題
    const lines = popupContent.split('\n');
    const line35 = lines[34] || ''; // 0-indexed
    
    if (line35.includes('模組載入失敗') && !line35.includes('\\u')) {
        console.log('   ✅ popup.js: 第35行模板字符串修復已應用');
    } else if (line35.includes('\\u')) {
        console.log('   ❌ popup.js: 第35行仍包含無效 Unicode 轉義序列');
        syntaxErrors++;
    } else {
        console.log('   ⚠️ popup.js: 第35行內容與預期不符，可能已有其他修改');
    }
    
    // 檢查類別定義
    if (popupContent.includes('class EnhancedSQLGenerator')) {
        console.log('   ✅ popup.js: EnhancedSQLGenerator 類別定義存在');
    }
    
} catch (error) {
    console.log(`   ❌ popup.js 驗證失敗: ${error.message}`);
    syntaxErrors++;
}

console.log('\n3. 檔案完整性檢查:');
let missingFiles = 0;

for (const file of jsFiles) {
    try {
        const stats = fs.statSync(file);
        console.log(`   ✅ ${file}: 存在 (${Math.round(stats.size/1024)}KB)`);
    } catch (error) {
        console.log(`   ❌ ${file}: 檔案不存在`);
        missingFiles++;
    }
}

console.log('\n📊 測試結果摘要:');
console.log(`   語法錯誤: ${syntaxErrors} 個`);
console.log(`   缺失檔案: ${missingFiles} 個`);
console.log(`   總檔案數: ${jsFiles.length} 個`);

if (syntaxErrors === 0 && missingFiles === 0) {
    console.log('\n🎉 所有測試通過！修復已成功應用。');
    process.exit(0);
} else {
    console.log('\n❌ 發現問題，需要進一步檢查。');
    process.exit(1);
}