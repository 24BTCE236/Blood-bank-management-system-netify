import React, { useRef, useState } from 'react';
import { useBloodBank } from '../context/BloodBankContext';

const FoundersManager = () => {
  const { founders, addFounder, updateFounder, removeFounder, signInFounder, addInventory } = useBloodBank();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form as HTMLFormElement);
    const name = (fd.get('name') as string) || '';
    const email = (fd.get('email') as string) || '';
    const role = (fd.get('role') as string) || 'Founder';
    const password = (fd.get('password') as string) || '';
    const description = (fd.get('description') as string) || '';

    if (!name || !email || !password) {
      setStatus('Provide name, email and password');
      return;
    }

    setStatus('Adding...');
    const res = await addFounder({ name, email, role, description, password });
    setStatus(res.message);
    if (res.ok) {
      // auto sign-in for convenience in demo
      await signInFounder(email, password).catch(() => undefined);
      form.reset();
    }
  };

  return (
    <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-semibold text-white">Manage Founders (demo)</h4>
      <form ref={formRef} onSubmit={handleAdd} className="grid gap-2 sm:grid-cols-2">
        <input name="name" className="glass-input" placeholder="Full name" />
        <input name="email" className="glass-input" placeholder="Email" />
        <input name="role" className="glass-input" placeholder="Role" defaultValue="Founder" />
        <input name="password" className="glass-input" type="password" placeholder="Password" />
        <textarea name="description" className="glass-input min-h-20" placeholder="Description" />
        <div className="sm:col-span-2 mt-3 flex gap-2">
          <button className="premium-button" type="submit">Add founder</button>
          <button className="premium-button-secondary" type="reset" onClick={() => setStatus(null)}>Clear</button>
        </div>
      </form>
      {status ? <div className="mt-3 text-xs text-slate-300">{status}</div> : null}

      <div className="mt-4 text-sm text-slate-300">Existing founders</div>
      <div className="mt-2 grid gap-2">
        {founders.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
            <div>
              <div className="font-medium text-white">{f.name}</div>
              <div className="text-xs text-slate-400">{f.email} · {f.role}</div>
            </div>
            <div className="flex gap-2">
              <button className="premium-button-secondary" onClick={() => { const newName = prompt('New name', f.name); if (newName) updateFounder(f.id, { name: newName }).then((r) => setStatus(r.message)); }}>Edit</button>
              <button className="premium-button-secondary" onClick={() => { if (confirm('Remove founder?')) { const res = removeFounder(f.id); setStatus(res.message); } }}>Remove</button>
              <button className="premium-button-secondary" onClick={async () => {
                const newPass = prompt('Enter new password for this founder');
                if (!newPass) return;
                if (newPass.length < 6 && !confirm('Password is short. Continue?')) return;
                setStatus('Updating password...');
                const res = await updateFounder(f.id, { password: newPass });
                setStatus(res.message);
              }}>Set password</button>
              <button className="premium-button-secondary" onClick={() => {
                const groups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
                const group = prompt(`Enter blood group (${groups.join(',')})`);
                if (!group) return;
                const normalized = group.trim().toUpperCase();
                if (!groups.includes(normalized)) { setStatus('Invalid blood group'); return; }
                const unitsStr = prompt('Units to add (number of bags)');
                if (!unitsStr) return;
                const units = Number(unitsStr);
                if (!Number.isFinite(units) || units <= 0) { setStatus('Invalid units'); return; }
                const res = addInventory(normalized as any, units);
                setStatus(res.message);
              }}>Add blood</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FoundersManager;
