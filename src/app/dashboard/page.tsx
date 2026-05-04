import { supabase } from '@/lib/supabase';
import { Users, Coffee, Gift, Activity } from 'lucide-react';

// Force dynamic rendering since we want live stats
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  // Fetch aggregate data
  const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
  const { count: earnCount } = await supabase.from('stamps').select('*', { count: 'exact', head: true }).eq('type', 'earn');
  const { count: redeemCount } = await supabase.from('stamps').select('*', { count: 'exact', head: true }).eq('type', 'redeem');
  
  // Fetch recent activity
  const { data: recentActivity } = await supabase
    .from('stamps')
    .select('*, customers(wallet_object_id)')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen p-8" style={{ background: '#050505' }}>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <header className="border-b border-white/10 pb-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Marketif <span className="text-[#D4AF37]">Loyalty</span></h1>
          <p className="text-white/50 mt-2 font-medium">Dashboard & Analytics</p>
        </header>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Users size={24} className="text-blue-500" />
              </div>
              <h2 className="text-white/60 font-medium">Aktive Karten</h2>
            </div>
            <p className="text-4xl font-black text-white">{customerCount || 0}</p>
          </div>

          <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
                <Coffee size={24} className="text-green-500" />
              </div>
              <h2 className="text-white/60 font-medium">Vergebene Stempel</h2>
            </div>
            <p className="text-4xl font-black text-white">{earnCount || 0}</p>
          </div>

          <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/20">
                <Gift size={24} className="text-[#D4AF37]" />
              </div>
              <h2 className="text-white/60 font-medium">Eingelöste Prämien</h2>
            </div>
            <p className="text-4xl font-black text-white">{redeemCount || 0}</p>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <Activity size={20} className="text-white/60" />
            <h2 className="text-lg font-bold text-white">Letzte Aktivitäten</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-white/50 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium">Zeitpunkt</th>
                  <th className="p-4 font-medium">Kunde (ID)</th>
                  <th className="p-4 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity?.map((activity: any) => (
                  <tr key={activity.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white/70">
                      {new Date(activity.created_at).toLocaleString('de-DE')}
                    </td>
                    <td className="p-4 text-white/90 font-mono text-sm">
                      {activity.customers?.wallet_object_id?.substring(0, 8)}...
                    </td>
                    <td className="p-4">
                      {activity.type === 'earn' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold uppercase tracking-widest border border-green-500/20">
                          <Coffee size={12} /> +{activity.amount} Stempel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold uppercase tracking-widest border border-[#D4AF37]/20">
                          <Gift size={12} /> Prämie eingelöst
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!recentActivity || recentActivity.length === 0) && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-white/40">Keine Aktivitäten gefunden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
