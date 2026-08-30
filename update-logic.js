
const fs = require("fs");
let code = fs.readFileSync("src/lib/google-wallet.ts", "utf8");

code = code.replace(/body: push.redeem_body \|\| .Viel Spaß mit deiner Prämie! Deine Karte wurde auf 0 zurückgesetzt, du kannst nun wieder neu sammeln..,/, `body: push.redeem_body || t.redeemBody,`);

code = code.replace(/description: .Jetzt bewerten & Feedback geben ⭐.,/, `description: t.reviewText,`);

code = code.replace(/body: push.reward_body \|\| merchant\?.reward_text \|\| .Herzlichen Glückwunsch! Du hast deine Stempelkarte voll. Zeige sie beim nächsten Mal vor..,/, `body: push.reward_body || merchant?.reward_text || t.rewardBody,`);

fs.writeFileSync("src/lib/google-wallet.ts", code);
console.log("Updated Logic!");

