'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ text: string, type: 'success'|'error' } | null>(null);

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setCurrentUser(session.user);

      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
      if (roleData?.role !== 'admin') { router.push('/'); return; }
      
      setIsAdmin(true);
      fetchProfiles();
    };
    checkAdminAndFetchData();
  }, [router]);

  const fetchProfiles = async () => {
    const { data: allProfiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    const { data: allRoles } = await supabase.from('user_roles').select('*');

    if (allProfiles) {
      const mappedProfiles = allProfiles.map(p => ({
        ...p,
        is_admin: allRoles?.some(r => r.user_id === p.id && r.role === 'admin') || false
      }));
      setProfiles(mappedProfiles);
    }
    setLoading(false);
  };

  const handleCreatePlaceholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    setIsCreating(true);
    const { error } = await supabase.from('profiles').insert([{ display_name: newName }]);
    if (error) alert(`Error: ${error.message}`);
    else { setNewName(''); fetchProfiles(); }
    setIsCreating(false);
  };

  const toggleLock = async (profileId: string, phase: 1 | 2, currentLockStatus: boolean) => {
    const newStatus = !currentLockStatus;
    const updates: any = {};
    if (phase === 1) {
      updates.group_picks_submitted = newStatus;
      updates.is_locked = newStatus; 
    } else {
      updates.knockout_picks_submitted = newStatus;
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', profileId);
    if (!error) fetchProfiles();
    else alert(error.message);
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (userId === currentUser?.id && isCurrentlyAdmin) {
      alert("You cannot remove your own admin status."); return;
    }
    if (isCurrentlyAdmin) {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
      if (!error) {
        await supabase.from('profiles').update({ is_admin: false }).eq('id', userId);
        fetchProfiles();
      } else alert("Error removing admin: " + error.message);
    } else {
      const { error } = await supabase.from('user_roles').upsert([{ user_id: userId, role: 'admin' }], { onConflict: 'user_id' });
      if (!error) {
        await supabase.from('profiles').update({ is_admin: true }).eq('id', userId);
        fetchProfiles();
      } else alert("Error assigning admin: " + error.message);
    }
  };

  // --- KNOCKOUT BULK IMPORT WITH NAME SANITIZATION ---
  const handleBulkImport = async () => {
    if (!importData.trim()) return;
    setIsImporting(true);
    setImportStatus(null);

    // Normalization dictionary for Sheets inconsistencies
    const SHEET_TO_COMMON_MAP: Record<string, string> = {
      "Curaçao": "Curacao", "Curacao": "Curacao",
      "Bosnia-Herzegovina": "Bosnia & Herzigovina", "Bosnia and Herzegovina": "Bosnia & Herzigovina",
      "USA": "United States", "Czech Republic": "Czechia", "Korea Republic": "South Korea",
      "Congo DR": "DR Congo", "Côte d'Ivoire": "Ivory Coast", "Cabo Verde Islands": "Cape Verde"
    };

    try {
      const rows = importData.trim().split('\n');
      const parsedPicks: { playerName: string, team: string, round: string }[] = [];

      rows.forEach(row => {
        const columns = row.split('\t').map(col => col.trim());
        if (columns.length >= 3 && columns[0] !== '') {
          parsedPicks.push({ playerName: columns[0], team: columns[1], round: columns[2] });
        }
      });

      if (parsedPicks.length === 0) throw new Error("Could not parse data. Ensure it is copied directly from Sheets.");

      const players = Array.from(new Set(parsedPicks.map(p => p.playerName)));
      const validRounds = ['R32', 'R16', 'QF', 'SF', 'F', 'CHAMPION', 'TIEBREAKER'];

      for (const playerName of players) {
        let profileId = profiles.find(p => p.display_name?.toLowerCase() === playerName.toLowerCase())?.id;
        if (!profileId) {
          const { data: newProfile, error: profileErr } = await supabase.from('profiles').insert([{ display_name: playerName }]).select('id').single();
          if (profileErr) throw profileErr;
          profileId = newProfile.id;
        }

        const playerPicks = parsedPicks.filter(p => p.playerName === playerName);
        const dbPicksToInsert = playerPicks.map(pick => {
          const cleanRound = String(pick.round).toUpperCase().trim();
          const normalizedTeam = SHEET_TO_COMMON_MAP[pick.team] || pick.team;

          if (!validRounds.includes(cleanRound)) {
            throw new Error(`Invalid round found for ${pick.playerName}. Expected R32, R16, QF, SF, F, CHAMPION, or TIEBREAKER, but got: "${pick.round}"`);
          }

          return { user_id: profileId, team_name: normalizedTeam, predicted_round: cleanRound };
        });

        await supabase.from('phase_2_picks').delete().eq('user_id', profileId);
        const { error: insertErr } = await supabase.from('phase_2_picks').insert(dbPicksToInsert);
        if (insertErr) throw insertErr;
      }

      setImportStatus({ text: `Successfully imported ${parsedPicks.length} knockout picks across ${players.length} players!`, type: 'success' });
      setImportData('');
      fetchProfiles();
    } catch (err: any) {
      console.error(err);
      setImportStatus({ text: err.message || "An error occurred during import.", type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-slate-400 p-10">Verifying credentials...</div>;
  if (!isAdmin) return null;

  return (
    <main className="min-h-screen p-8 bg-slate-950 text-slate-200 font-sans pb-32">
      <div className="max-w-7xl mx-auto space-y-10">
        <header>
          <h1 className="text-4xl font-black text-amber-500 mb-2">Admin Control Panel</h1>
          <p className="text-slate-400">Manage users, import knockout data, and lock brackets.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl h-fit">
            <h2 className="text-lg font-bold text-white mb-4">Add Single Player</h2>
            <p className="text-sm text-slate-400 mb-4">Create a profile so you can manually submit picks for a friend later.</p>
            <form onSubmit={handleCreatePlaceholder} className="flex flex-col gap-4">
              <input type="text" placeholder="Player Name (e.g. John D.)" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:border-amber-500 outline-none" required />
              <button type="submit" disabled={isCreating} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50">
                {isCreating ? 'Creating...' : '+ Add Player'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl border-t-4 border-t-amber-500">
            <h2 className="text-lg font-bold text-amber-400 mb-2">Knockout Stage Bulk Import</h2>
            <p className="text-xs text-slate-400 mb-4">
              Highlight rows in Google Sheets (No Headers) formatted as: <br/>
              <strong className="text-slate-300">Player Name | Team Name | Round (R32, R16, QF, SF, F, CHAMPION, TIEBREAKER)</strong>
            </p>
            <textarea value={importData} onChange={(e) => setImportData(e.target.value)} placeholder={`Amos\tUnited States\tR32\nAmos\tGermany\tR16...`} className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 font-mono focus:border-amber-500 outline-none mb-4 whitespace-pre" />
            {importStatus && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-bold ${importStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                {importStatus.text}
              </div>
            )}
            <button onClick={handleBulkImport} disabled={isImporting || !importData.trim()} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50">
              {isImporting ? 'Processing Data...' : 'Run Knockout Import'}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-xs border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-bold">Player Info</th>
                  <th className="px-6 py-4 font-bold text-center">Group Stage Rights</th>
                  <th className="px-6 py-4 font-bold text-center">Knockout Rights</th>
                  <th className="px-6 py-4 font-bold text-center">Admin Privileges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {profiles.map((profile) => {
                  const isGroupLocked = profile.is_locked || profile.group_picks_submitted;
                  const isKnockoutLocked = profile.knockout_picks_submitted;
                  return (
                    <tr key={profile.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{profile.display_name || 'Unnamed Player'}</div>
                        <div className="text-slate-500 text-xs mt-1">{profile.email || 'Awaiting Signup'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => toggleLock(profile.id, 1, isGroupLocked)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isGroupLocked ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                          {isGroupLocked ? '🔒 Locked' : '🔓 Unlocked'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => toggleLock(profile.id, 2, isKnockoutLocked)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isKnockoutLocked ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                          {isKnockoutLocked ? '🔒 Locked' : '🔓 Unlocked'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => toggleAdmin(profile.id, profile.is_admin)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${profile.is_admin ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}>
                          {profile.is_admin ? 'Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}