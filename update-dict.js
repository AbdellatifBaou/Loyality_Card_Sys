
const fs = require("fs");
let code = fs.readFileSync("src/lib/google-wallet.ts", "utf8");

// Update dictionary
code = code.replace(/de: \{[\s\S]*?\},[\s\S]*?en: \{[\s\S]*?\},[\s\S]*?fr: \{[\s\S]*?\}\s*\};/, `de: {
    stamp: "Stempel",
    address: "Adresse",
    status: "Status",
    redeemHeader: "Prämie eingelöst! ",
    rewardHeader: "Belohnung bereit! ✨",
    defaultStampHeader1: " von 9 Stempeln ",
    defaultStampBodyNear: "Nur noch 1 Stempel bis zu deiner Gratisbelohnung! 🎉",
    defaultStampBody: "Du hast ",
    defaultStampBody2: " Stempel gesammelt. Weiter so!",
    statusRedeemed: "Prämie erfolgreich eingelöst! 🎉",
    statusReady: "DEINE BELOHNUNG IST BEREIT! 🎉",
    statusAlmost: "FAST GESCHAFFT! Nur noch 1 Stempel! 🎉",
    statusHalfway: "HALBZEIT! Du bist auf dem Weg! 🚀",
    statusWelcome: "Willkommen bei {name}! 👋"
  },
  en: {
    stamp: "Stamps",
    address: "Address",
    status: "Status",
    redeemHeader: "Reward redeemed! ",
    rewardHeader: "Reward ready! ✨",
    defaultStampHeader1: " of 9 stamps ",
    defaultStampBodyNear: "Only 1 stamp left until your free reward! 🎉",
    defaultStampBody: "You have collected ",
    defaultStampBody2: " stamps. Keep it up!",
    statusRedeemed: "Reward successfully redeemed! 🎉",
    statusReady: "YOUR REWARD IS READY! 🎉",
    statusAlmost: "ALMOST THERE! Only 1 stamp left! 🎉",
    statusHalfway: "HALFWAY! You are on your way! 🚀",
    statusWelcome: "Welcome to {name}! 👋"
  },
  fr: {
    stamp: "Tampons",
    address: "Adresse",
    status: "Statut",
    redeemHeader: "Récompense réclamée! ",
    rewardHeader: "Récompense prête! ✨",
    defaultStampHeader1: " sur 9 tampons ",
    defaultStampBodyNear: "Plus qu"1 tampon avant votre récompense gratuite! 🎉",
    defaultStampBody: "Vous avez collecté ",
    defaultStampBody2: " tampons. Continuez comme ça!",
    statusRedeemed: "Récompense utilisée avec succès ! 🎉",
    statusReady: "VOTRE RÉCOMPENSE EST PRÊTE ! 🎉",
    statusAlmost: "PRESQUE LÀ ! Plus qu"1 tampon ! 🎉",
    statusHalfway: "À MOITIÉ ! Vous êtes sur la bonne voie ! 🚀",
    statusWelcome: "Bienvenue chez {name} ! 👋"
  }
};`);

// Update logic
code = code.replace(/body: isRedeem[\s\S]*?\}\s*\],/, `body: isRedeem
            ? t.statusRedeemed
            : points >= stampGoal
            ? t.statusReady
            : points >= stampGoal - 1
            ? t.statusAlmost
            : points >= Math.floor(stampGoal / 2)
            ? t.statusHalfway
            : t.statusWelcome.replace("{name}", merchant?.name || "uns")
        },
      ],`);

fs.writeFileSync("src/lib/google-wallet.ts", code);
console.log("Fixed Google Wallet TS!");

