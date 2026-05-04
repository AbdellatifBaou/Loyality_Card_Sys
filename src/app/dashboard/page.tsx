import { supabase } from '@/lib/supabase';
import { Users, Coffee, Gift, Activity, CreditCard } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  // Aggregate KPIs
  const { count: customerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  const { count: earnCount } = await supabase
    .from('stamps')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'earn');

  const { count: redeemCount } = await supabase
    .from('stamps')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'redeem');

  // Recent activity
  const { data: recentActivity } = await supabase
    .from('stamps')
    .select('*, customers(wallet_object_id)')
    .order('created_at', { ascending: false })
    .limit(10);

  // All customers with their stamp counts
  const { data: customers } = await supabase
    .from('customers')
    .select('id, wallet_object_id, points, created_at, merchant_id, merchants(name, primary_color)')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen p-6 md:p-8" style={{ background: '#050505' }}>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <header className="border-b border-white/10 pb-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Marketif <span style={{ color: '#D4AF37' }}>Loyalty</span>
          </h1>
          <p className="text-white/50 mt-1 font-medium text-sm">Dashboard & Kundenverwaltung</p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Users size={22} className="text-blue-500" />
              </div>
              <h2 className="text-white/60 font-medium text-sm">Aktive Karten</h2>
            </div>
            <p className="text-4xl font-black text-white">{customerCount || 0}</p>
          </div>

          <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
                <Coffee size={22} className="text-green-500" />
              </div>
              <h2 className="text-white/60 font-medium text-sm">Vergebene Stempel</h2>
            </div>
            <p className="text-4xl font-black text-white">{earnCount || 0}</p>
          </div>

          <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <Gift size={22} style={{ color: '#D4AF37' }} />
              </div>
              <h2 className="text-white/60 font-medium text-sm">Eingelöste Prämien</h2>
            </div>
            <p className="text-4xl font-black text-white">{redeemCount || 0}</p>
          </div>
        </div>

        {/* Customer Management Table */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <CreditCard size={20} className="text-white/60" />
            <h2 className="text-lg font-bold text-white">Kundenkarten</h2>
            <span className="ml-auto text-xs text-white/40 font-medium">{customerCount || 0} Gesamt</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-white/50 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium">Kunden-ID</th>
                  <th className="p-4 font-medium">Händler</th>
                  <th className="p-4 font-medium">Stempel</th>
                  <th className="p-4 font-medium">Fortschritt</th>
                  <th className="p-4 font-medium">Registriert</th>
                </tr>
              </thead>
              <tbody>
                {customers?.map((customer: any) => {
                  const pct = Math.round((customer.points / 10) * 100);
                  const color = customer.merchants?.primary_color || '#D4AF37';
                  return (
                    <tr key={customer.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-1 rounded-lg">
                          {customer.wallet_object_id?.substring(0, 12)}...
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                          {customer.merchants?.name || '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-white font-bold">{customer.points}</span>
                        <span className="text-white/40 text-xs"> / 10</span>
                      </td>
                      <td className="p-4 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                          <span className="text-xs text-white/40 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-white/50 text-xs">
                        {new Date(customer.created_at).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  );
                })}
                {(!customers || customers.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/30">Noch keine Kunden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <Activity size={20} className="text-white/60" />
            <h2 className="text-lg font-bold text-white">Letzte Aktivitäten</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-white/50 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium">Zeitpunkt</th>
                  <th className="p-4 font-medium">Kunde (ID)</th>
                  <th className="p-4 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity?.map((activity: any) => (
                  <tr key={activity.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white/70 text-sm">
                      {new Date(activity.created_at).toLocaleString('de-DE')}
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs text-white/70">
                        {activity.customers?.wallet_object_id?.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="p-4">
                      {activity.type === 'earn' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold uppercase tracking-widest border border-green-500/20">
                          <Coffee size={12} /> +{activity.amount} Stempel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                          <Gift size={12} /> Prämie eingelöst
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!recentActivity || recentActivity.length === 0) && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-white/30">Keine Aktivitäten gefunden.</td>
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
