import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBloodBank } from '../context/BloodBankContext';
import { BloodGroup, bloodGroups, formatLiters } from '../lib/blood';

const FounderDashboard = () => {
  const { founders, currentFounderId, donors, inventory, addInventory, updateDonor, signOutFounder } = useBloodBank();
  const navigate = useNavigate();
  const [adding, setAdding] = useState<Record<string, number>>({});

  const current = founders.find((f) => f.id === currentFounderId) ?? null;

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
        <div className="mt-3 space-y-3">
          {donors.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">{d.name} — {d.bloodGroup}</div>
                <div className="text-sm text-slate-400">{d.contact} · Last donation: {d.lastDonationDate}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className={`px-3 py-1 rounded ${d.active ? 'bg-green-600' : 'bg-slate-600'}`} onClick={() => handleToggle(d.id)}>
                  {d.active ? 'Allow donation' : 'Disallow'}
                </button>
              </div>
            </div>
          ))}
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
