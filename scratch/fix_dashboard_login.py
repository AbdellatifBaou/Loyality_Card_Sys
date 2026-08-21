import re

with open(r'src\app\dashboard\[slug]\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add a loading state
content = content.replace('const [preMerchant, setPreMerchant] = useState<any>(null);', 'const [preMerchant, setPreMerchant] = useState<any>(null);\n  const [preLoading, setPreLoading] = useState(true);')

content = content.replace('''    async function loadPreMerchant() {
      const { data } = await supabase.from('merchants_loyality').select('*').eq('slug', slug).single();
      if (data) setPreMerchant(data);
    }''', '''    async function loadPreMerchant() {
      const { data } = await supabase.from('merchants_loyality').select('*').eq('slug', slug).single();
      if (data) setPreMerchant(data);
      setPreLoading(false);
    }''')

# Add loading spinner before the login screen
content = content.replace('if (!isAuthorized) {', '''if (!isAuthorized) {
    if (preLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white/50"></div>
        </div>
      );
    }''')

# Fix remaining #D4AF37 colors in the dashboard (Charts, borders, focus states)
content = content.replace('border-[#D4AF37]/20', 'border-white/20')
content = content.replace('focus:border-[#D4AF37]', 'focus:border-white/50')
content = content.replace('text-[#D4AF37]', 'text-white/80')
content = content.replace('hover:text-[#D4AF37]', 'hover:text-white')
content = content.replace('bg-[#D4AF37]/10', 'bg-white/10')
content = content.replace('border-[#D4AF37]/50', 'border-white/20')
content = content.replace('shadow-[0_0_40px_rgba(212,175,55,0.15)]', 'shadow-none')

content = content.replace("stroke=\"#D4AF37\"", "stroke={primaryColor}")
content = content.replace("fill: '#D4AF37'", "fill: primaryColor")
content = content.replace("color: '#D4AF37'", "color: primaryColor")

content = content.replace('bg-[#D4AF37]', 'bg-white/20')
content = content.replace('hover:bg-[#C5A030]', 'hover:bg-white/30')

with open(r'src\app\dashboard\[slug]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
