
const fs = require("fs");
let code = fs.readFileSync("src/locales/merchant.ts", "utf8");

// DE
code = code.replace(/loginBtn: "Anmelden",/, `loginBtn: "Anmelden",
    heroImageTitle: "Kundenkarten-Design (Hintergrundbild)",
    daysUntilReminder: "Tage bis zur Erinnerung (Standard: 30)",
    staffNamePlaceholder: "Name (z.B. Latif)",
    addBtn: "Hinzufügen",`);
code = code.replace(/enterPasswordFor: "Bitte gib das Passwort für ",/, `enterPasswordFor: "Bitte gib das Passwort ein für ",`);

// EN
code = code.replace(/loginBtn: "Login",/, `loginBtn: "Login",
    heroImageTitle: "Loyalty Card Design (Background Image)",
    daysUntilReminder: "Days until reminder (Default: 30)",
    staffNamePlaceholder: "Name (e.g., Latif)",
    addBtn: "Add",`);

// FR
code = code.replace(/loginBtn: "Se connecter",/, `loginBtn: "Se connecter",
    heroImageTitle: "Design de la carte de fidélité (Image de fond)",
    daysUntilReminder: "Jours avant le rappel (Défaut : 30)",
    staffNamePlaceholder: "Nom (ex: Latif)",
    addBtn: "Ajouter",`);

fs.writeFileSync("src/locales/merchant.ts", code);
console.log("Updated merchant.ts!");

