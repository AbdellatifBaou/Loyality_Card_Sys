import re

with open(r'src\app\[slug]\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add supabase import if not there
if 'import { supabase }' not in content:
    content = content.replace('import { CheckCircle2', 'import { supabase } from \'@/lib/supabase\';\nimport { CheckCircle2')

# Add preMerchant state and useEffect
state_hook_injection = '''  const [preMerchant, setPreMerchant] = useState<any>(null);
  
  useEffect(() => {
    async function loadPreMerchant() {
      const { data } = await supabase.from('merchants_loyality').select('*').eq('slug', slug).single();
      if (data) setPreMerchant(data);
    }
    loadPreMerchant();
  }, [slug]);

  const primaryColor = merchantConfig?.primary_color || preMerchant?.primary_color || '#D4AF37';'''

if 'const [preMerchant, setPreMerchant]' not in content:
    content = content.replace('const [merchantConfig, setMerchantConfig] = useState<any>(null);', 
                              'const [merchantConfig, setMerchantConfig] = useState<any>(null);\n' + state_hook_injection)

content = re.sub(r'^\s*const primaryColor = merchantConfig\?.primary_color \|\| \'#D4AF37\';\s*\n', '', content, flags=re.MULTILINE)

# Replace the input styles in the login page
content = content.replace('className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-2xl px-4 py-5 text-center text-3xl tracking-[0.5em] text-[#D4AF37] outline-none focus:border-[#D4AF37] transition-all placeholder:text-[#D4AF37]/20"',
                          'className="w-full bg-black/50 border rounded-2xl px-4 py-5 text-center text-3xl tracking-[0.5em] outline-none transition-all" style={{ borderColor: `${primaryColor}33`, color: primaryColor }}')

# Replace login button
content = content.replace('style={{ background: \'linear-gradient(135deg, #B8943B 0%, #E8C968 50%, #B8943B 100%)\', color: \'#000\' }}',
                          'style={{ backgroundColor: primaryColor, color: \'#000\' }}')

content = content.replace('bg-gradient-to-r from-[#B8943B] to-[#E8C968]', '')
content = content.replace('Verstanden</button>', 'Verstanden</button>').replace('<button onClick={() => setShowIOSHint(false)} className="w-full mt-5 py-3 rounded-2xl  text-black font-bold">', '<button onClick={() => setShowIOSHint(false)} className="w-full mt-5 py-3 rounded-2xl text-black font-bold" style={{ backgroundColor: primaryColor }}>')

content = content.replace('border-[#D4AF37]/30', '')
content = content.replace('border-[#D4AF37]', '')
content = content.replace('text-[#D4AF37]', '')
content = content.replace('bg-[#D4AF37]', '')

# Instead of blindly removing, let's fix the specific places:
# 1. IOS Hint popup
content = content.replace('className="w-full max-w-md p-6 rounded-3xl bg-[#111] "', 'className="w-full max-w-md p-6 rounded-3xl bg-[#111] border" style={{ borderColor: `${primaryColor}4D` }}')

# 2. Main scanner UI amber colors
content = content.replace('bg-amber-500/20', '').replace('bg-amber-500/10', '').replace('border-amber-500/30', '').replace('border-amber-500/40', '').replace('border-amber-500/20', '').replace('text-amber-400', '')
# Add dynamic styles for scanner error/warning banners
content = content.replace('<div className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold tracking-wide  border-b  ">',
                          '<div className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold tracking-wide border-b" style={{ backgroundColor: `${primaryColor}33`, borderColor: `${primaryColor}4D`, color: primaryColor }}>')

content = content.replace('className="flex items-center gap-1.5 px-3 py-2 rounded-xl border    text-xs font-bold disabled:opacity-50 transition-all active:scale-95"',
                          'className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold disabled:opacity-50 transition-all active:scale-95" style={{ borderColor: `${primaryColor}66`, backgroundColor: `${primaryColor}1A`, color: primaryColor }}')


content = content.replace('<button onClick={() => setStampAmount(1)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 1 ? \' text-black\' : \'text-white/40\'}`}>',
                          '<button onClick={() => setStampAmount(1)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 1 ? \'text-black\' : \'text-white/40\'}`} style={stampAmount === 1 ? { backgroundColor: primaryColor } : {}}>')
content = content.replace('<button onClick={() => setStampAmount(2)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 2 ? \' text-black\' : \'text-white/40\'}`}>',
                          '<button onClick={() => setStampAmount(2)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${stampAmount === 2 ? \'text-black\' : \'text-white/40\'}`} style={stampAmount === 2 ? { backgroundColor: primaryColor } : {}}>')

content = content.replace('className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${showManualInput ? \' text-black \' : \'bg-white/5 text-white/60 border-white/10\'}`}',
                          'className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${!showManualInput && \'bg-white/5 text-white/60 border-white/10\'}`} style={showManualInput ? { backgroundColor: primaryColor, borderColor: primaryColor, color: \'#000\' } : {}}')
content = content.replace('className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${torchOn ? \' text-black \' : \'bg-white/5 text-white/60 border-white/10\'}`}',
                          'className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${!torchOn && \'bg-white/5 text-white/60 border-white/10\'}`} style={torchOn ? { backgroundColor: primaryColor, borderColor: primaryColor, color: \'#000\' } : {}}')

content = content.replace('className=" text-black px-6 py-3 rounded-xl font-bold active:scale-95 transition-all"',
                          'className="text-black px-6 py-3 rounded-xl font-bold active:scale-95 transition-all" style={{ backgroundColor: primaryColor }}')

content = content.replace('<div className="w-16 h-16 rounded-full  border  flex items-center justify-center mx-auto mb-4">',
                          '<div className="w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${primaryColor}33`, borderColor: `${primaryColor}66`, color: primaryColor }}>')
content = content.replace('<div className="p-4 rounded-2xl border  ">',
                          '<div className="p-4 rounded-2xl border" style={{ borderColor: `${primaryColor}33`, backgroundColor: `${primaryColor}1A` }}>')

# Install button outline fix
content = content.replace('hover:border-[#D4AF37]/30 hover:text-white/70', 'hover:text-white/70')

with open(r'src\app\[slug]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
