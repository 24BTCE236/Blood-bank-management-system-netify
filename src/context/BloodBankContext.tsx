import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createSeedState } from '../data/seed';
import {
  bloodBagSizeLiters,
  BloodBankState,
  BloodGroup,
  BloodRequest,
  Donor,
  clampLiters,
  compatibilityMap,
  donorsMatchRequest,
  requestUnitsToLiters,
} from '../lib/blood';
import { hashFounderPassword } from '../lib/founderAuth';
import { normalizeEmail, verifyFounderPassword } from '../lib/founderAuth';

const STORAGE_KEY = 'bbms-state-v1';

type BloodBankContextValue = BloodBankState & {
  setActiveView: (view: BloodBankState['activeView']) => void;
  setTheme: (theme: BloodBankState['theme']) => void;
  signInFounder: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  signOutFounder: () => void;
  registerDonor: (donor: Omit<Donor, 'id' | 'createdAt' | 'active'>) => { ok: boolean; message: string };
  publicRegisterDonor: (donor: Omit<Donor, 'id' | 'createdAt' | 'active'>) => { ok: boolean; message: string };
  createRequest: (request: Omit<BloodRequest, 'id' | 'createdAt' | 'status' | 'matchedDonorIds'>) => { ok: boolean; message: string };
  approveRequest: (requestId: string) => { ok: boolean; message: string };
  getCompatibleDonors: (requestGroup: BloodGroup) => Donor[];
  addInventory: (group: BloodGroup, units: number) => { ok: boolean; message: string };
  updateDonor: (id: string, updates: Partial<Donor>) => { ok: boolean; message: string };
  addFounder: (options: { name: string; email: string; role?: string; description?: string; password: string }) => Promise<{ ok: boolean; message: string }>;
  updateFounder: (id: string, updates: { name?: string; email?: string; role?: string; description?: string; password?: string }) => Promise<{ ok: boolean; message: string }>;
  removeFounder: (id: string) => { ok: boolean; message: string };
};

const BloodBankContext = createContext<BloodBankContextValue | null>(null);

const buildSeedState = () => createSeedState();

const mergeSeedFounders = (founders: BloodBankState['founders'], seedFounders: BloodBankState['founders']) =>
  founders.map((founder) => {
    const seedFounder = seedFounders.find(
      (entry) => entry.id === founder.id || entry.email === founder.email || entry.name === founder.name,
    );

    return seedFounder ? { ...seedFounder, ...founder } : founder;
  });

const safeRead = (): BloodBankState => {
  if (typeof window === 'undefined') {
    return buildSeedState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeedState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }

    const parsed = JSON.parse(raw) as BloodBankState;
    if (!parsed?.inventory || !parsed?.donors || !parsed?.requests) {
      throw new Error('Invalid state');
    }

    const seed = buildSeedState();
    const founders = Array.isArray(parsed.founders) ? mergeSeedFounders(parsed.founders, seed.founders) : seed.founders;
    const currentFounderExists = founders.some((founder) => founder.id === parsed.currentFounderId);

    return {
      ...seed,
      ...parsed,
      founders,
      currentFounderId: currentFounderExists ? parsed.currentFounderId ?? null : null,
    };
  } catch {
    const seed = buildSeedState();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    } catch {
      // ignore storage failures
    }
    return seed;
  }
};

export const BloodBankProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<BloodBankState>(safeRead);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage failures
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  const setActiveView = (view: BloodBankState['activeView']) => {
    setState((current) => ({ ...current, activeView: view }));
  };

  const setTheme = (theme: BloodBankState['theme']) => {
    setState((current) => ({ ...current, theme }));
  };

  const signInFounder: BloodBankContextValue['signInFounder'] = async (email, password) => {
    const normalizedEmail = normalizeEmail(email);
    let founder = state.founders.find((entry) => normalizeEmail(entry.email) === normalizedEmail);

    // Debugging: expose attempt details for runtime inspection
    try {
      // eslint-disable-next-line no-console
      console.debug('[signInFounder] attempt', { normalizedEmail, found: !!founder });
      // @ts-ignore - attach for debug only
      window.__lastSignInAttempt = { normalizedEmail, found: !!founder, timestamp: new Date().toISOString() };
    } catch {}
    // Fallback: try matching by local-part (before @) in case the user omits domain or uses minor variants
    if (!founder) {
      const local = normalizedEmail.split('@')[0];
      founder = state.founders.find((entry) => normalizeEmail(entry.email).split('@')[0] === local);
    }

    if (!founder) {
      return { ok: false, message: 'Founder account not found.' };
    }

    try {
      const matches = await verifyFounderPassword(password, founder.passwordSalt, founder.passwordHash);
      try {
        // eslint-disable-next-line no-console
        console.debug('[signInFounder] password match', { matches });
        // @ts-ignore
        window.__lastSignInAttempt.matches = matches;
      } catch {}
      if (!matches) {
        return { ok: false, message: 'Email or password is incorrect.' };
      }
    } catch {
      return { ok: false, message: 'Founder authentication is unavailable right now.' };
    }

    setState((current) => ({ ...current, currentFounderId: founder.id }));
    return { ok: true, message: `Welcome back, ${founder.name}. Full operational access unlocked.` };
  };

  const signOutFounder = () => {
    setState((current) => ({ ...current, currentFounderId: null }));
  };

  const canLeadOperations = state.founders.some((founder) => founder.id === state.currentFounderId);

  const addFounder: BloodBankContextValue['addFounder'] = async ({ name, email, role = 'Founder', description = '', password }) => {
    const normalized = normalizeEmail(email);
    if (state.founders.some((f) => normalizeEmail(f.email) === normalized)) {
      return { ok: false, message: 'A founder with this email already exists.' };
    }

    const id = `founder-${crypto.randomUUID()}`;
    const salt = `${id}-salt`;
    try {
      const passwordHash = await hashFounderPassword(password, salt);
      const initials = name
        .split(' ')
        .map((p) => p[0] ?? '')
        .slice(0, 2)
        .join('')
        .toUpperCase();
      const accent = 'from-blood-500 to-rose-400';

      const newFounder = {
        id,
        name,
        email: normalized,
        role,
        initials,
        accent,
        description,
        passwordSalt: salt,
        passwordHash,
      } as any;

      setState((current) => ({ ...current, founders: [newFounder, ...current.founders] }));
      return { ok: true, message: 'Founder added.' };
    } catch (e) {
      return { ok: false, message: 'Failed to create founder.' };
    }
  };

  const updateFounder: BloodBankContextValue['updateFounder'] = async (id, updates) => {
    const target = state.founders.find((f) => f.id === id);
    if (!target) return { ok: false, message: 'Founder not found.' };

    try {
      let passwordSalt = target.passwordSalt;
      let passwordHash = target.passwordHash;
      if (updates.password) {
        passwordSalt = `${id}-salt-${Date.now()}`;
        passwordHash = await hashFounderPassword(updates.password, passwordSalt);
      }

      setState((current) => ({
        ...current,
        founders: current.founders.map((f) => (f.id === id ? { ...f, ...updates, email: updates.email ? normalizeEmail(updates.email) : f.email, passwordSalt, passwordHash } : f)),
      }));

      return { ok: true, message: 'Founder updated.' };
    } catch (e) {
      return { ok: false, message: 'Failed to update founder.' };
    }
  };

  const removeFounder: BloodBankContextValue['removeFounder'] = (id) => {
    if (!state.founders.some((f) => f.id === id)) return { ok: false, message: 'Founder not found.' };
    if (state.founders.length <= 1) return { ok: false, message: 'Cannot remove the last founder.' };
    setState((current) => ({ ...current, founders: current.founders.filter((f) => f.id !== id), currentFounderId: current.currentFounderId === id ? null : current.currentFounderId }));
    return { ok: true, message: 'Founder removed.' };
  };

  const registerDonor: BloodBankContextValue['registerDonor'] = (donor) => {
    if (!canLeadOperations) {
      return { ok: false, message: 'Founder sign-in required to lead operations.' };
    }

    const ageValid = donor.age >= 18 && donor.age <= 65;
    const weightValid = donor.weight >= 50;
    const contactValid = donor.contact.trim().length >= 8;
    const lastDonationValid = !Number.isNaN(Date.parse(donor.lastDonationDate));
    const bloodGroup = donor.bloodGroup;
    const medicalClearance = donor.medicalEligibility.length > 0;

    if (!ageValid || !weightValid || !contactValid || !lastDonationValid || !medicalClearance) {
      return { ok: false, message: 'Please complete all donor validations before submission.' };
    }

    const id = `donor-${crypto.randomUUID()}`;
    setState((current) => {
      const inventory = { ...current.inventory };
      inventory[bloodGroup] = {
        ...inventory[bloodGroup],
        liters: clampLiters(inventory[bloodGroup].liters + bloodBagSizeLiters, inventory[bloodGroup].capacity),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...current,
        donors: [
          {
            ...donor,
            id,
            active: true,
            createdAt: new Date().toISOString(),
          },
          ...current.donors,
        ],
        inventory,
      };
    });

    return { ok: true, message: 'Donor registered and inventory updated.' };
  };

  const publicRegisterDonor: BloodBankContextValue['publicRegisterDonor'] = (donor) => {
    // Allow public donor registration without founder sign-in
    const ageValid = donor.age >= 18 && donor.age <= 65;
    const weightValid = donor.weight >= 50;
    const contactValid = donor.contact.trim().length >= 8;
    const lastDonationValid = !Number.isNaN(Date.parse(donor.lastDonationDate));
    const medicalClearance = donor.medicalEligibility.length > 0;

    if (!ageValid || !weightValid || !contactValid || !lastDonationValid || !medicalClearance) {
      return { ok: false, message: 'Please complete all donor validations before submission.' };
    }

    const id = `donor-${crypto.randomUUID()}`;
    setState((current) => {
      const inventory = { ...current.inventory };
      inventory[donor.bloodGroup] = {
        ...inventory[donor.bloodGroup],
        liters: clampLiters(inventory[donor.bloodGroup].liters + bloodBagSizeLiters, inventory[donor.bloodGroup].capacity),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...current,
        donors: [
          {
            ...donor,
            id,
            active: true,
            createdAt: new Date().toISOString(),
          },
          ...current.donors,
        ],
        inventory,
      };
    });

    return { ok: true, message: 'Thank you — donor registered and inventory updated.' };
  };

  const createRequest: BloodBankContextValue['createRequest'] = (request) => {
    if (!canLeadOperations) {
      return { ok: false, message: 'Founder sign-in required to lead operations.' };
    }

    if (!request.requesterName.trim() || !request.institution.trim() || !request.location.trim() || !request.contact.trim()) {
      return { ok: false, message: 'All request contact fields are required.' };
    }

    if (request.units < 1 || request.units > 10) {
      return { ok: false, message: 'Request units must be between 1 and 10.' };
    }

    setState((current) => ({
      ...current,
      requests: [
        {
          ...request,
          id: `req-${crypto.randomUUID()}`,
          createdAt: new Date().toISOString(),
          status: 'pending',
          matchedDonorIds: [],
        },
        ...current.requests,
      ],
    }));

    return { ok: true, message: 'Request posted to the live hub.' };
  };

  const approveRequest = (requestId: string) => {
    if (!canLeadOperations) {
      return { ok: false, message: 'Founder sign-in required to lead operations.' };
    }

    const request = state.requests.find((entry) => entry.id === requestId);
    if (!request) {
      return { ok: false, message: 'Request not found.' };
    }

    const litersRequired = requestUnitsToLiters(request.units);
    const currentInventory = state.inventory[request.bloodGroup];
    if (currentInventory.liters < litersRequired) {
      return { ok: false, message: 'Insufficient inventory to dispatch this request.' };
    }

    setState((current) => {
      const inventory = { ...current.inventory };
      inventory[request.bloodGroup] = {
        ...inventory[request.bloodGroup],
        liters: clampLiters(inventory[request.bloodGroup].liters - litersRequired, inventory[request.bloodGroup].capacity),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...current,
        inventory,
        livesSaved: current.livesSaved + request.units,
        requests: current.requests.map((entry) =>
          entry.id === requestId
            ? {
                ...entry,
                status: 'dispatched',
                matchedDonorIds: getCompatibleDonors(entry.bloodGroup).slice(0, request.units).map((donor) => donor.id),
              }
            : entry,
        ),
      };
    });

    return { ok: true, message: 'Inventory dispatched and request completed.' };
  };

  const addInventory: BloodBankContextValue['addInventory'] = (group, units) => {
    if (!canLeadOperations) {
      return { ok: false, message: 'Founder sign-in required to lead operations.' };
    }

    if (!state.inventory[group]) {
      return { ok: false, message: 'Invalid blood group.' };
    }

    const u = Number(units) || 0;
    if (!Number.isFinite(u) || u <= 0 || u > 100) {
      return { ok: false, message: 'Units must be a positive number (max 100).' };
    }

    const litersToAdd = u * bloodBagSizeLiters;

    setState((current) => {
      const inventory = { ...current.inventory };
      inventory[group] = {
        ...inventory[group],
        liters: clampLiters(inventory[group].liters + litersToAdd, inventory[group].capacity),
        updatedAt: new Date().toISOString(),
      };

      return { ...current, inventory };
    });

    return { ok: true, message: `Added ${units} unit(s) (${litersToAdd.toFixed(2)} L) to ${group}.` };
  };

  const updateDonor: BloodBankContextValue['updateDonor'] = (id, updates) => {
    if (!state.donors.some((d) => d.id === id)) return { ok: false, message: 'Donor not found.' };
    setState((current) => ({ ...current, donors: current.donors.map((d) => (d.id === id ? { ...d, ...updates } : d)) }));
    return { ok: true, message: 'Donor updated.' };
  };

  const getCompatibleDonors = (requestGroup: BloodGroup) =>
    state.donors.filter((donor) => {
      const donatedRecently = Date.parse(donor.lastDonationDate);
      const ageOfDonation = Number.isNaN(donatedRecently)
        ? Number.POSITIVE_INFINITY
        : (Date.now() - donatedRecently) / (1000 * 60 * 60 * 24);
      return donorsMatchRequest(donor, requestGroup) && donor.active && ageOfDonation >= 90;
    });

  const value = useMemo<BloodBankContextValue>(
    () => ({
      ...state,
      setActiveView,
      setTheme,
      signInFounder,
      signOutFounder,
      registerDonor,
      publicRegisterDonor,
      createRequest,
      approveRequest,
      addInventory,
        updateDonor,
      getCompatibleDonors,
      addFounder,
      updateFounder,
      removeFounder,
    }),
    [state],
  );

  return <BloodBankContext.Provider value={value}>{children}</BloodBankContext.Provider>;
};

export const useBloodBank = () => {
  const context = useContext(BloodBankContext);
  if (!context) {
    throw new Error('useBloodBank must be used inside BloodBankProvider');
  }

  return context;
};

export { compatibilityMap };
