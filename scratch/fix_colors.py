import re

filepath = r"src\app\dashboard\[slug]\page.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Clean up tabs:
# Remove all hardcoded `#D4AF37` tailwind classes from the tabs and rely on the style prop
tabs = ['overview', 'analytics', 'marketing', 'billing', 'push', 'qrcodes', 'security']

for tab in tabs:
    # Remove tailwind color for active tab
    pattern_tailwind = rf"activeTab === '{tab}' \? 'border-\[#D4AF37\] text-\[#D4AF37\]' : "
    content = re.sub(pattern_tailwind, rf"activeTab === '{tab}' ? '' : ", content)
    
    # If the tab already has a style tag like qrcodes, we leave it. Otherwise we inject it.
    # Actually, it's easier to just replace all `className={`pb-3 ...`}` block and inject `style` for all tabs.

# For buttons: `bg-[#D4AF37] hover:bg-[#C5A030] text-black`
# We can change it to dynamically use primaryColor in style.
content = re.sub(
    r'className="px-6 py-2.5 bg-\[#D4AF37\] hover:bg-\[#C5A030\] text-black font-semibold rounded-lg transition-colors flex items-center gap-2"',
    r'className="px-6 py-2.5 text-black font-semibold rounded-lg transition-colors flex items-center gap-2 hover:opacity-90"\n                  style={{ backgroundColor: primaryColor }}',
    content
)

# Wait, the marketing send button is:
# bg-[#D4AF37] hover:bg-[#c4a130]
content = re.sub(
    r'className="w-full py-4 bg-\[#D4AF37\] hover:bg-\[#c4a130\] text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"',
    r'className="w-full py-4 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"\n                  style={{ backgroundColor: primaryColor }}',
    content
)

# And other places: `text-[#D4AF37]` or `bg-[#D4AF37]/10` or `border-[#D4AF37]`
content = re.sub(
    r'text-\[#D4AF37\]',
    r'',  # wait, I can't easily strip arbitrary tailwind without replacing it with style={{color: primaryColor}}.
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
