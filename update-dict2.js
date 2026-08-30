
const fs = require("fs");
let code = fs.readFileSync("src/lib/google-wallet.ts", "utf8");

code = code.replace(/statusWelcome: "Willkommen bei \{name\}! 👋"/, `statusWelcome: "Willkommen bei {name}! 👋",
    redeemBody: "Viel Spaß mit deiner Prämie! Deine Karte wurde auf 0 zurückgesetzt, du kannst nun wieder neu sammeln.",
    rewardBody: "Herzlichen Glückwunsch! Du hast deine Stempelkarte voll. Zeige sie beim nächsten Mal vor.",
    reviewText: "Jetzt bewerten & Feedback geben ⭐"`);

code = code.replace(/statusWelcome: "Welcome to \{name\}! 👋"/, `statusWelcome: "Welcome to {name}! 👋",
    redeemBody: "Enjoy your reward! Your card has been reset to 0, you can start collecting again.",
    rewardBody: "Congratulations! Your stamp card is full. Show it on your next visit.",
    reviewText: "Rate us & give feedback ⭐"`);

code = code.replace(/statusWelcome: "Bienvenue chez \{name\} ! 👋"/, `statusWelcome: "Bienvenue chez {name} ! 👋",
    redeemBody: "Profitez de votre récompense ! Votre carte a été remise à zéro, vous pouvez recommencer à collecter.",
    rewardBody: "Félicitations ! Votre carte de fidélité est pleine. Présentez-la lors de votre prochaine visite.",
    reviewText: "Évaluez-nous & donnez votre avis ⭐"`);

fs.writeFileSync("src/lib/google-wallet.ts", code);
console.log("Updated DICT!");

