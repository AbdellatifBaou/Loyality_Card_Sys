const fs = require('fs'); let c = fs.readFileSync('src/app/dashboard/[slug]/page.tsx', 'utf8'); c = c.replace(/\\} Weiter so!/g, '}'); fs.writeFileSync('src/app/dashboard/[slug]/page.tsx', c);
