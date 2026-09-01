import re

with open('src/app/dashboard/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacements = [
    (r\"setAuthError\('Verbindungsfehler'\);\", r\"setAuthError((t as any).errConnection || 'Verbindungsfehler');\"),
    (r\"setAuthError\(resData\.error \|\| 'Fehler beim Laden'\);\", r\"setAuthError(resData.error || (t as any).errLoad || 'Fehler beim Laden');\"),
    (r\"setBillingError\(data\.error \|\| 'Fehler beim Checkout'\);\", r\"setBillingError(data.error || (t as any).errUnknown || 'Fehler beim Checkout');\"),
    (r\"setBillingError\('Verbindungsfehler'\);\", r\"setBillingError((t as any).errConnection || 'Verbindungsfehler');\"),
    (r\"setBillingError\(data\.error \|\| 'Fehler beim Laden des Kundenportals'\);\", r\"setBillingError(data.error || (t as any).errLoad || 'Fehler beim Laden des Kundenportals');\"),
    (r\"showToast\('Fehler beim Löschen: ' \+ result\.error, 'error'\);\", r\"showToast(((t as any).errDelete || 'Fehler beim Löschen: ') + result.error, 'error');\"),
    (r\"showToast\('Netzwerkfehler beim Löschen', 'error'\);\", r\"showToast((t as any).errNetwork || 'Netzwerkfehler beim Löschen', 'error');\"),
    (r\"showToast\('Fehler beim Löschen: ' \+ resData\.error, 'error'\);\", r\"showToast(((t as any).errDelete || 'Fehler beim Löschen: ') + resData.error, 'error');\"),
    (r\"setMsgSuccess\('Nachricht erfolgreich an alle Kunden gesendet!'\);\", r\"setMsgSuccess((t as any).msgSentSuccess || 'Nachricht erfolgreich an alle Kunden gesendet!');\"),
    (r\"setMsgSuccess\('Fehler beim Senden\.'\);\", r\"setMsgSuccess((t as any).msgSentError || 'Fehler beim Senden.');\"),
    (r\"showToast\('Systemfehler: ' \+ err\.message, 'error'\);\", r\"showToast(((t as any).errSystem || 'Systemfehler: ') + err.message, 'error');\"),
    (r\"showToast\('Fehler beim Speichern der Push-Einstellungen\.', 'error'\);\", r\"showToast((t as any).errSave || 'Fehler beim Speichern.', 'error');\"),
    (r\"showToast\('Netzwerkfehler\.', 'error'\);\", r\"showToast((t as any).errNetwork || 'Netzwerkfehler.', 'error');\"),
    (r\"showToast\('Fehler beim Aktualisieren: ' \+ \(result\.error \|\| 'Unbekannter Fehler'\), 'error'\);\", r\"showToast(((t as any).errUpdate || 'Fehler beim Aktualisieren: ') + (result.error || (t as any).errUnknown || 'Unbekannter Fehler'), 'error');\"),
    (r\"showToast\('Netzwerkfehler beim Aktualisieren', 'error'\);\", r\"showToast((t as any).errNetwork || 'Netzwerkfehler beim Aktualisieren', 'error');\"),
    (r\"setPinChangeStatus\(\{ loading: false, error: '', success: 'PIN erfolgreich geändert!' \}\);\", r\"setPinChangeStatus({ loading: false, error: '', success: (t as any).pinChangeSuccess || 'PIN erfolgreich geändert!' });\"),
    (r\"setPinChangeStatus\(\{ loading: false, error: data\.error \|\| 'Fehler beim Ändern', success: '' \}\);\", r\"setPinChangeStatus({ loading: false, error: data.error || (t as any).pinChangeError || 'Fehler beim Ändern', success: '' });\"),
    (r\"setPinChangeStatus\(\{ loading: false, error: 'Netzwerkfehler', success: '' \}\);\", r\"setPinChangeStatus({ loading: false, error: (t as any).errNetwork || 'Netzwerkfehler', success: '' });\"),
]

for old, new in replacements:
    code = re.sub(old, new, code)

code = code.replace(\"{deleting ? <RefreshCw size={16} className=\\\"animate-spin\\\" /> : 'Löschen'}\", \"{deleting ? <RefreshCw size={16} className=\\\"animate-spin\\\" /> : ((t as any).delete || 'Löschen')}\")

with open('src/app/dashboard/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Errors Replaced Successfully!')
