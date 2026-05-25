import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBloodBank } from '../context/BloodBankContext';
import { BloodGroup, bloodGroups } from '../lib/blood';

const DonorPublic = () => {
  const { publicRegisterDonor } = useBloodBank();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    age: '',
    address: '',
    bloodGroup: 'O+' as BloodGroup,
    weight: '',
    lastDonationDate: '',
    contact: '',
    medicalEligibility: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [startTime] = useState(() => Date.now());
  const [a] = useState(() => Math.floor(Math.random() * 8) + 2);
  const [b] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [captionAnswer, setCaptchaAnswer] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const checklist = [
    'No fever or infection in the last 14 days',
    'No antibiotics or surgery in the last 30 days',
    'Healthy hemoglobin and iron levels',
    'No alcohol intake in the last 24 hours',
    'No chronic illness flare-ups or pregnancy',
  ];

  const validate = () => {
    const e: Record<string, string> = {};
    const age = Number(form.age);
    const weight = Number(form.weight);
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!Number.isFinite(age) || age < 18 || age > 65) e.age = 'Age must be between 18 and 65.';
    if (!form.address.trim()) e.address = 'Address is required.';
    if (!Number.isFinite(weight) || weight < 50) e.weight = 'Weight must be at least 50 kg.';
    if (!form.lastDonationDate) e.lastDonationDate = 'Last donation date is required.';
    if (!form.contact.trim() || form.contact.trim().length < 8) e.contact = 'Enter a valid contact number.';
    if (form.medicalEligibility.length < 3) e.medicalEligibility = 'Select at least 3 eligibility checks.';
    const daysSince = form.lastDonationDate ? (Date.now() - Date.parse(form.lastDonationDate)) / (1000 * 60 * 60 * 24) : 0;
    if (form.lastDonationDate && Number.isFinite(daysSince) && daysSince < 90) {
      e.lastDonationDate = 'You must be 90 days past your last donation.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleChecklist = (item: string) => {
    setForm((cur) => {
      const has = cur.medicalEligibility.includes(item);
      return { ...cur, medicalEligibility: has ? cur.medicalEligibility.filter((x) => x !== item) : [...cur.medicalEligibility, item] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // honeypot should be empty
    if (honeypot.trim()) {
      setToast({ type: 'error', message: 'Spam detected.' });
      return;
    }
    // simple time-based deterrent (require at least 3s since page load)
    if (Date.now() - startTime < 3000) {
      setToast({ type: 'error', message: 'Please take a moment to complete the form.' });
      return;
    }
    // simple math captcha
    if (Number(captionAnswer) !== a + b) {
      setToast({ type: 'error', message: 'Captcha answer is incorrect.' });
      return;
    }

    const response = publicRegisterDonor({
      name: form.name.trim(),
      age: Number(form.age),
      address: form.address.trim(),
      bloodGroup: form.bloodGroup,
      weight: Number(form.weight),
      lastDonationDate: form.lastDonationDate,
      contact: form.contact.trim(),
      medicalEligibility: form.medicalEligibility,
    });

    if (!response.ok) {
      setToast({ type: 'error', message: response.message });
      return;
    }

    setToast({ type: 'success', message: response.message });
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 1400);
  };

  return (
    <>
    <div className="min-h-screen bg-dashboard-radial text-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-semibold">Donor Registration</h2>
        <p className="mt-2 text-sm text-slate-300">Fill your details to register as a donor. No founder login required.</p>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          {/* honeypot field - keep hidden to humans */}
          <input aria-hidden value={honeypot} onChange={(e) => setHoneypot(e.target.value)} style={{ position: 'absolute', left: '-9999px', top: 'auto' }} tabIndex={-1} name="website" />
          <div>
            <label className="text-xs text-slate-400">Full name</label>
            <input className="glass-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name ? <p className="text-rose-300 text-xs">{errors.name}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">Age</label>
              <input type="number" className="glass-input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              {errors.age ? <p className="text-rose-300 text-xs">{errors.age}</p> : null}
            </div>
            <div>
              <label className="text-xs text-slate-400">Blood group</label>
              <select className="glass-input" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value as BloodGroup })}>
                {bloodGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Address</label>
            <input className="glass-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            {errors.address ? <p className="text-rose-300 text-xs">{errors.address}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">Weight (kg)</label>
              <input type="number" className="glass-input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              {errors.weight ? <p className="text-rose-300 text-xs">{errors.weight}</p> : null}
            </div>
            <div>
              <label className="text-xs text-slate-400">Last donation date</label>
              <input type="date" className="glass-input" value={form.lastDonationDate} onChange={(e) => setForm({ ...form, lastDonationDate: e.target.value })} />
              {errors.lastDonationDate ? <p className="text-rose-300 text-xs">{errors.lastDonationDate}</p> : null}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Contact</label>
            <input className="glass-input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            {errors.contact ? <p className="text-rose-300 text-xs">{errors.contact}</p> : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white">Medical eligibility checklist</div>
            <div className="mt-3 grid gap-2">
              {checklist.map((item) => (
                <label key={item} className="flex items-center gap-3">
                  <input type="checkbox" checked={form.medicalEligibility.includes(item)} onChange={() => toggleChecklist(item)} />
                  <span className="text-sm text-slate-200">{item}</span>
                </label>
              ))}
              {errors.medicalEligibility ? <p className="text-rose-300 text-xs">{errors.medicalEligibility}</p> : null}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Anti-spam check: what is {a} + {b}?</label>
            <input className="glass-input" value={captionAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} />
          </div>

          <div>
            <button type="submit" className="premium-button w-full">Register as donor</button>
          </div>
        </form>
      </div>
    </div>
    {toast ? (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className={`fixed right-4 bottom-6 z-50 max-w-sm rounded-3xl border px-4 py-3 shadow-glass backdrop-blur-xl ${
          toast.type === 'success' ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-50' : 'border-rose-400/30 bg-rose-500/15 text-rose-50'
        }`}
      >
        <div className="text-sm font-semibold">{toast.type === 'success' ? 'Success' : 'Error'}</div>
        <div className="text-sm opacity-90">{toast.message}</div>
      </motion.div>
    ) : null}
    </>
  );
};

export default DonorPublic;
