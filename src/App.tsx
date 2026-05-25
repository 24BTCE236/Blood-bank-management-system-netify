import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowRight,
  BadgeAlert,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Droplets,
  Filter,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MoonStar,
  Search,
  ShieldCheck,
  Sparkles,
  SunMedium,
  UserPlus2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBloodBank } from './context/BloodBankContext';
import CounterMetric from './components/CounterMetric';
import FoundersManager from './components/FoundersManager';
import FounderDashboard from './components/FounderDashboard';
import DonorPublic from './components/DonorPublic';
import AddDonor from './components/AddDonor';
import {
  BloodGroup,
  bloodGroups,
  bloodBagSizeLiters,
  compatibilityMap,
  donorsMatchRequest,
  formatLiters,
  requestUnitsToLiters,
  stockPercent,
} from './lib/blood';

import { pathToSection, sectionToPath, type DashboardSection } from './lib/navigation';

type DonorFormState = {
  name: string;
  age: string;
  address: string;
  bloodGroup: BloodGroup;
  weight: string;
  lastDonationDate: string;
  contact: string;
  medicalEligibility: string[];
};

type RequestFormState = {
  requesterName: string;
  institution: string;
  bloodGroup: BloodGroup;
  units: string;
  priority: 'Critical' | 'Urgent' | 'Standard';
  location: string;
  contact: string;
  note: string;
};

const donorChecklist = [
  'No fever or infection in the last 14 days',
  'No antibiotics or surgery in the last 30 days',
  'Healthy hemoglobin and iron levels',
  'No alcohol intake in the last 24 hours',
  'No chronic illness flare-ups or pregnancy',
];

const navItems: Array<{ id: DashboardSection; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'donors', label: 'Donors', icon: Users },
  { id: 'requests', label: 'Requests', icon: ClipboardList },
];

const initialDonorForm = (): DonorFormState => ({
  name: '',
  age: '',
  address: '',
  bloodGroup: 'O+',
  weight: '',
  lastDonationDate: '',
  contact: '',
  medicalEligibility: [],
});

const initialRequestForm = (): RequestFormState => ({
  requesterName: '',
  institution: '',
  bloodGroup: 'O+',
  units: '1',
  priority: 'Urgent',
  location: '',
  contact: '',
  note: '',
});

const sectionCopy: Record<DashboardSection, { title: string; description: string }> = {
  overview: {
    title: 'Founders, analytics, inventory control, and secure leadership access in one premium command center.',
    description: 'Live stock reacts to donor intake and dispatch actions, while founder sign-in unlocks operational control for the Netlify-ready demo.',
  },
  donors: {
    title: 'Register donors with strict validation and instant inventory uplift.',
    description: 'Multi-step onboarding, searchable donor history, and donor health gating keep the roster ready for emergency response.',
  },
  requests: {
    title: 'Manage urgent blood requests with one-click dispatch and smart matching.',
    description: 'Filter compatible donors instantly and approve requests only when inventory can satisfy the required units.',
  },
};

const validateDonorForm = (form: DonorFormState) => {
  const errors: Partial<Record<keyof DonorFormState, string>> = {};
  const age = Number(form.age);
  const weight = Number(form.weight);

  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!Number.isFinite(age) || age < 18 || age > 65) errors.age = 'Age must be between 18 and 65.';
  if (!Number.isFinite(weight) || weight < 50) errors.weight = 'Weight must be at least 50 kg.';
  if (!form.lastDonationDate) errors.lastDonationDate = 'Last donation date is required.';
  if (!form.contact.trim() || form.contact.trim().length < 8) errors.contact = 'Enter a valid contact number.';
  if (!form.address.trim()) errors.address = 'Address is required.';
  if (form.medicalEligibility.length < 3) errors.medicalEligibility = 'Select at least 3 eligibility checks.';

  const daysSinceDonation = form.lastDonationDate ? (Date.now() - Date.parse(form.lastDonationDate)) / (1000 * 60 * 60 * 24) : 0;
  if (form.lastDonationDate && Number.isFinite(daysSinceDonation) && daysSinceDonation < 90) {
    errors.lastDonationDate = 'Donor must be 90 days past their last donation.';
  }

  return errors;
};

const validateRequestForm = (form: RequestFormState) => {
  const errors: Partial<Record<keyof RequestFormState, string>> = {};

  if (!form.requesterName.trim()) errors.requesterName = 'Requester name is required.';
  if (!form.institution.trim()) errors.institution = 'Institution is required.';
  if (!form.location.trim()) errors.location = 'Location is required.';
  if (!form.contact.trim()) errors.contact = 'Contact number is required.';
  const units = Number(form.units);
  if (!Number.isFinite(units) || units < 1 || units > 10) errors.units = 'Units must be between 1 and 10.';
  if (!form.note.trim()) errors.note = 'Add a short clinical note.';

  return errors;
};

const App = () => {
  const {
    founders,
    currentFounderId,
    inventory,
    donors,
    requests,
    livesSaved,
    activeView,
    theme,
    setActiveView,
    setTheme,
    signInFounder,
    signOutFounder,
    registerDonor,
    publicRegisterDonor,
    createRequest,
    approveRequest,
    getCompatibleDonors,
  } = useBloodBank();
  const navigate = useNavigate();
  const location = useLocation();

  const [donorForm, setDonorForm] = useState<DonorFormState>(initialDonorForm);
  const [requestForm, setRequestForm] = useState<RequestFormState>(initialRequestForm);
  const [donorStep, setDonorStep] = useState(0);
  const [donorErrors, setDonorErrors] = useState<Partial<Record<keyof DonorFormState, string>>>({});
  const [requestErrors, setRequestErrors] = useState<Partial<Record<keyof RequestFormState, string>>>({});
  const [donorSearch, setDonorSearch] = useState('');
  const [donorGroupFilter, setDonorGroupFilter] = useState<BloodGroup | 'All'>('All');
  const [selectedRequestId, setSelectedRequestId] = useState<string>(() => requests[0]?.id ?? '');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [founderEmail, setFounderEmail] = useState('');
  const [founderPassword, setFounderPassword] = useState('');
  const [founderSignInLoading, setFounderSignInLoading] = useState(false);

  const deferredDonorSearch = useDeferredValue(donorSearch);
  const activeFounder = useMemo(() => founders.find((founder) => founder.id === currentFounderId) ?? null, [founders, currentFounderId]);
  const safeView = (activeView ?? 'overview') as DashboardSection;

  useEffect(() => {
    if (!selectedRequestId && requests[0]) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    const section = pathToSection(location.pathname);
    if (!section && location.pathname !== '/founder-dashboard') {
      navigate(sectionToPath('overview'), { replace: true });
      return;
    }

    if (section && activeView !== section) {
      setActiveView(section);
    }
  }, [activeView, location.pathname, navigate, setActiveView]);

  const totalLitersAvailable = useMemo(
    () => Object.values(inventory).reduce((sum, entry) => sum + entry.liters, 0),
    [inventory],
  );

  const urgentRequestsPending = useMemo(
    () => requests.filter((entry) => entry.status === 'pending' && entry.priority !== 'Standard').length,
    [requests],
  );

  const activeDonors = useMemo(() => donors.filter((entry) => entry.active).length, [donors]);

  const inventoryCards = useMemo(
    () => bloodGroups.map((group) => inventory[group]),
    [inventory],
  );

  const filteredDonors = useMemo(() => {
    const query = deferredDonorSearch.trim().toLowerCase();
    return donors.filter((donor) => {
      const matchesGroup = donorGroupFilter === 'All' || donor.bloodGroup === donorGroupFilter;
      const matchesQuery = !query || [donor.name, donor.contact, donor.bloodGroup].some((field) => field.toLowerCase().includes(query));
      return matchesGroup && matchesQuery;
    });
  }, [deferredDonorSearch, donorGroupFilter, donors]);

  const selectedRequest = useMemo(
    () => requests.find((entry) => entry.id === selectedRequestId) ?? requests[0] ?? null,
    [requests, selectedRequestId],
  );

  const compatibleDonors = useMemo(() => {
    if (!selectedRequest) return [];
    return getCompatibleDonors(selectedRequest.bloodGroup);
  }, [getCompatibleDonors, selectedRequest]);

  const liveRequestSuggestions = useMemo(() => requests.slice(0, 4), [requests]);

  const closeMobileNav = () => setMobileNavOpen(false);

  const goToSection = (section: DashboardSection) => {
    navigate(sectionToPath(section));
    setMobileNavOpen(false);
  };

  const handleDonorSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    // Merge any values that may have been filled by browser autofill or direct DOM edits
    const dom = typeof document !== 'undefined' ? {
      name: (document.querySelector('input[aria-label="Donor name"]') as HTMLInputElement | null)?.value,
      age: (document.querySelector('input[aria-label="Donor age"]') as HTMLInputElement | null)?.value,
      address: (document.querySelector('input[aria-label="Donor address"]') as HTMLInputElement | null)?.value,
      bloodGroup: (document.querySelector('select[aria-label="Donor blood group"]') as HTMLSelectElement | null)?.value,
      weight: (document.querySelector('input[aria-label="Donor weight"]') as HTMLInputElement | null)?.value,
      lastDonationDate: (document.querySelector('input[aria-label="Last donation date"]') as HTMLInputElement | null)?.value,
      contact: (document.querySelector('input[aria-label="Donor contact"]') as HTMLInputElement | null)?.value,
      medicalEligibility: Array.from(document.querySelectorAll('input[type="checkbox"]')).filter((c: any) => c.checked).map((c: any) => c.nextSibling?.textContent?.trim() ?? c.parentElement?.textContent?.trim() ?? ''),
    } : {} as any;

    const mergedForm = {
      ...donorForm,
      name: donorForm.name || dom.name || '',
      age: donorForm.age || dom.age || '',
      address: donorForm.address || dom.address || '',
      bloodGroup: donorForm.bloodGroup || dom.bloodGroup || 'O+',
      weight: donorForm.weight || dom.weight || '',
      lastDonationDate: donorForm.lastDonationDate || dom.lastDonationDate || '',
      contact: donorForm.contact || dom.contact || '',
      medicalEligibility: donorForm.medicalEligibility.length > 0 ? donorForm.medicalEligibility : (dom.medicalEligibility || []),
    };

    const errors = validateDonorForm(mergedForm);
    setDonorErrors(errors);
    if (Object.keys(errors).length > 0) {
      setToast({ type: 'error', message: 'Fix the donor form validations before submitting.' });
      return;
    }

    const payload = {
      name: mergedForm.name.trim(),
      age: Number(mergedForm.age),
      bloodGroup: mergedForm.bloodGroup,
      weight: Number(mergedForm.weight),
      lastDonationDate: mergedForm.lastDonationDate,
      contact: mergedForm.contact.trim(),
      address: mergedForm.address.trim(),
      medicalEligibility: mergedForm.medicalEligibility,
    } as const;

    const response = activeFounder
      ? registerDonor(payload)
      : publicRegisterDonor(payload);

    if (!response.ok) {
      setToast({ type: 'error', message: response.message });
      return;
    }

    setToast({ type: 'success', message: response.message });
    setConfettiKey((value) => value + 1);
    setDonorForm(initialDonorForm());
    setDonorStep(0);
    goToSection('donors');
  };

  const handleRequestSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const errors = validateRequestForm(requestForm);
    setRequestErrors(errors);
    if (Object.keys(errors).length > 0) {
      setToast({ type: 'error', message: 'Fix the request form before posting.' });
      return;
    }

    const response = createRequest({
      requesterName: requestForm.requesterName.trim(),
      institution: requestForm.institution.trim(),
      bloodGroup: requestForm.bloodGroup,
      units: Number(requestForm.units),
      priority: requestForm.priority,
      location: requestForm.location.trim(),
      contact: requestForm.contact.trim(),
      note: requestForm.note.trim(),
    });

    if (!response.ok) {
      setToast({ type: 'error', message: response.message });
      return;
    }

    setToast({ type: 'success', message: response.message });
    setRequestForm(initialRequestForm());
    setSelectedRequestId(requests[0]?.id ?? '');
    goToSection('requests');
  };

  const handleApprove = (requestId: string) => {
    const response = approveRequest(requestId);
    if (!response.ok) {
      setToast({ type: 'error', message: response.message });
      return;
    }

    setToast({ type: 'success', message: response.message });
  };

  const setChecklist = (item: string) => {
    setDonorForm((current) => {
      const hasItem = current.medicalEligibility.includes(item);
      const next = hasItem
        ? current.medicalEligibility.filter((entry) => entry !== item)
        : [...current.medicalEligibility, item];
      return { ...current, medicalEligibility: next };
    });
  };

  // Use DOM fallbacks so browser autofill or direct DOM edits are respected when deciding step advancement
  const domFallback = typeof document !== 'undefined' ? {
    name: (document.querySelector('input[aria-label="Donor name"]') as HTMLInputElement | null)?.value,
    age: (document.querySelector('input[aria-label="Donor age"]') as HTMLInputElement | null)?.value,
    weight: (document.querySelector('input[aria-label="Donor weight"]') as HTMLInputElement | null)?.value,
    bloodGroup: (document.querySelector('select[aria-label="Donor blood group"]') as HTMLSelectElement | null)?.value,
    lastDonationDate: (document.querySelector('input[aria-label="Last donation date"]') as HTMLInputElement | null)?.value,
    contact: (document.querySelector('input[aria-label="Donor contact"]') as HTMLInputElement | null)?.value,
    address: (document.querySelector('input[aria-label="Donor address"]') as HTMLInputElement | null)?.value,
    medicalEligibility: Array.from(document.querySelectorAll('input[type="checkbox"]')).filter((c: any) => c.checked).map((c: any) => c.nextSibling?.textContent?.trim() ?? c.parentElement?.textContent?.trim() ?? ''),
  } : {} as any;

  const canAdvanceDonorStep = donorStep === 0
    ? Boolean((donorForm.name || domFallback.name) && (donorForm.age || domFallback.age) && (donorForm.weight || domFallback.weight) && (donorForm.bloodGroup || domFallback.bloodGroup))
    : donorStep === 1
      ? Boolean((donorForm.lastDonationDate || domFallback.lastDonationDate) && (donorForm.contact || domFallback.contact))
      : (donorForm.medicalEligibility.length >= 3 || (domFallback.medicalEligibility || []).length >= 3);

  const advanceDonorStep = () => {
    // sync DOM values into React state before advancing to the next step
    const dom = domFallback;
    setDonorForm((current) => ({
      ...current,
      name: current.name || dom.name || current.name,
      age: current.age || dom.age || current.age,
      weight: current.weight || dom.weight || current.weight,
      bloodGroup: (current.bloodGroup || dom.bloodGroup) as BloodGroup,
      lastDonationDate: current.lastDonationDate || dom.lastDonationDate || current.lastDonationDate,
      contact: current.contact || dom.contact || current.contact,
      address: current.address || dom.address || current.address,
      medicalEligibility: current.medicalEligibility.length > 0 ? current.medicalEligibility : (dom.medicalEligibility || []),
    }));
    setDonorStep((value) => Math.min(2, value + 1));
  };

  const stepTitles = ['Identity', 'Health', 'Eligibility'];
  const activeDonorCount = activeDonors;

  const themeToggleLabel = theme === 'dark' ? 'Activate light mode' : 'Activate dark mode';

  const handleFounderSignIn = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setFounderSignInLoading(true);
    // Fallback to read DOM inputs directly (handles browser autofill or stale React state)
    const emailInput = document.querySelector('input[aria-label="Founder email"]') as HTMLInputElement | null;
    const passwordInput = document.querySelector('input[aria-label="Founder password"]') as HTMLInputElement | null;
    const emailToUse = (founderEmail && founderEmail.trim()) || emailInput?.value || '';
    const passwordToUse = (founderPassword && founderPassword.trim()) || passwordInput?.value || '';

    const response = await signInFounder(emailToUse, passwordToUse);
    setFounderSignInLoading(false);

    if (!response.ok) {
      setToast({ type: 'error', message: response.message });
      return;
    }

    setToast({ type: 'success', message: response.message });
    setFounderPassword('');
    navigate('/founder-dashboard', { replace: true });
  };

  // Developer helper: expose an auto-submit function for testing (removed after component unmount)
  useEffect(() => {
    (window as any).__autoSubmitDonor = async () => {
      try {
        const dom = {
          name: (document.querySelector('input[aria-label="Donor name"]') as HTMLInputElement | null)?.value || donorForm.name,
          age: (document.querySelector('input[aria-label="Donor age"]') as HTMLInputElement | null)?.value || donorForm.age,
          weight: (document.querySelector('input[aria-label="Donor weight"]') as HTMLInputElement | null)?.value || donorForm.weight,
          bloodGroup: (document.querySelector('select[aria-label="Donor blood group"]') as HTMLSelectElement | null)?.value || donorForm.bloodGroup,
          lastDonationDate: (document.querySelector('input[aria-label="Last donation date"]') as HTMLInputElement | null)?.value || donorForm.lastDonationDate,
          contact: (document.querySelector('input[aria-label="Donor contact"]') as HTMLInputElement | null)?.value || donorForm.contact,
          address: (document.querySelector('input[aria-label="Donor address"]') as HTMLInputElement | null)?.value || donorForm.address,
          medicalEligibility: Array.from(document.querySelectorAll('input[type="checkbox"]')).filter((c: any) => c.checked).map((c: any) => c.nextSibling?.textContent?.trim() ?? c.parentElement?.textContent?.trim() ?? ''),
        };

        const merged = {
          ...donorForm,
          name: dom.name || donorForm.name,
          age: dom.age || donorForm.age,
          weight: dom.weight || donorForm.weight,
          bloodGroup: dom.bloodGroup || donorForm.bloodGroup,
          lastDonationDate: dom.lastDonationDate || donorForm.lastDonationDate,
          contact: dom.contact || donorForm.contact,
          address: dom.address || donorForm.address,
          medicalEligibility: donorForm.medicalEligibility.length > 0 ? donorForm.medicalEligibility : (dom.medicalEligibility || []),
        };

        const payload = {
          name: merged.name.trim(),
          age: Number(merged.age),
          bloodGroup: merged.bloodGroup,
          weight: Number(merged.weight),
          lastDonationDate: merged.lastDonationDate,
          contact: merged.contact.trim(),
          address: merged.address.trim(),
          medicalEligibility: merged.medicalEligibility,
        } as const;

        const response = activeFounder ? registerDonor(payload) : publicRegisterDonor(payload);
        return response;
      } catch (e) {
        return { ok: false, message: String(e) };
      }
    };

    return () => { delete (window as any).__autoSubmitDonor; };
  }, [donorForm, registerDonor, publicRegisterDonor, activeFounder]);

  const handleFounderSignOut = () => {
    signOutFounder();
    setToast({ type: 'success', message: 'Founder access signed out.' });
    // navigate back to first page (root) after logout
    navigate('/', { replace: true });
  };

  // If the route is /founder-dashboard render the management page alone
  if (location.pathname === '/founder-dashboard') {
    return (
      <div className="min-h-screen bg-dashboard-radial text-slate-100">
        <FounderDashboard />
      </div>
    );
  }

  // Founder-only add donor page
  if (location.pathname === '/donors/add') {
    return <AddDonor />;
  }

  // Public donor registration page (no founder login required)
  if (location.pathname === '/donate') {
    return <DonorPublic />;
  }

  return (
    <div className="min-h-screen bg-dashboard-radial text-slate-100">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1800px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="glass-panel sticky top-4 rounded-[2rem] p-5">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blood-700 to-rose-400 shadow-glow">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-slate-300">Premium BBMS</div>
                <div className="text-lg font-semibold text-white">Netlify Ready</div>
              </div>
            </div>

            <nav className="space-y-3">
              {navItems.map(({ id, label, icon: Icon }) => {
                const active = activeView === id;
                return (
                  <button
                    key={id}
                    onClick={() => goToSection(id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                      active
                        ? 'bg-gradient-to-r from-blood-700/80 to-rose-500/60 text-white shadow-glow'
                        : 'bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-3 font-medium">
                      <Icon className="h-4 w-4" />
                      {label}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Mode</span>
                <button className="soft-chip" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </button>
              </div>
              <button className="premium-button-secondary w-full" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {themeToggleLabel}
              </button>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-blood-700/35 to-slate-950/30 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <HeartPulse className="h-4 w-4 text-blood-300" />
                Inventory health
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                  <span>Total liters</span>
                  <span className="font-semibold text-white">{formatLiters(totalLitersAvailable)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                  <span>Active donors</span>
                  <span className="font-semibold text-white">{activeDonorCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                  <span>Lives saved</span>
                  <span className="font-semibold text-white">{livesSaved}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 pb-10">
          <header className="glass-panel sticky top-4 z-20 mb-6 rounded-[2rem] px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button className="premium-button-secondary lg:hidden" onClick={() => setMobileNavOpen((value) => !value)}>
                  {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
                <div>
                  <div className="text-xs uppercase tracking-[0.4em] text-blood-200">Blood Bank Management System</div>
                  <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">Premium command center</h1>
                </div>
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <span className="soft-chip">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  {activeFounder ? `Founder access: ${activeFounder.role}` : 'Founder sign-in required'}
                </span>
                <button className="premium-button-secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button className="premium-button-secondary" onClick={() => navigate('/donate')}>
                  Donate
                </button>
                {activeFounder ? (
                  <button className="premium-button-secondary" onClick={() => navigate('/donors/add')}>
                    Add Donor
                  </button>
                ) : null}
                <button className="premium-button-secondary" onClick={handleFounderSignOut}>
                  Logout
                </button>
              </div>
            </div>

            <AnimatePresence>
              {mobileNavOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 grid gap-3 lg:hidden"
                >
                  {navItems.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => goToSection(id)}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left ${
                        activeView === id ? 'bg-gradient-to-r from-blood-700 to-rose-500 text-white' : 'bg-white/5 text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </header>

          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CounterMetric label="Total Liters Available" value={totalLitersAvailable} suffix=" L" icon={Droplets} />
            <CounterMetric label="Active Donors" value={activeDonors} icon={Users} />
            <CounterMetric label="Urgent Requests Pending" value={urgentRequestsPending} icon={BadgeAlert} />
            <CounterMetric label="Lives Saved" value={livesSaved} icon={Activity} />
          </section>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <section className="glass-panel rounded-[2rem] p-6 lg:p-8">
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="soft-chip">
                        <BellRing className="h-4 w-4 text-rose-300" />
                        Founders & core admin dashboard
                      </span>
                      <span className="soft-chip">
                        <Sparkles className="h-4 w-4 text-blood-300" />
                        Smooth Framer Motion transitions
                      </span>
                    </div>
                    <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        {sectionCopy[safeView].title}
                    </h2>
                    <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{sectionCopy[safeView].description}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Bag size</div>
                        <div className="mt-2 text-lg font-semibold text-white">{bloodBagSizeLiters.toFixed(2)} L</div>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Compatibility rules</div>
                        <div className="mt-2 text-lg font-semibold text-white">Universal matcher</div>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Persistence</div>
                        <div className="mt-2 text-lg font-semibold text-white">localStorage seeded</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel rounded-[1.75rem] p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-200">Live inventory snapshot</div>
                        <div className="text-xs text-slate-400">Animated blood bag ring indicators</div>
                      </div>
                      <span className="soft-chip">
                        <HeartPulse className="h-4 w-4 text-blood-300" />
                        Real time
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                      {inventoryCards.map((item, index) => {
                        const percent = stockPercent(item.liters, item.capacity);
                        return (
                          <motion.div
                            key={item.group}
                            initial={{ opacity: 0, scale: 0.92, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className="group rounded-[1.75rem] border border-white/10 bg-white/5 p-4"
                          >
                            <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
                              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                                <circle cx="50" cy="50" r="42" className="fill-none stroke-white/10" strokeWidth="10" />
                                <motion.circle
                                  cx="50"
                                  cy="50"
                                  r="42"
                                  className="fill-none stroke-[url(#blood-gradient)]"
                                  strokeLinecap="round"
                                  strokeWidth="10"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: percent / 100 }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                                <defs>
                                  <linearGradient id="blood-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#991b1b" />
                                    <stop offset="55%" stopColor="#f43f5e" />
                                    <stop offset="100%" stopColor="#fdba74" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-center text-sm font-semibold text-white shadow-inner">
                                {item.group}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Stock</div>
                              <div className="mt-1 text-lg font-semibold text-white">{formatLiters(item.liters)}</div>
                              <div className="mt-1 text-xs text-slate-400">Capacity {formatLiters(item.capacity)}</div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="glass-panel rounded-[2rem] p-6 lg:p-8">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Founders profile</div>
                      <div className="text-xs text-slate-400">Elegant reveal cards with hover motion</div>
                    </div>
                    <BadgeAlert className="h-5 w-5 text-blood-300" />
                  </div>
                  <div className="mb-6 rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-4">
                    {activeFounder ? (
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Founder access unlocked</div>
                          <div className="mt-1 text-base font-semibold text-white">{activeFounder.name}</div>
                          <div className="text-sm text-slate-300">{activeFounder.email}</div>
                        </div>
                        <button className="premium-button-secondary" onClick={handleFounderSignOut}>
                          Sign out
                        </button>
                      </div>
                    ) : (
                      <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={handleFounderSignIn}>
                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Founder email</label>
                          <input
                            aria-label="Founder email"
                            type="email"
                            className="glass-input"
                            value={founderEmail}
                            onChange={(event) => setFounderEmail(event.target.value)}
                            placeholder="founder@bloodbank.local"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Password</label>
                          <input
                            aria-label="Founder password"
                            type="password"
                            className="glass-input"
                            value={founderPassword}
                            onChange={(event) => setFounderPassword(event.target.value)}
                            placeholder="Enter founder password"
                          />
                        </div>
                        <button type="submit" className="premium-button" disabled={founderSignInLoading}>
                          {founderSignInLoading ? 'Unlocking...' : 'Unlock access'}
                        </button>
                      </form>
                    )}
                    <div className="mt-3 text-xs leading-6 text-slate-400">
                      Founder sign-in unlocks donor registration, request posting, and dispatch approvals. Seeded demo accounts use the bloodbank.local emails shown on each profile card.
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {founders.map((founder) => (
                      <motion.article
                        key={founder.name}
                        whileHover={{ y: -6, scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                        className="group relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5"
                      >
                        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${founder.accent}`} />
                        <div className="flex items-start gap-4">
                          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${founder.accent} text-lg font-semibold text-white shadow-glow`}>
                            {founder.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-lg font-semibold text-white">{founder.name}</h3>
                            <p className="text-sm text-blood-200">{founder.role}</p>
                            <p className="mt-1 text-xs text-slate-400">{founder.email}</p>
                          </div>
                        </div>
                        <motion.p
                          initial={{ opacity: 0.75, y: 6 }}
                          whileHover={{ opacity: 1, y: 0 }}
                          className="mt-4 text-sm leading-6 text-slate-300"
                        >
                          {founder.description}
                        </motion.p>
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          whileHover={{ opacity: 1, y: 0 }}
                          className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400"
                        >
                          <ChevronRight className="h-4 w-4 text-blood-300" />
                          Hover to reveal leadership detail
                        </motion.div>
                      </motion.article>
                    ))}
                    <FoundersManager />
                  </div>
                </div>

                <div className="glass-panel rounded-[2rem] p-6 lg:p-8">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">Smart matcher</div>
                      <div className="text-xs text-slate-400">Compatible donors for the selected request</div>
                    </div>
                    <Users className="h-5 w-5 text-blood-300" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                      <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Select request</label>
                      <select
                        aria-label="Select blood request"
                        value={selectedRequest?.id ?? ''}
                        onChange={(event) => setSelectedRequestId(event.target.value)}
                        className="glass-input"
                      >
                        {requests.length === 0 ? <option value="">No requests available</option> : null}
                        {requests.map((request) => (
                          <option key={request.id} value={request.id}>
                            {request.institution} · {request.bloodGroup} · {request.priority}
                          </option>
                        ))}
                      </select>
                      {selectedRequest ? (
                        <div className="mt-4 space-y-2 text-sm text-slate-300">
                          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                            <span>Required blood type</span>
                            <strong className="text-white">{selectedRequest.bloodGroup}</strong>
                          </div>
                          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                            <span>Units</span>
                            <strong className="text-white">{selectedRequest.units}</strong>
                          </div>
                          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                            <span>Liters needed</span>
                            <strong className="text-white">{requestUnitsToLiters(selectedRequest.units).toFixed(2)} L</strong>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Compatibility</span>
                        <ShieldCheck className="h-4 w-4 text-emerald-300" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                        {selectedRequest ? compatibilityMap[selectedRequest.bloodGroup].map((group) => (
                          <span key={group} className="soft-chip">
                            {group}
                          </span>
                        )) : <span className="soft-chip">Pick a request to see compatibility</span>}
                      </div>
                      <div className="mt-4 space-y-3">
                        {compatibleDonors.slice(0, 4).map((donor) => (
                          <div key={donor.id} className="flex items-center justify-between rounded-2xl bg-slate-950/40 px-3 py-3 text-sm text-slate-200">
                            <div>
                              <div className="font-medium text-white">{donor.name}</div>
                              <div className="text-xs text-slate-400">{donor.bloodGroup} · {donor.contact}</div>
                            </div>
                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                          </div>
                        ))}
                        {selectedRequest && compatibleDonors.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-slate-300">
                            No eligible donors found. Compatibility is limited by blood type and 90-day donation windows.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {activeView === 'overview' ? (
                <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="glass-panel rounded-[2rem] p-6 lg:p-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-200">Live request hub</div>
                        <div className="text-xs text-slate-400">Track and dispatch the most urgent cases</div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-blood-300" />
                    </div>
                    <div className="space-y-4">
                      {liveRequestSuggestions.map((request) => (
                        <div key={request.id} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-lg font-semibold text-white">{request.institution}</div>
                              <div className="text-sm text-slate-300">{request.requesterName} · {request.location}</div>
                            </div>
                            <span className="soft-chip">{request.priority}</span>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                            <div className="rounded-2xl bg-slate-950/40 px-3 py-2">Type: <strong className="text-white">{request.bloodGroup}</strong></div>
                            <div className="rounded-2xl bg-slate-950/40 px-3 py-2">Units: <strong className="text-white">{request.units}</strong></div>
                            <div className="rounded-2xl bg-slate-950/40 px-3 py-2">Status: <strong className="text-white">{request.status}</strong></div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button className="premium-button" onClick={() => handleApprove(request.id)}>
                              Approve & Dispatch
                            </button>
                            <button className="premium-button-secondary" onClick={() => setSelectedRequestId(request.id)}>
                              Open matcher
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glass-panel rounded-[2rem] p-6 lg:p-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-200">Active blood inventory</div>
                        <div className="text-xs text-slate-400">Depletion and refill states update instantly</div>
                      </div>
                      <BarChart3 className="h-5 w-5 text-blood-300" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {inventoryCards.map((item) => {
                        const percent = stockPercent(item.liters, item.capacity);
                        return (
                          <div key={item.group} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-lg font-semibold text-white">{item.group}</div>
                                <div className="text-xs text-slate-400">{formatLiters(item.liters)} / {formatLiters(item.capacity)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-semibold text-white">{percent.toFixed(0)}%</div>
                                <div className="text-xs text-slate-400">filled</div>
                              </div>
                            </div>
                            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-900/70">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-blood-700 via-rose-500 to-orange-300"
                              />
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                              <span>Auto managed</span>
                              <span>{item.updatedAt ? 'Live synced' : 'Seeded'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ) : null}

              {activeView === 'donors' ? (
                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <form className="glass-panel rounded-[2rem] p-6 lg:p-8" onSubmit={handleDonorSubmit}>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-200">Register a new donor</div>
                        <div className="text-xs text-slate-400">Step {donorStep + 1} of 3</div>
                      </div>
                      <UserPlus2 className="h-5 w-5 text-blood-300" />
                    </div>

                    <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-6 text-slate-300">
                      {activeFounder ? (
                        'You are signed in as a founder — registrations submitted here are founder-led.'
                      ) : (
                        'Public registration enabled — anyone can register as a donor. Founder sign-in is optional.'
                      )}
                    </div>

                    <div className="mb-6 flex gap-2">
                      {stepTitles.map((title, index) => (
                        <button
                          key={title}
                          onClick={() => setDonorStep(index)}
                          className={`flex-1 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                            donorStep === index ? 'bg-gradient-to-r from-blood-700 to-rose-500 text-white' : 'bg-white/5 text-slate-300'
                          }`}
                        >
                          {title}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={donorStep}
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -18 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-4"
                      >
                        {donorStep === 0 ? (
                          <>
                            <div>
                              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Name</label>
                              <input aria-label="Donor name" className="glass-input" value={donorForm.name} onChange={(event) => setDonorForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" />
                              {donorErrors.name ? <p className="mt-2 text-xs text-rose-300">{donorErrors.name}</p> : null}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Age</label>
                                <input aria-label="Donor age" type="number" min="18" max="65" className="glass-input" value={donorForm.age} onChange={(event) => setDonorForm((current) => ({ ...current, age: event.target.value }))} placeholder="18-65" />
                                {donorErrors.age ? <p className="mt-2 text-xs text-rose-300">{donorErrors.age}</p> : null}
                              </div>
                              <div>
                                <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Blood group</label>
                                <select aria-label="Donor blood group" className="glass-input" value={donorForm.bloodGroup} onChange={(event) => setDonorForm((current) => ({ ...current, bloodGroup: event.target.value as BloodGroup }))}>
                                  {bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Weight (kg)</label>
                              <input aria-label="Donor weight" type="number" min="50" className="glass-input" value={donorForm.weight} onChange={(event) => setDonorForm((current) => ({ ...current, weight: event.target.value }))} placeholder="Minimum 50 kg" />
                              {donorErrors.weight ? <p className="mt-2 text-xs text-rose-300">{donorErrors.weight}</p> : null}
                            </div>
                          </>
                        ) : null}

                        {donorStep === 1 ? (
                          <>
                            <div>
                              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Last donation date</label>
                              <input aria-label="Last donation date" type="date" className="glass-input" value={donorForm.lastDonationDate} onChange={(event) => setDonorForm((current) => ({ ...current, lastDonationDate: event.target.value }))} />
                              {donorErrors.lastDonationDate ? <p className="mt-2 text-xs text-rose-300">{donorErrors.lastDonationDate}</p> : null}
                            </div>
                            <div>
                              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Contact</label>
                              <input aria-label="Donor contact" className="glass-input" value={donorForm.contact} onChange={(event) => setDonorForm((current) => ({ ...current, contact: event.target.value }))} placeholder="Phone or WhatsApp number" />
                              {donorErrors.contact ? <p className="mt-2 text-xs text-rose-300">{donorErrors.contact}</p> : null}
                            </div>
                            <div>
                              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Address</label>
                              <input aria-label="Donor address" className="glass-input" value={donorForm.address} onChange={(event) => setDonorForm((current) => ({ ...current, address: event.target.value }))} placeholder="City, ward, or full address" />
                              {donorErrors.address ? <p className="mt-2 text-xs text-rose-300">{donorErrors.address}</p> : null}
                            </div>
                            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                              Eligibility window enforces a 90-day donation cooldown before the donor can be re-used.
                            </div>
                          </>
                        ) : null}

                        {donorStep === 2 ? (
                          <div className="space-y-3">
                            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                              <div className="mb-4 flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-white">Medical eligibility checklist</div>
                                  <div className="text-xs text-slate-400">Select at least 3 to approve registration</div>
                                </div>
                                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                              </div>
                              <div className="grid gap-3">
                                {donorChecklist.map((item) => {
                                  const checked = donorForm.medicalEligibility.includes(item);
                                  return (
                                    <label key={item} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3 transition hover:bg-white/5">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => setChecklist(item)}
                                        className="mt-1 h-4 w-4 rounded border-slate-400 bg-transparent text-blood-500 focus:ring-blood-500"
                                      />
                                      <span className="text-sm text-slate-200">{item}</span>
                                    </label>
                                  );
                                })}
                              </div>
                              {donorErrors.medicalEligibility ? <p className="mt-3 text-xs text-rose-300">{donorErrors.medicalEligibility}</p> : null}
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blood-700/25 to-slate-950/30 p-4 text-sm text-slate-200">
                              <div className="flex items-center justify-between">
                                <span>Donation preview</span>
                                <span className="soft-chip">+{bloodBagSizeLiters.toFixed(2)} L</span>
                              </div>
                              <div className="mt-3 text-xs leading-6 text-slate-300">
                                A successful submission will create a donor profile, animate a success burst, and immediately add stock to the donor blood group.
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </motion.div>
                    </AnimatePresence>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="premium-button-secondary"
                        onClick={() => setDonorStep((value) => Math.max(0, value - 1))}
                        disabled={donorStep === 0}
                      >
                        Back
                      </button>
                      {donorStep < 2 ? (
                        <button
                          type="button"
                          className="premium-button"
                          disabled={!canAdvanceDonorStep}
                          onClick={advanceDonorStep}
                        >
                          Next
                        </button>
                      ) : (
                        <button type="submit" className="premium-button">
                          Register donor
                        </button>
                      )}
                      <button
                        type="button"
                        className="soft-chip"
                        onClick={async () => {
                          const fn = (window as any).__autoSubmitDonor;
                          if (typeof fn !== 'function') {
                            setToast({ type: 'error', message: 'Dev helper not available' });
                            return;
                          }
                          const res = await fn();
                          setToast({ type: res?.ok ? 'success' : 'error', message: res?.message ?? (res?.ok ? 'Auto-submitted' : 'Auto-submit failed') });
                        }}
                      >
                        Auto-fill & submit (dev)
                      </button>
                    </div>
                  </form>

                  <form className="glass-panel rounded-[2rem] p-6 lg:p-8" onSubmit={handleRequestSubmit}>
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-200">Active donors</div>
                        <div className="text-xs text-slate-400">Search, filter, and review donor readiness</div>
                      </div>
                      <Filter className="h-5 w-5 text-blood-300" />
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1.25fr_0.75fr]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          className="glass-input pl-11"
                          value={donorSearch}
                          onChange={(event) => setDonorSearch(event.target.value)}
                          placeholder="Search by name, contact, or blood group"
                        />
                      </div>
                      <select aria-label="Filter donors by blood group" className="glass-input" value={donorGroupFilter} onChange={(event) => setDonorGroupFilter(event.target.value as BloodGroup | 'All')}>
                        <option value="All">All blood groups</option>
                        {bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                      </select>
                    </div>

                    <div className="mt-5 hidden overflow-hidden rounded-[1.75rem] border border-white/10 lg:block">
                      <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                        <thead className="bg-white/5 text-xs uppercase tracking-[0.25em] text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Donor</th>
                            <th className="px-4 py-3">Blood</th>
                            <th className="px-4 py-3">Address</th>
                            <th className="px-4 py-3">Last donation</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {filteredDonors.map((donor) => (
                            <tr key={donor.id} className="bg-white/5 transition hover:bg-white/10">
                              <td className="px-4 py-4">
                                <div className="font-medium text-white">{donor.name}</div>
                                <div className="text-xs text-slate-400">{donor.contact}</div>
                              </td>
                              <td className="px-4 py-4 text-slate-200">{donor.bloodGroup}</td>
                              <td className="px-4 py-4 text-slate-200">{donor.address ?? '-'}</td>
                              <td className="px-4 py-4 text-slate-200">{donor.lastDonationDate}</td>
                              <td className="px-4 py-4">
                                <span className="soft-chip">
                                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                                  {donorsMatchRequest(donor, donor.bloodGroup) ? 'Eligible' : 'Review'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filteredDonors.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-10 text-center text-slate-300">
                                No donors match the current search.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-5 grid gap-3 lg:hidden">
                      {filteredDonors.map((donor) => (
                        <div key={donor.id} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-white">{donor.name}</div>
                              <div className="text-xs text-slate-400">{donor.contact}</div>
                            </div>
                            <span className="soft-chip">{donor.bloodGroup}</span>
                          </div>
                            <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                            <div>Age: {donor.age}</div>
                            <div>Weight: {donor.weight} kg</div>
                            <div>Last donation: {donor.lastDonationDate}</div>
                            <div className="sm:col-span-2">Address: {donor.address ?? '-'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </form>
                </section>
              ) : null}

              {activeView === 'requests' ? (
                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <form className="glass-panel rounded-[2rem] p-6 lg:p-8" onSubmit={handleRequestSubmit}>
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-200">Live blood request portal</div>
                        <div className="text-xs text-slate-400">Hospitals or individuals can post urgent needs here</div>
                      </div>
                      <BellRing className="h-5 w-5 text-blood-300" />
                    </div>

                    <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-6 text-slate-300">
                      Founder sign-in is required before request posting can be submitted.
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Requester name</label>
                          <input aria-label="Requester name" className="glass-input" value={requestForm.requesterName} onChange={(event) => setRequestForm((current) => ({ ...current, requesterName: event.target.value }))} placeholder="Dr. name / coordinator" />
                        {requestErrors.requesterName ? <p className="mt-2 text-xs text-rose-300">{requestErrors.requesterName}</p> : null}
                      </div>
                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Institution</label>
                        <input aria-label="Institution" className="glass-input" value={requestForm.institution} onChange={(event) => setRequestForm((current) => ({ ...current, institution: event.target.value }))} placeholder="Hospital or clinic" />
                        {requestErrors.institution ? <p className="mt-2 text-xs text-rose-300">{requestErrors.institution}</p> : null}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Blood group</label>
                          <select aria-label="Request blood group" className="glass-input" value={requestForm.bloodGroup} onChange={(event) => setRequestForm((current) => ({ ...current, bloodGroup: event.target.value as BloodGroup }))}>
                            {bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Units</label>
                          <input aria-label="Request units" type="number" min="1" max="10" className="glass-input" value={requestForm.units} onChange={(event) => setRequestForm((current) => ({ ...current, units: event.target.value }))} />
                          {requestErrors.units ? <p className="mt-2 text-xs text-rose-300">{requestErrors.units}</p> : null}
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Priority</label>
                          <select aria-label="Request priority" className="glass-input" value={requestForm.priority} onChange={(event) => setRequestForm((current) => ({ ...current, priority: event.target.value as RequestFormState['priority'] }))}>
                            {['Critical', 'Urgent', 'Standard'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Location</label>
                          <input className="glass-input" value={requestForm.location} onChange={(event) => setRequestForm((current) => ({ ...current, location: event.target.value }))} placeholder="City / ward" />
                          {requestErrors.location ? <p className="mt-2 text-xs text-rose-300">{requestErrors.location}</p> : null}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Contact</label>
                        <input className="glass-input" value={requestForm.contact} onChange={(event) => setRequestForm((current) => ({ ...current, contact: event.target.value }))} placeholder="Phone number" />
                        {requestErrors.contact ? <p className="mt-2 text-xs text-rose-300">{requestErrors.contact}</p> : null}
                      </div>
                      <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Clinical note</label>
                        <textarea className="glass-input min-h-28 resize-none" value={requestForm.note} onChange={(event) => setRequestForm((current) => ({ ...current, note: event.target.value }))} placeholder="Add urgency, case notes, and timing requirements" />
                        {requestErrors.note ? <p className="mt-2 text-xs text-rose-300">{requestErrors.note}</p> : null}
                      </div>
                      <button type="submit" className={`premium-button w-full ${!activeFounder ? 'cursor-not-allowed opacity-60' : ''}`} disabled={!activeFounder}>
                        Post blood request
                      </button>
                    </div>
                  </form>

                  <div className="glass-panel rounded-[2rem] p-6 lg:p-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-200">Active requests & dispatch</div>
                        <div className="text-xs text-slate-400">Approve and dispatch without breaking inventory limits</div>
                      </div>
                      <ClipboardList className="h-5 w-5 text-blood-300" />
                    </div>

                    <div className="space-y-4">
                      {requests.map((request) => {
                        const matchedCount = getCompatibleDonors(request.bloodGroup).length;
                        const requiredLiters = requestUnitsToLiters(request.units);
                        const canDispatch = inventory[request.bloodGroup].liters >= requiredLiters && request.status === 'pending';

                        return (
                          <motion.article
                            key={request.id}
                            layout
                            className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-lg font-semibold text-white">{request.institution}</div>
                                <div className="text-sm text-slate-300">{request.requesterName} · {request.location}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="soft-chip">{request.priority}</span>
                                <span className="soft-chip">{request.bloodGroup}</span>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                              <div className="rounded-2xl bg-slate-950/40 px-3 py-2">Units: <strong className="text-white">{request.units}</strong></div>
                              <div className="rounded-2xl bg-slate-950/40 px-3 py-2">Needed: <strong className="text-white">{requiredLiters.toFixed(2)} L</strong></div>
                              <div className="rounded-2xl bg-slate-950/40 px-3 py-2">Matches: <strong className="text-white">{matchedCount}</strong></div>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-300">{request.note}</p>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button className={`premium-button ${!activeFounder ? 'cursor-not-allowed opacity-60' : ''}`} onClick={() => handleApprove(request.id)} disabled={!activeFounder || !canDispatch}>
                                Approve & Dispatch
                              </button>
                              <button className="premium-button-secondary" onClick={() => setSelectedRequestId(request.id)}>
                                Smart matcher
                              </button>
                            </div>
                          </motion.article>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-3xl border px-4 py-3 shadow-glass backdrop-blur-xl ${
              toast.type === 'success' ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-50' : 'border-rose-400/30 bg-rose-500/15 text-rose-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <div className="text-sm font-semibold">{toast.type === 'success' ? 'Success' : 'Validation issue'}</div>
                <div className="text-sm opacity-90">{toast.message}</div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {confettiKey > 0 ? (
          <motion.div
            key={confettiKey}
            className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 24 }).map((_, index) => (
              <motion.span
                key={`${confettiKey}-${index}`}
                className="absolute h-2 w-2 rounded-full bg-gradient-to-r from-blood-300 to-rose-200"
                style={{ left: `${Math.random() * 100}%`, top: '-10px' }}
                initial={{ y: -20, opacity: 0, scale: 0.5 }}
                animate={{ y: [0, 180, 420], opacity: [0, 1, 0], rotate: [0, 180, 360], scale: [0.7, 1, 0.8] }}
                transition={{ duration: 1.4, ease: 'easeOut', delay: index * 0.02 }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default App;
