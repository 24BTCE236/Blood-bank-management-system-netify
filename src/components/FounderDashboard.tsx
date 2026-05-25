import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBloodBank } from '../context/BloodBankContext';
import { BloodGroup, bloodGroups, formatLiters } from '../lib/blood';

const FounderDashboard = () => {
  const { founders, currentFounderId, donors, inventory, addInventory, updateDonor, signOutFounder } = useBloodBank();
  const navigate = useNavigate();
  const [adding, setAdding] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  const current = founders.find((f) => f.id === currentFounderId) ?? null;

  const filteredDonors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return donors;
    return donors.filter((d) => [d.name, d.contact, d.bloodGroup, d.address ?? ''].some((field) => field.toLowerCase().includes(q)));
  }, [donors, search]);

  const handleToggle = (id: string) => {
    const donor = donors.find((d) => d.id === id);
    if (!donor) return;
    updateDonor(id, { active: !donor.active });
  };

  const handleAdd = (group: BloodGroup) => {
    const units = Number(adding[group]) || 0;
    if (units <= 0) return;
    addInventory(group, units);
    setAdding((s) => ({ ...s, [group]: 0 }));
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState('');

  const startEdit = (id: string) => {
    const donor = donors.find((d) => d.id === id);
    if (!donor) return;
    setEditingId(id);
    setEditingAddress(donor.address ?? '');
  };

  const saveEdit = (id: string) => {
    updateDonor(id, { address: editingAddress });
    setEditingId(null);
    setEditingAddress('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingAddress('');
  };

  if (!current) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold">Founder dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">Please sign in as a founder in the main app to access management features.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Founder Management — {current.name}</h2>
        <button className="premium-button-secondary" onClick={() => { signOutFounder(); navigate('/', { replace: true }); }}>
          Logout
        </button>
      </div>

      <section className="mt-6">
        <h3 className="text-lg font-semibold">Donors</h3>
        <div className="mt-3">
          <input
            className="glass-input w-full mb-3"
            placeholder="Search donors by name, contact, blood group, or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-3">
            {filteredDonors.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded border p-3">
                <div className="flex-1">
                  <div className="font-medium">{d.name} — {d.bloodGroup}</div>
                  <div className="text-sm text-slate-400">{d.contact} · Last donation: {d.lastDonationDate}</div>
                  {editingId === d.id ? (
                    <div className="mt-2 flex gap-2">
                      <input className="glass-input" value={editingAddress} onChange={(e) => setEditingAddress(e.target.value)} />
                      <button className="premium-button" onClick={() => saveEdit(d.id)}>Save</button>
                      <button className="premium-button-secondary" onClick={cancelEdit}>Cancel</button>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-300">Address: {d.address ?? '-'}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className={`px-3 py-1 rounded ${d.active ? 'bg-green-600' : 'bg-slate-600'}`} onClick={() => handleToggle(d.id)}>
                    {d.active ? 'Allow donation' : 'Disallow'}
                  </button>
                  {editingId === d.id ? null : (
                    <button className="px-3 py-1 rounded bg-blue-600" onClick={() => startEdit(d.id)}>Edit</button>
                  )}
                </div>
              </div>
            ))}

            {filteredDonors.length === 0 ? (
              <div className="text-sm text-slate-400">No donors match your search.</div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-lg font-semibold">Inventory</h3>
        <div className="mt-3 space-y-3">
          {Object.values(inventory).map((inv) => (
            <div key={inv.group} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">{inv.group}</div>
                <div className="text-sm text-slate-400">{formatLiters(inv.liters)} / {inv.capacity} L</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="units"
                  value={adding[inv.group] ?? ''}
                  onChange={(e) => setAdding((s) => ({ ...s, [inv.group]: Number(e.target.value) }))}
                  className="w-20 rounded border px-2 py-1 text-black"
                />
                <button className="px-3 py-1 rounded bg-rose-600" onClick={() => handleAdd(inv.group)}>
                  Add units
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FounderDashboard;
