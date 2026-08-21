import re

filepath = r"src\app\dashboard\[slug]\page.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace linear-gradient buttons with primaryColor
content = re.sub(
    r"style=\{\{\s*background:\s*['`]linear-gradient\(135deg,\s*#B8943B,\s*#E8C968\)['`]\s*\}\}",
    r"style={{ backgroundColor: primaryColor }}",
    content
)

# And one special case:
# style={{ background: 'linear-gradient(135deg, #B8943B, #E8C968)', marginTop: '20px' }} -> style={{ backgroundColor: primaryColor, marginTop: '20px' }}
content = re.sub(
    r"style=\{\{\s*background:\s*'linear-gradient\(135deg,\s*#B8943B,\s*#E8C968\)',([^}]+)\}\}",
    r"style={{ backgroundColor: primaryColor,\1}}",
    content
)

# Line 1101: <Megaphone size={20} className="text-[#D4AF37]" />
content = re.sub(
    r'className="text-\[#D4AF37\]"',
    r'style={{ color: primaryColor }}',
    content
)

# Input focus border colors
# focus:border-[#D4AF37] -> this is tailwind. We can't dynamically inject arbitrary tailwind easily without breaking purge.
# But since React allows inline styles, we could do something like onFocus, but it's hard.
# Actually, the user specifically mentioned the "Marketing tab underline and the Nachricht Senden button". I fixed the tabs earlier.
# Now I just fixed the linear-gradient buttons.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
