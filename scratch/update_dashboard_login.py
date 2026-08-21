import re
with open(r'src\app\dashboard\[slug]\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add supabase import
if 'import { supabase }' not in content:
    content = content.replace('import { PRICING }', 'import { supabase } from \'@/lib/supabase\';\nimport { PRICING }')

# Add preMerchant state and useEffect
state_hook_injection = '''  const [preMerchant, setPreMerchant] = useState<any>(null);
  
  useEffect(() => {
    async function loadPreMerchant() {
      const { data } = await supabase.from('merchants_loyality').select('*').eq('slug', slug).single();
      if (data) setPreMerchant(data);
    }
    loadPreMerchant();
  }, [slug]);

  const primaryColor = merchant?.primary_color || preMerchant?.primary_color || '#D4AF37';'''

if 'const [preMerchant, setPreMerchant]' not in content:
    content = content.replace('const [merchant, setMerchant] = useState<any>(null);', 
                              'const [merchant, setMerchant] = useState<any>(null);\n' + state_hook_injection)

# Remove the old primaryColor definition
content = re.sub(r'^\s*const primaryColor = merchant\?.primary_color \|\| \'#D4AF37\';\s*\n', '', content, flags=re.MULTILINE)

# Replace login page styles
content = content.replace('className="text-[#D4AF37]">{slug}', 'style={{ color: primaryColor }}>{slug}')
content = content.replace('background: \'linear-gradient(135deg, #B8943B, #E8C968)\'', 'backgroundColor: primaryColor')
content = content.replace('border border-[#D4AF37]/30 text-white focus:outline-none focus:border-[#D4AF37]', 'border text-white focus:outline-none" style={{ borderColor: `${primaryColor}4D` }}')
content = content.replace('<form onSubmit={handleLogin} className="space-y-4">', '<form onSubmit={handleLogin} className="space-y-4">\n<style>{`input:focus { border-color: ${primaryColor} !important; }`}</style>')

with open(r'src\app\dashboard\[slug]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
