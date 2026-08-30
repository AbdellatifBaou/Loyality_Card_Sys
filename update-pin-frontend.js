
const fs = require("fs");
let code = fs.readFileSync("src/app/dashboard/[slug]/page.tsx", "utf8");
code = code.replace(/minLength=\{4\}/g, `minLength={4} maxLength={4} pattern="\\d{4}"`);
code = code.replace(/maxLength=\{6\}/g, `maxLength={4} pattern="\\d{4}"`);
fs.writeFileSync("src/app/dashboard/[slug]/page.tsx", code);

