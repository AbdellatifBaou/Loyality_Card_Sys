const fs = require('fs'); let c = fs.readFileSync('src/locales/merchant.ts', 'utf8'); c = c.split('\\\\n').join('\n'); fs.writeFileSync('src/locales/merchant.ts', c);
