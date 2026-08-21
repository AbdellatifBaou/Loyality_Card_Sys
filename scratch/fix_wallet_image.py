import re

with open(r'src\app\api\images\card\[points]\route.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add supabase import
if 'import { supabase }' not in content:
    content = content.replace("import { NextRequest } from 'next/server';", "import { NextRequest } from 'next/server';\nimport { supabase } from '@/lib/supabase';")

fetch_logic = r'''    const { searchParams } = new URL(_req.url);
    const merchantSlug = searchParams.get('merchant');
    let primaryColor = '#D4AF37';
    let stampSymbol = '🍕';

    if (merchantSlug) {
      const { data } = await supabase.from('merchants_loyality').select('primary_color, stamp_symbol').eq('slug', merchantSlug).single();
      if (data?.primary_color) primaryColor = data.primary_color;
      if (data?.stamp_symbol) stampSymbol = data.stamp_symbol;
    }

    const GOLD       = primaryColor;
    const GOLD_LIGHT = primaryColor;
    const hexToRgb = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '212,175,55';
    };
    const rgb = hexToRgb(primaryColor);
    const GOLD_DIM   = `rgba(${rgb},0.5)`;
'''
fetch_logic = fetch_logic.replace('\\', '\\\\')

content = re.sub(r"    const GOLD\s*=\s*'#D4AF37';\n    const GOLD_LIGHT\s*=\s*'#FFE066';\n    const GOLD_DIM\s*=\s*'rgba\(212,175,55,0\.5\)';\n", fetch_logic, content)

content = content.replace("rgba(212,175,55,0.07)", "rgba(${rgb},0.07)")
content = content.replace("rgba(212,175,55,0.9)", "rgba(${rgb},0.9)")
content = content.replace("rgba(212,175,55,0.6)", "rgba(${rgb},0.6)")
content = content.replace("rgba(212,175,55,0.06)", "rgba(${rgb},0.06)")

content = content.replace("'rgba(${rgb},0.07)'", "`rgba(${rgb},0.07)`")
content = content.replace("'rgba(${rgb},0.06)'", "`rgba(${rgb},0.06)`")
content = content.replace("`0 0 40px rgba(212,175,55,0.9), 0 0 12px rgba(212,175,55,0.6), inset 0 4px 0 rgba(255,255,255,0.3)`", "`0 0 40px rgba(${rgb},0.9), 0 0 12px rgba(${rgb},0.6), inset 0 4px 0 rgba(255,255,255,0.3)`")
content = content.replace("<span style={{ fontSize: '72px', lineHeight: 1 }}>🍕</span>", "<span style={{ fontSize: '72px', lineHeight: 1 }}>{stampSymbol}</span>")

with open(r'src\app\api\images\card\[points]\route.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
