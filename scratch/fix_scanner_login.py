import re

with open(r'src\app\[slug]\page.tsx', 'r', encoding='utf-8') as f:
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

# Add loading spinner to the login screen branch
content = content.replace('if (!isAuthenticated) {', '''if (!isAuthenticated) {
    if (preLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white/50"></div>
        </div>
      );
    }''')

with open(r'src\app\[slug]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
