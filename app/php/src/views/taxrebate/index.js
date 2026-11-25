/* === CONFIG & TAX ENGINE UTILITIES (DRY) === */
const CONFIG = Object.freeze({
  locale: 'en-GB',
  currency: 'GBP',
  vatRate: 0.20,
  managedFeeRate: 0.25,
  wfhWeeklyAllowance: 6,
  wfhAnnualAllowance: 312,
  mileageFirstTierRate: 0.45,
  mileageSecondTierRate: 0.25,
  mileageTierThreshold: 10000,
  storageKeys: Object.freeze({
    claim: 'rebatedirect.claim.v1',
    preferences: 'rebatedirect.preferences.v1',
    archive: 'rebatedirect.archive.v1'
  })
});

const gbp = new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency });
const numberFormat = new Intl.NumberFormat(CONFIG.locale, { maximumFractionDigits: 0 });
const formatMoney = value => gbp.format(Number(value) || 0);
const formatNumber = value => numberFormat.format(Number(value) || 0);
const formatMiles = value => `${formatNumber(value)} miles`;
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;
const sum = values => values.reduce((total, value) => total + value, 0);
const clamp = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);
const debounce = (fn, delay = 240) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
};
const createReference = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const isNiNumberValid = value => /^(?!BG|GB|NK|TN|ZZ)[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]$/.test(value.trim().toUpperCase());
const isEmailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
const isPostcodeValid = value => /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/.test(value.trim().toUpperCase());

/** Safe DOM factory. User values are never inserted as HTML. */
const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === false || child === null || child === undefined) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
};

const safeStorage = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true; }
    catch { return false; }
  }
};

/* === MODEL (State, Tax Calculations & Persistence) === */
const TAX_YEARS = Object.freeze(['2022/23', '2023/24', '2024/25', '2025/26']);
const TAX_BANDS = Object.freeze([
  { value: 'basic', label: 'Basic rate — 20%', rate: 0.20 },
  { value: 'higher', label: 'Higher rate — 40%', rate: 0.40 }
]);
const CATEGORIES = Object.freeze(['All reliefs', 'Professional bodies', 'Flat-rate occupations', 'WFH & mileage']);

const PROFESSIONAL_BODIES = Object.freeze([
  { id: 'rcn', name: 'Royal College of Nursing (RCN)', typicalFee: 276, eligibility: 'Nursing registration and professional practice', notes: 'Annual membership may qualify where necessary for your role.' },
  { id: 'bma', name: 'British Medical Association (BMA)', typicalFee: 492, eligibility: 'Doctors and medical professionals', notes: 'Check whether your particular membership grade is allowable.' },
  { id: 'gmc', name: 'General Medical Council (GMC)', typicalFee: 181, eligibility: 'Registered medical practitioners', notes: 'Registration fee is commonly claimed by eligible doctors.' },
  { id: 'cipd', name: 'Chartered Institute of Personnel and Development (CIPD)', typicalFee: 228, eligibility: 'HR and people professionals', notes: 'Membership must be required for the role.' },
  { id: 'iet', name: 'Institution of Engineering and Technology (IET)', typicalFee: 159, eligibility: 'Engineers and technologists', notes: 'Applies where membership supports professional duties.' },
  { id: 'acc', name: 'Association of Chartered Certified Accountants (ACCA)', typicalFee: 324, eligibility: 'Accountancy and finance professionals', notes: 'Annual subscription may qualify for eligible members.' },
  { id: 'icaew', name: 'Institute of Chartered Accountants in England and Wales (ICAEW)', typicalFee: 384, eligibility: 'Chartered accountants', notes: 'Subscription must relate to employment duties.' },
  { id: 'bcs', name: 'British Computer Society (BCS)', typicalFee: 156, eligibility: 'IT, digital and computing professionals', notes: 'Professional membership may be allowable where required.' },
  { id: 'unison', name: 'UNISON', typicalFee: 180, eligibility: 'Public-sector and related workers', notes: 'Union subscriptions can qualify where connected to employment.' },
  { id: 'unite', name: 'Unite the Union', typicalFee: 192, eligibility: 'Workers across many UK sectors', notes: 'Eligibility depends on the role and membership purpose.' },
  { id: 'rics', name: 'Royal Institution of Chartered Surveyors (RICS)', typicalFee: 408, eligibility: 'Chartered surveyors', notes: 'Professional registration may qualify where job-related.' },
  { id: 'cilex', name: 'Chartered Institute of Legal Executives (CILEX)', typicalFee: 300, eligibility: 'Legal executives and paralegals', notes: 'Membership must be necessary for professional duties.' }
]);

const FLAT_RATE_OCCUPATIONS = Object.freeze([
  { id: 'healthcare', name: 'Healthcare & nursing staff', annualAllowance: 125, eligibility: 'Uniform, laundry and specialist work clothing', notes: 'Includes nurses, healthcare assistants and allied roles.' },
  { id: 'police-fire', name: 'Uniformed police / fire & rescue', annualAllowance: 140, eligibility: 'Uniform upkeep and laundry', notes: 'Applies to eligible uniformed operational staff.' },
  { id: 'mechanic', name: 'Mechanics & motor vehicle repair', annualAllowance: 120, eligibility: 'Tools, protective clothing and laundry', notes: 'Covers eligible vehicle-repair occupations.' },
  { id: 'construction', name: 'Construction & building trades', annualAllowance: 140, eligibility: 'Tools, protective clothing and laundry', notes: 'Includes eligible construction trades and site roles.' },
  { id: 'rail', name: 'Public transport / rail staff', annualAllowance: 100, eligibility: 'Uniform and work clothing', notes: 'Applies to qualifying rail and public-transport roles.' },
  { id: 'cabin-crew', name: 'Airline cabin crew', annualAllowance: 720, eligibility: 'Uniform, grooming and laundry', notes: 'Higher allowance reflects specialist uniform and appearance costs.' },
  { id: 'engineering', name: 'Engineering & manufacturing', annualAllowance: 140, eligibility: 'Tools, protective clothing and laundry', notes: 'Applies to eligible engineering and production occupations.' },
  { id: 'retail', name: 'Retail & customer service', annualAllowance: 60, eligibility: 'Uniform and laundry', notes: 'Applies where a uniform is required and unpaid for by the employer.' }
]);

const RELIEF_CATALOG = Object.freeze([
  ...PROFESSIONAL_BODIES.map(item => ({ ...item, category: 'Professional bodies', type: 'subscription', icon: 'certificate' })),
  ...FLAT_RATE_OCCUPATIONS.map(item => ({ ...item, category: 'Flat-rate occupations', type: 'flat-rate', icon: 'briefcase' })),
  { id: 'wfh', name: 'Working from home allowance', category: 'WFH & mileage', type: 'wfh', annualAllowance: CONFIG.wfhAnnualAllowance, eligibility: 'Employer requires working from home', notes: 'Standard calculation uses £6 per eligible week; evidence such as an employment contract may be required.', icon: 'home' },
  { id: 'mileage', name: 'Business mileage allowance', category: 'WFH & mileage', type: 'mileage', annualAllowance: 0, eligibility: 'Own vehicle used for work and not fully reimbursed', notes: 'Uses 45p for the first 10,000 business miles and 25p thereafter, less employer reimbursement.', icon: 'car' }
]);

class TaxRebateModel {
  #listeners = new Set();
  #state;

  constructor() {
    const preferences = safeStorage.get(CONFIG.storageKeys.preferences, {});
    const claim = this.#loadClaim();
    this.#state = {
      route: 'home',
      taxYears: TAX_YEARS,
      taxBands: TAX_BANDS,
      categories: CATEGORIES,
      catalog: RELIEF_CATALOG,
      taxBand: preferences.taxBand || 'basic',
      selectedYears: claim.selectedYears?.length ? claim.selectedYears : ['2024/25', '2025/26'],
      searchQuery: '',
      activeCategory: 'All reliefs',
      claimItems: claim.items || [],
      claimMode: claim.claimMode || 'managed',
      claimStep: 1,
      claimant: claim.claimant || { fullName: '', postcode: '', email: '', phone: '', niNumber: '', employerReference: '' },
      declarations: claim.declarations || { paye: false, unreimbursed: false, authorised: false },
      signatureData: claim.signatureData || '',
      claimReference: null,
      archivedClaims: safeStorage.get(CONFIG.storageKeys.archive, []),
      theme: preferences.theme || 'system'
    };
    this.#applyTheme();
  }

  subscribe(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  getState() { return structuredClone(this.#state); }
  #notify(patch = {}) {
    this.#state = { ...this.#state, ...patch };
    this.#persistClaim();
    this.#listeners.forEach(listener => listener(this.getState(), patch));
  }

  #loadClaim() {
    const stored = safeStorage.get(CONFIG.storageKeys.claim, {});
    if (!stored || typeof stored !== 'object') return {};
    return {
      selectedYears: Array.isArray(stored.selectedYears) ? stored.selectedYears.filter(year => TAX_YEARS.includes(year)) : [],
      items: Array.isArray(stored.items) ? stored.items.filter(item => item && RELIEF_CATALOG.some(entry => entry.id === item.catalogId)) : [],
      claimMode: ['managed', 'self-file'].includes(stored.claimMode) ? stored.claimMode : 'managed',
      claimant: typeof stored.claimant === 'object' && stored.claimant ? stored.claimant : {},
      declarations: typeof stored.declarations === 'object' && stored.declarations ? stored.declarations : {},
      signatureData: typeof stored.signatureData === 'string' ? stored.signatureData : ''
    };
  }

  #persistClaim() {
    safeStorage.set(CONFIG.storageKeys.claim, {
      selectedYears: this.#state.selectedYears,
      items: this.#state.claimItems,
      claimMode: this.#state.claimMode,
      claimant: this.#state.claimant,
      declarations: this.#state.declarations,
      signatureData: this.#state.signatureData
    });
  }

  setRoute(route) {
    const routes = new Set(['home', 'reliefs', 'claim', 'about']);
    this.#notify({ route: routes.has(route) ? route : 'home' });
  }

  setTheme(theme) {
    const allowed = new Set(['light', 'dark', 'system']);
    const next = allowed.has(theme) ? theme : 'system';
    safeStorage.set(CONFIG.storageKeys.preferences, { ...safeStorage.get(CONFIG.storageKeys.preferences, {}), theme: next, taxBand: this.#state.taxBand });
    this.#state = { ...this.#state, theme: next };
    this.#applyTheme();
    this.#notify({ theme: next });
  }

  #applyTheme() { document.documentElement.dataset.theme = this.#state.theme; }

  setTaxBand(band) {
    if (TAX_BANDS.some(option => option.value === band)) {
      safeStorage.set(CONFIG.storageKeys.preferences, { ...safeStorage.get(CONFIG.storageKeys.preferences, {}), taxBand: band, theme: this.#state.theme });
      this.#notify({ taxBand: band });
    }
  }

  toggleTaxYear(year) {
    if (!TAX_YEARS.includes(year)) return;
    const selected = new Set(this.#state.selectedYears);
    if (selected.has(year)) selected.delete(year); else selected.add(year);
    this.#notify({ selectedYears: TAX_YEARS.filter(option => selected.has(option)) });
  }

  setSearchQuery(value) { this.#notify({ searchQuery: String(value).slice(0, 90) }); }
  setActiveCategory(category) { if (CATEGORIES.includes(category)) this.#notify({ activeCategory: category }); }
  setClaimMode(mode) { if (['managed', 'self-file'].includes(mode)) this.#notify({ claimMode: mode }); }
  setClaimStep(step) { this.#notify({ claimStep: clamp(step, 1, 3) }); }
  setClaimant(patch) { this.#notify({ claimant: { ...this.#state.claimant, ...patch } }); }
  setDeclaration(key, value) { this.#notify({ declarations: { ...this.#state.declarations, [key]: Boolean(value) } }); }
  setSignature(data) { this.#notify({ signatureData: String(data || '').slice(0, 200000) }); }

  addClaimItem(catalogId, overrides = {}) {
    const catalogItem = RELIEF_CATALOG.find(item => item.id === catalogId);
    if (!catalogItem) return false;
    if (this.#state.claimItems.some(item => item.catalogId === catalogId)) return false;
    const item = {
      claimItemId: createReference('ITEM'),
      catalogId,
      type: catalogItem.type,
      name: catalogItem.name,
      annualFee: catalogItem.type === 'subscription' ? catalogItem.typicalFee : 0,
      annualAllowance: catalogItem.type === 'flat-rate' ? catalogItem.annualAllowance : 0,
      weeks: catalogItem.type === 'wfh' ? 52 : 0,
      businessMiles: 0,
      employerReimbursement: 0,
      years: [...this.#state.selectedYears],
      ...overrides
    };
    this.#notify({ claimItems: [...this.#state.claimItems, item] });
    return true;
  }

  updateClaimItem(claimItemId, patch) {
    this.#notify({
      claimItems: this.#state.claimItems.map(item => item.claimItemId === claimItemId ? { ...item, ...patch } : item)
    });
  }

  toggleClaimItemYear(claimItemId, year) {
    const item = this.#state.claimItems.find(entry => entry.claimItemId === claimItemId);
    if (!item) return;
    const years = new Set(item.years);
    if (years.has(year)) years.delete(year); else years.add(year);
    this.updateClaimItem(claimItemId, { years: TAX_YEARS.filter(option => years.has(option)) });
  }

  removeClaimItem(claimItemId) {
    this.#notify({ claimItems: this.#state.claimItems.filter(item => item.claimItemId !== claimItemId) });
  }

  clearClaim() {
    this.#notify({ claimItems: [], claimStep: 1, claimReference: null, signatureData: '' });
  }

  archiveClaim(reference) {
    const dossier = this.getClaimDossier();
    const archived = [{ reference, createdAt: new Date().toISOString(), dossier }, ...this.#state.archivedClaims].slice(0, 10);
    safeStorage.set(CONFIG.storageKeys.archive, archived);
    this.clearClaim();
    this.#notify({ archivedClaims: archived, claimReference: reference });
  }

  getCatalogItem(catalogId) { return RELIEF_CATALOG.find(item => item.id === catalogId) || null; }
  getTaxBand() { return TAX_BANDS.find(band => band.value === this.#state.taxBand) || TAX_BANDS[0]; }

  getFilteredCatalog() {
    const query = this.#state.searchQuery.trim().toLowerCase();
    return this.#state.catalog.filter(item => {
      const categoryMatch = this.#state.activeCategory === 'All reliefs' || item.category === this.#state.activeCategory;
      const haystack = `${item.name} ${item.category} ${item.eligibility} ${item.notes}`.toLowerCase();
      return categoryMatch && (!query || haystack.includes(query));
    });
  }

  #annualExpense(item) {
    if (item.type === 'subscription') return Math.max(0, Number(item.annualFee) || 0);
    if (item.type === 'flat-rate') return Math.max(0, Number(item.annualAllowance) || 0);
    if (item.type === 'wfh') return clamp(Number(item.weeks), 0, 52) * CONFIG.wfhWeeklyAllowance;
    if (item.type === 'mileage') {
      const miles = clamp(Number(item.businessMiles), 0, 200000);
      const firstTier = Math.min(miles, CONFIG.mileageTierThreshold);
      const secondTier = Math.max(0, miles - CONFIG.mileageTierThreshold);
      const gross = firstTier * CONFIG.mileageFirstTierRate + secondTier * CONFIG.mileageSecondTierRate;
      return Math.max(0, gross - clamp(Number(item.employerReimbursement), 0, gross));
    }
    return 0;
  }

  getClaimCalculation() {
    const rate = this.getTaxBand().rate;
    const items = this.#state.claimItems.map(item => {
      const activeYears = item.years.filter(year => this.#state.selectedYears.includes(year));
      const annualExpense = this.#annualExpense(item);
      const grossAllowable = round2(annualExpense * activeYears.length);
      const grossRelief = round2(grossAllowable * rate);
      return { ...item, activeYears, annualExpense, grossAllowable, grossRelief };
    });
    const totalGrossAllowable = round2(sum(items.map(item => item.grossAllowable)));
    const grossRelief = round2(sum(items.map(item => item.grossRelief)));
    const serviceFee = this.#state.claimMode === 'managed' ? round2(grossRelief * CONFIG.managedFeeRate) : 0;
    const vatOnFee = round2(serviceFee * CONFIG.vatRate);
    const netRefund = round2(grossRelief - serviceFee - vatOnFee);
    return {
      items, rate, totalGrossAllowable, grossRelief, serviceFee, vatOnFee, netRefund,
      claimMode: this.#state.claimMode, selectedYears: this.#state.selectedYears
    };
  }

  getClaimDossier() {
    const calculation = this.getClaimCalculation();
    return {
      generatedAt: new Date().toISOString(),
      taxBand: this.getTaxBand(),
      selectedYears: calculation.selectedYears,
      claimMode: calculation.claimMode,
      items: calculation.items.map(item => ({
        name: item.name,
        type: item.type,
        years: item.activeYears,
        annualExpense: item.annualExpense,
        grossAllowable: item.grossAllowable,
        grossRelief: item.grossRelief,
        details: item.type === 'mileage'
          ? `${formatMiles(item.businessMiles)} business miles; ${formatMoney(item.employerReimbursement)} reimbursed`
          : item.type === 'wfh' ? `${item.weeks} eligible weeks at £6 per week`
          : item.type === 'subscription' ? `Annual subscription: ${formatMoney(item.annualFee)}`
          : `Annual flat-rate allowance: ${formatMoney(item.annualAllowance)}`
      })),
      totals: {
        totalGrossAllowable: calculation.totalGrossAllowable,
        grossRelief: calculation.grossRelief,
        serviceFee: calculation.serviceFee,
        vatOnFee: calculation.serviceFee > 0 ? calculation.vatOnFee : 0,
        netRefund: calculation.netRefund
      }
    };
  }

  submitClaim() {
    const reference = createReference('RDUK');
    this.archiveClaim(reference);
    return reference;
  }
}

/* === VIEW (Reusable Components & DOM Rendering) === */
const ICONS = Object.freeze({
  certificate: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5" fill="currentColor" opacity=".2"/><circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 14l-2 7 5-3 5 3-2-7" fill="currentColor"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="3" fill="currentColor" opacity=".18"/><path d="M9 7V5.5A2 2 0 0 1 11 4h2a2 2 0 0 1 2 1.5V7" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="7" width="18" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 4l8 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M7 11v8h10v-8" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  car: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15l1.5-5A2 2 0 0 1 7.4 8h9.2a2 2 0 0 1 1.9 1.4L20 15" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="18" height="5" rx="2" fill="currentColor" opacity=".2"/><circle cx="7.5" cy="19" r="1.5" fill="currentColor"/><circle cx="16.5" cy="19" r="1.5" fill="currentColor"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z" fill="currentColor" opacity=".2"/><path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6a4 4 0 0 0-7 2.5V13H7v3h2v4h3v-4h5v-3h-5v-4.5A1.5 1.5 0 0 1 15 8z" fill="currentColor"/></svg>'
});

const createIcon = (name, className = 'icon') => {
  const wrapper = el('span', { class: className, 'aria-hidden': 'true' });
  wrapper.innerHTML = ICONS[name] || ICONS.receipt;
  return wrapper;
};

const createBadge = (text, variant = '') => el('span', { class: `badge ${variant}`.trim() }, text);
const createTrustBadge = (title, message) => el('div', { class: 'result-card' }, [
  el('strong', {}, title), el('span', {}, message)
]);
const createEmptyState = (title, message, action) => el('div', { class: 'empty-state' }, [
  createIcon('receipt'), el('h3', {}, title), el('p', { class: 'muted' }, message), action
].filter(Boolean));

const createTaxYearPill = (year, selected, controller) => el('button', {
  class: 'year-pill', type: 'button', 'data-action': 'toggle-tax-year', 'data-year': year,
  'aria-pressed': String(selected)
}, year);

const createReliefCard = (item, state, controller) => {
  const rate = controller.model.getTaxBand().rate;
  const annualValue = item.type === 'subscription' ? item.typicalFee
    : item.type === 'flat-rate' ? item.annualAllowance
    : item.type === 'wfh' ? CONFIG.wfhAnnualAllowance
    : 0;
  const reliefValue = round2(annualValue * rate);
  const alreadyAdded = state.claimItems.some(claim => claim.catalogId === item.id);
  return el('article', { class: 'card', 'aria-label': item.name }, [
    el('div', { class: 'card-body' }, [
      el('div', { class: 'row' }, [createBadge(item.category), createBadge(item.type === 'subscription' ? 'List 3 / Section 344' : item.type === 'flat-rate' ? 'Flat-rate expense' : 'Calculator', 'badge-emerald')]),
      el('h3', { class: 'card-title' }, item.name),
      el('p', { class: 'muted small' }, item.eligibility),
      el('div', { class: 'result-grid' }, [
        el('div', { class: 'result-card' }, [
          el('strong', { class: 'num' }, item.type === 'mileage' ? '45p / 25p' : formatMoney(annualValue)),
          el('span', {}, item.type === 'mileage' ? 'Per business mile, before reimbursement' : 'Gross annual allowance')
        ]),
        el('div', { class: 'result-card' }, [
          el('strong', { class: 'num' }, item.type === 'mileage' ? 'Varies' : formatMoney(reliefValue)),
          el('span', {}, `Tax relief at ${rate * 100}% per year`)
        ])
      ]),
      el('p', { class: 'hint' }, item.notes),
      el('div', { class: 'card-actions' }, [
        el('button', {
          class: `button ${alreadyAdded ? 'button-ghost' : 'button-primary'}`, type: 'button',
          'data-action': 'add-relief', 'data-catalog-id': item.id, disabled: alreadyAdded
        }, alreadyAdded ? 'Added to claim' : 'Add to claim')
      ])
    ])
  ]);
};

const createHomeView = (state, controller) => {
  const calculation = controller.model.getClaimCalculation();
  const bandPills = TAX_BANDS.map(band => el('button', {
    class: 'pill', type: 'button', 'data-action': 'set-tax-band', 'data-band': band.value,
    'aria-pressed': String(state.taxBand === band.value)
  }, band.label));
  const yearPills = TAX_YEARS.map(year => createTaxYearPill(year, state.selectedYears.includes(year), controller));

  return el('section', { class: 'section', 'aria-labelledby': 'home-title' }, [
    el('div', { class: 'hero' }, [
      el('div', { class: 'hero-inner' }, [
        el('div', { class: 'stack' }, [
          createBadge('UK PAYE tax relief', 'badge-emerald'),
          el('h1', { id: 'home-title' }, 'Claim up to 4 years of backdated HMRC tax relief in under 3 minutes.'),
          el('p', {}, 'Bundle professional subscriptions, flat-rate uniform and tool allowances, working-from-home relief and un reimbursed business mileage into one clear claim schedule.'),
          el('div', { class: 'hero-actions' }, [
            el('a', { class: 'button button-accent', href: '#/reliefs' }, 'Find my reliefs'),
            el('a', { class: 'button button-ghost', href: '#/claim', style: { color: 'white', borderColor: 'oklch(100% 0 0 / .3)' } }, 'Review my claim')
          ])
        ]),
        el('div', { class: 'hero-canvas' }, [
          el('canvas', { id: 'relief-canvas', role: 'img', 'aria-label': 'Animated illustration of tax relief flowing from expense records into a refund' })
        ])
      ])
    ]),
    el('div', { class: 'panel stack', 'aria-labelledby': 'profile-title' }, [
      el('h2', { id: 'profile-title' }, 'Your tax profile'),
      el('p', { class: 'muted' }, 'Select the income-tax band that applied to the relevant part of your income, then choose every tax year for which you paid eligible, unreimbursed expenses.'),
      el('div', { class: 'stack' }, [
        el('div', { class: 'field' }, [el('span', {}, 'Income-tax band'), el('div', { class: 'row' }, bandPills)]),
        el('div', { class: 'field' }, [el('span', {}, 'Eligible tax years'), el('div', { class: 'row' }, yearPills)])
      ]),
      el('div', { class: 'result-grid' }, [
        createTrustBadge(formatMoney(calculation.totalGrossAllowable), 'Total gross allowable expenses'),
        createTrustBadge(formatMoney(calculation.grossRelief), `Gross HMRC relief at ${calculation.rate * 100}%`),
        createTrustBadge(formatMoney(calculation.serviceFee + calculation.vatOnFee), calculation.claimMode === 'managed' ? 'Managed service fee including VAT' : 'No managed fee selected'),
        createTrustBadge(formatMoney(calculation.netRefund), calculation.claimMode === 'managed' ? 'Estimated net cash refund' : 'Self-file estimated relief')
      ])
    ]),
    el('div', { class: 'section-head' }, [
      el('div', {}, [el('h2', {}, 'Four ways to build a claim'), el('p', {}, 'Every entry is checked against its own eligibility rule and can be assigned to individual tax years.')]),
      el('a', { class: 'button button-ghost', href: '#/reliefs' }, 'Browse catalogue')
    ]),
    el('div', { class: 'catalog-grid' }, [
      createReliefCard(RELIEF_CATALOG.find(item => item.id === 'rcn'), state, controller),
      createReliefCard(RELIEF_CATALOG.find(item => item.id === 'healthcare'), state, controller),
      createReliefCard(RELIEF_CATALOG.find(item => item.id === 'wfh'), state, controller),
      createReliefCard(RELIEF_CATALOG.find(item => item.id === 'mileage'), state, controller)
    ])
  ]);
};

const createReliefsView = (state, controller) => {
  const results = controller.model.getFilteredCatalog();
  const searchInput = el('input', {
    class: 'input', type: 'search', id: 'relief-search', value: state.searchQuery,
    placeholder: 'Search RCN, CIPD, nurse, mechanic, WFH or mileage', autocomplete: 'off',
    'aria-label': 'Search reliefs and professional bodies'
  });
  const categoryPills = CATEGORIES.map(category => el('button', {
    class: 'pill', type: 'button', 'data-action': 'set-category', 'data-category': category,
    'aria-pressed': String(category === state.activeCategory)
  }, category));
  const grid = results.length
    ? el('div', { class: 'catalog-grid', id: 'relief-grid' }, results.map(item => createReliefCard(item, state, controller)))
    : createEmptyState('No matching relief', 'Try a shorter search term or select All reliefs.', el('button', { class: 'button button-accent', type: 'button', 'data-action': 'reset-filters' }, 'Clear filters'));

  return el('section', { class: 'section', 'aria-labelledby': 'reliefs-title' }, [
    el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('h2', { id: 'reliefs-title' }, 'Expense & subscription explorer'),
        el('p', {}, 'Search professional bodies, select an occupation flat rate, or open a calculator for working from home and business mileage.')
      ]),
      el('a', { class: 'button button-ghost', href: '#/claim' }, 'Open claim basket')
    ]),
    el('div', { class: 'toolbar' }, [
      el('div', { class: 'search-row' }, [searchInput]),
      el('div', { class: 'filter-row', role: 'group', 'aria-label': 'Relief categories' }, categoryPills),
      el('p', { class: 'muted small', role: 'status' }, `${results.length} matching relief${results.length === 1 ? '' : 's'}`)
    ]),
    grid
  ]);
};

const createClaimItemRow = (item, state, controller) => {
  const calculation = controller.model.getClaimCalculation();
  const line = calculation.items.find(entry => entry.claimItemId === item.claimItemId) || item;
  const yearPills = TAX_YEARS.map(year => el('button', {
    class: 'year-pill', type: 'button', 'data-action': 'toggle-item-year',
    'data-claim-item-id': item.claimItemId, 'data-year': year,
    'aria-pressed': String(item.years.includes(year))
  }, year));

  const amountControl = item.type === 'subscription'
    ? el('input', { class: 'input num', type: 'number', min: '0', max: '10000', step: '0.01', value: String(item.annualFee), 'data-action-input': 'item-fee', 'data-claim-item-id': item.claimItemId, 'aria-label': `Annual fee for ${item.name}` })
    : item.type === 'flat-rate'
      ? el('input', { class: 'input num', type: 'number', min: '0', max: '5000', step: '1', value: String(item.annualAllowance), 'data-action-input': 'item-allowance', 'data-claim-item-id': item.claimItemId, 'aria-label': `Annual allowance for ${item.name}` })
      : item.type === 'wfh'
        ? el('input', { class: 'input num', type: 'number', min: '0', max: '52', step: '1', value: String(item.weeks), 'data-action-input': 'item-weeks', 'data-claim-item-id': item.claimItemId, 'aria-label': `Eligible WFH weeks for ${item.name}` })
        : el('div', { class: 'form-grid' }, [
            el('input', { class: 'input num', type: 'number', min: '0', max: '200000', step: '1', value: String(item.businessMiles), 'data-action-input': 'item-miles', 'data-claim-item-id': item.claimItemId, 'aria-label': `Business miles for ${item.name}` }),
            el('input', { class: 'input num', type: 'number', min: '0', max: '100000', step: '0.01', value: String(item.employerReimbursement), 'data-action-input': 'item-reimbursement', 'data-claim-item-id': item.claimItemId, 'aria-label': `Employer reimbursement for ${item.name}` })
          ]);

  return el('article', { class: 'claim-item', 'aria-label': item.name }, [
    el('div', { class: 'claim-item-head' }, [
      el('div', {}, [
        createBadge(item.type === 'subscription' ? 'Professional subscription' : item.type === 'flat-rate' ? 'Flat-rate occupation' : item.type === 'wfh' ? 'WFH relief' : 'Mileage relief', 'badge-emerald'),
        el('div', { class: 'claim-item-title' }, item.name)
      ]),
      el('button', { class: 'button button-danger button-sm', type: 'button', 'data-action': 'remove-claim-item', 'data-claim-item-id': item.claimItemId, 'aria-label': `Remove ${item.name}` }, 'Remove')
    ]),
    amountControl,
    el('div', { class: 'field' }, [el('span', {}, 'Apply this item to'), el('div', { class: 'year-pills' }, yearPills)]),
    el('div', { class: 'summary-row' }, [
      el('span', {}, 'Gross allowable'),
      el('span', { class: 'num' }, formatMoney(line.grossAllowable))
    ]),
    el('div', { class: 'summary-row' }, [
      el('span', {}, 'Gross tax relief'),
      el('span', { class: 'num' }, formatMoney(line.grossRelief))
    ])
  ]);
};

const createClaimView = (state, controller) => {
  const calculation = controller.model.getClaimCalculation();
  const items = calculation.items.length
    ? calculation.items.map(item => createClaimItemRow(item, state, controller))
    : [createEmptyState('No claim items yet', 'Add a professional subscription, flat-rate occupation, WFH allowance or mileage calculation to begin.', el('a', { class: 'button button-accent', href: '#/reliefs' }, 'Find reliefs'))];

  const managedOption = el('label', { class: 'mode-option' }, [
    el('input', { type: 'radio', name: 'claim-mode', value: 'managed', checked: state.claimMode === 'managed' }),
    el('span', {}, [el('strong', {}, 'Managed claim'), el('br'), el('span', { class: 'muted small' }, '25% of gross relief plus VAT; estimated net cash refund is shown.')])
  ]);
  const selfFileOption = el('label', { class: 'mode-option' }, [
    el('input', { type: 'radio', name: 'claim-mode', value: 'self-file', checked: state.claimMode === 'self-file' }),
    el('span', {}, [el('strong', {}, 'Self-file estimate'), el('br'), el('span', { class: 'muted small' }, 'No service fee; shows the gross relief you could pursue directly.')])
  ]);

  return el('section', { class: 'section', 'aria-labelledby': 'claim-title' }, [
    el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('h2', { id: 'claim-title' }, 'Live claim basket'),
        el('p', {}, 'Adjust annual fees, eligible weeks, mileage and reimbursement. Each item can cover a different combination of tax years.')
      ]),
      el('button', { class: 'button button-danger', type: 'button', 'data-action': 'clear-claim', disabled: calculation.items.length === 0 }, 'Clear draft')
    ]),
    el('div', { class: 'claim-layout' }, [
      el('div', { class: 'stack' }, items),
      el('aside', { class: 'panel stack', 'aria-labelledby': 'summary-title' }, [
        el('h3', { id: 'summary-title' }, 'Live refund breakdown'),
        el('div', { class: 'mode-toggle', role: 'radiogroup', 'aria-label': 'Claim processing mode' }, [managedOption, selfFileOption]),
        el('div', { class: 'stack' }, [
          el('div', { class: 'summary-row' }, [el('span', {}, 'Total gross allowable'), el('span', { class: 'num' }, formatMoney(calculation.totalGrossAllowable))]),
          el('div', { class: 'summary-row' }, [el('span', {}, `Gross HMRC relief (${calculation.rate * 100}%)`), el('span', { class: 'num' }, formatMoney(calculation.grossRelief))]),
          el('div', { class: 'summary-row' }, [el('span', {}, 'Service fee (25%)'), el('span', { class: 'num' }, formatMoney(calculation.serviceFee))]),
          el('div', { class: 'summary-row' }, [el('span', {}, 'VAT on service fee'), el('span', { class: 'num' }, formatMoney(calculation.vatOnFee))]),
          el('div', { class: 'summary-row total' }, [el('span', {}, calculation.claimMode === 'managed' ? 'Net estimated refund' : 'Self-file relief'), el('span', { class: 'num' }, formatMoney(calculation.netRefund))])
        ]),
        el('button', { class: 'button button-primary', type: 'button', 'data-action': 'start-submission', disabled: calculation.items.length === 0 }, 'Start claim submission'),
        el('p', { class: 'small muted' }, 'Estimates assume the selected marginal rate applies to the full claimed amount. Actual HMRC relief can differ based on your tax position and evidence.')
      ])
    ])
  ]);
};

const createAboutView = (state, controller) => {
  const capabilities = controller.getCapabilities();
  return el('section', { class: 'section', 'aria-labelledby': 'about-title' }, [
    el('div', { class: 'section-head' }, [
      el('div', {}, [el('h2', { id: 'about-title' }, 'Assumptions, privacy and platform support'), el('p', {}, 'This planner is an educational demonstration. It does not submit information to HMRC or provide individual tax advice.')])
    ]),
    el('div', { class: 'calculator-grid' }, [
      el('div', { class: 'panel stack' }, [
        el('h3', {}, 'Calculation assumptions'),
        el('p', {}, 'Professional subscriptions use the editable annual fee entered for each claim item. Flat-rate occupations use their stated annual allowance. Working from home uses £6 per eligible week, equivalent to £312 across a full year.'),
        el('p', {}, 'Business mileage uses 45p per mile for the first 10,000 miles and 25p thereafter, then subtracts employer reimbursement. These rates apply to the 2022/23 through 2025/26 periods covered by this planner.'),
        el('p', {}, 'The managed-claim estimate deducts 25% service fee plus VAT from gross relief. A self-file estimate shows gross relief without a service fee.')
      ]),
      el('div', { class: 'panel stack' }, [
        el('h3', {}, 'Platform capabilities'),
        el('div', { class: 'capability-list' }, capabilities.map(capability => el('div', { class: 'capability' }, [
          el('strong', {}, capability.label),
          el('span', { class: capability.supported ? 'status-active' : 'status-unavailable' }, capability.supported ? 'Active' : 'Unavailable'),
          el('p', {}, capability.description)
        ])))
      ])
    ])
  ]);
};

const createSummaryDrawer = (state, controller) => {
  const calculation = controller.model.getClaimCalculation();
  const rows = calculation.items.length ? calculation.items.map(item => el('div', { class: 'claim-item' }, [
    el('div', { class: 'claim-item-head' }, [
      el('div', {}, [el('div', { class: 'claim-item-title' }, item.name), el('span', { class: 'small muted' }, item.activeYears.join(', ') || 'No years selected')]),
      el('span', { class: 'price num' }, formatMoney(item.grossRelief))
    ])
  ])) : [createEmptyState('Your claim is empty', 'Add reliefs from the explorer to see a live refund estimate.')];

  return el('div', { class: 'drawer', id: 'claim-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'drawer-title' }, [
    el('div', { class: 'drawer-panel' }, [
      el('div', { class: 'drawer-head' }, [
        el('h2', { id: 'drawer-title' }, 'Live claim summary'),
        el('button', { class: 'button button-ghost button-icon', type: 'button', 'data-action': 'close-drawer', 'aria-label': 'Close claim summary' }, '×')
      ]),
      el('div', { class: 'drawer-body' }, rows),
      el('div', { class: 'drawer-foot stack' }, [
        el('div', { class: 'summary-row' }, [el('span', {}, 'Gross allowable'), el('span', { class: 'num' }, formatMoney(calculation.totalGrossAllowable))]),
        el('div', { class: 'summary-row' }, [el('span', {}, 'Gross relief'), el('span', { class: 'num' }, formatMoney(calculation.grossRelief))]),
        el('div', { class: 'summary-row' }, [el('span', {}, 'Service fee + VAT'), el('span', { class: 'num' }, formatMoney(calculation.serviceFee + calculation.vatOnFee))]),
        el('div', { class: 'summary-row total' }, [el('span', {}, calculation.claimMode === 'managed' ? 'Net refund' : 'Self-file relief'), el('span', { class: 'num' }, formatMoney(calculation.netRefund))]),
        el('button', { class: 'button button-primary', type: 'button', 'data-action': 'start-submission', disabled: calculation.items.length === 0 }, 'Start claim submission')
      ])
    ])
  ]);
};

const createSubmissionModal = (state, controller) => {
  const calculation = controller.model.getClaimCalculation();
  const claimant = state.claimant;
  const steps = ['Claimant details', 'Eligibility & authority', 'Dossier & confirmation'];
  const stepIndicator = el('div', { class: 'claim-steps', role: 'list' }, steps.map((label, index) => {
    const step = index + 1;
    const stepState = step === state.claimStep ? 'active' : step < state.claimStep ? 'done' : 'upcoming';
    return el('div', { class: 'claim-step', role: 'listitem', 'data-state': stepState }, [`${step}. ${label}`]);
  }));

  const detailsForm = el('form', { class: 'stack', id: 'claimant-form', novalidate: true }, [
    el('div', { class: 'form-grid' }, [
      el('div', { class: 'field' }, [
        el('label', { for: 'full-name' }, 'Full name'),
        el('input', { class: 'input', id: 'full-name', name: 'fullName', required: true, autocomplete: 'name', value: claimant.fullName }),
        el('p', { class: 'field-error', id: 'full-name-error' }, '')
      ]),
      el('div', { class: 'field' }, [
        el('label', { for: 'postcode' }, 'UK postcode'),
        el('input', { class: 'input', id: 'postcode', name: 'postcode', required: true, autocomplete: 'postal-code', value: claimant.postcode }),
        el('p', { class: 'field-error', id: 'postcode-error' }, '')
      ])
    ]),
    el('div', { class: 'form-grid' }, [
      el('div', { class: 'field' }, [
        el('label', { for: 'email' }, 'Email address'),
        el('input', { class: 'input', id: 'email', name: 'email', type: 'email', required: true, autocomplete: 'email', value: claimant.email }),
        el('p', { class: 'field-error', id: 'email-error' }, '')
      ]),
      el('div', { class: 'field' }, [
        el('label', { for: 'phone' }, 'UK phone number'),
        el('input', { class: 'input', id: 'phone', name: 'phone', type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel', value: claimant.phone }),
        el('p', { class: 'field-error', id: 'phone-error' }, '')
      ])
    ]),
    el('div', { class: 'form-grid' }, [
      el('div', { class: 'field' }, [
        el('label', { for: 'ni-number' }, 'National Insurance number'),
        el('input', { class: 'input', id: 'ni-number', name: 'niNumber', required: true, autocomplete: 'off', value: claimant.niNumber, placeholder: 'QQ 12 34 56 C' }),
        el('p', { class: 'field-error', id: 'ni-number-error' }, '')
      ]),
      el('div', { class: 'field' }, [
        el('label', { for: 'employer-reference' }, 'Employer PAYE reference (optional)'),
        el('input', { class: 'input', id: 'employer-reference', name: 'employerReference', value: claimant.employerReference })
      ])
    ]),
    el('button', { class: 'button button-primary', type: 'submit' }, 'Continue to declarations')
  ]);

  const declarationForm = el('form', { class: 'stack', id: 'declaration-form', novalidate: true }, [
    el('div', { class: 'declaration' }, [
      el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', name: 'paye', checked: state.declarations.paye }),
        el('span', {}, 'I was employed under PAYE during every selected tax year.')
      ]),
      el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', name: 'unreimbursed', checked: state.declarations.unreimbursed }),
        el('span', {}, 'The expenses claimed were paid by me and were not fully reimbursed by my employer.')
      ]),
      el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', name: 'authorised', checked: state.declarations.authorised }),
        el('span', {}, 'I authorise preparation of an illustrative digital P87 expense schedule and understand this is not an HMRC submission.')
      ])
    ]),
    el('div', { class: 'field' }, [
      el('label', { for: 'typed-signature' }, 'Type your full name to sign'),
      el('input', { class: 'input', id: 'typed-signature', name: 'typedSignature', required: true, value: state.claimant.fullName }),
      el('p', { class: 'field-error', id: 'typed-signature-error' }, '')
    ]),
    el('div', { class: 'field' }, [
      el('span', {}, 'Or draw your signature'),
      el('canvas', { class: 'signature-pad', id: 'signature-pad', 'aria-label': 'Signature drawing area' })
    ]),
    el('div', { class: 'row' }, [
      el('button', { class: 'button button-ghost', type: 'button', 'data-action': 'submission-back' }, 'Back'),
      el('button', { class: 'button button-primary', type: 'submit' }, 'Generate claim dossier')
    ])
  ]);

  const calculationRows = calculation.items.map(item => el('tr', {}, [
    el('td', {}, item.name),
    el('td', {}, item.activeYears.join(', ') || 'None'),
    el('td', { class: 'num' }, formatMoney(item.grossAllowable)),
    el('td', { class: 'num' }, formatMoney(item.grossRelief))
  ]));

  const dossier = el('div', { class: 'stack' }, [
    el('h3', {}, 'P87 expense schedule'),
    el('div', { style: { overflowX: 'auto' } }, el('table', { class: 'dossier-table' }, [
      el('caption', { class: 'visually-hidden' }, 'Claim expense schedule by tax year'),
      el('thead', {}, el('tr', {}, [
        el('th', { scope: 'col' }, 'Relief'), el('th', { scope: 'col' }, 'Tax years'),
        el('th', { scope: 'col' }, 'Gross allowable'), el('th', { scope: 'col' }, 'Gross relief')
      ])),
      el('tbody', {}, calculationRows)
    ])),
    el('div', { class: 'stack' }, [
      el('div', { class: 'summary-row' }, [el('span', {}, 'Total gross allowable'), el('span', { class: 'num' }, formatMoney(calculation.totalGrossAllowable))]),
      el('div', { class: 'summary-row' }, [el('span', {}, 'Gross HMRC relief'), el('span', { class: 'num' }, formatMoney(calculation.grossRelief))]),
      el('div', { class: 'summary-row' }, [el('span', {}, 'Service fee + VAT'), el('span', { class: 'num' }, formatMoney(calculation.serviceFee + calculation.vatOnFee))]),
      el('div', { class: 'summary-row total' }, [el('span', {}, calculation.claimMode === 'managed' ? 'Net estimated refund' : 'Self-file relief'), el('span', { class: 'num' }, formatMoney(calculation.netRefund))])
    ]),
    el('div', { class: 'row' }, [
      el('button', { class: 'button button-ghost', type: 'button', 'data-action': 'submission-back' }, 'Back'),
      el('button', { class: 'button button-accent', type: 'button', 'data-action': 'submit-claim' }, 'Submit demonstration claim')
    ])
  ]);

  const confirmation = state.claimReference ? el('div', { class: 'confirmation' }, [
    createIcon('shield'),
    el('h2', {}, 'Claim dossier ready'),
    el('p', {}, 'Your active draft has been archived locally and cleared. This demonstration does not send data to HMRC.'),
    el('p', { class: 'claim-reference' }, state.claimReference),
    el('div', { class: 'row', style: { justifyContent: 'center' } }, [
      el('button', { class: 'button button-ghost', type: 'button', 'data-action': 'print-dossier' }, 'Print / save PDF'),
      el('button', { class: 'button button-primary', type: 'button', 'data-action': 'close-modal' }, 'Return to portal')
    ])
  ]) : [stepIndicator, state.claimStep === 1 ? detailsForm : state.claimStep === 2 ? declarationForm : dossier];

  const dialog = el('dialog', { class: 'modal', 'aria-labelledby': 'submission-title' });
  dialog.append(el('div', { class: 'modal-card' }, [
    el('div', { class: 'modal-head' }, [
      el('h2', { id: 'submission-title' }, state.claimReference ? 'Demonstration claim complete' : 'Digital claim submission'),
      el('button', { class: 'button button-ghost button-icon', type: 'button', 'data-action': 'close-modal', 'aria-label': 'Close submission' }, '×')
    ]),
    el('div', { class: 'modal-body' }, confirmation)
  ]));
  return dialog;
};

/* === CONTROLLER (Event Delegation & Workflow Logic) === */
class TaxRebateController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.activeModal = null;
    this.activeDrawer = null;
    this.canvasAnimationId = null;
    this.canvasObserver = null;
    this.signatureContext = null;
    this.isDrawing = false;
  }

  getCapabilities() {
    const supports = (property, value = 'initial') => {
      try { return CSS.supports(property, value); } catch { return false; }
    };
    return [
      ['View Transitions API', Boolean(document.startViewTransition), 'Smooth route and modal transitions.'],
      ['Scroll-driven animations', supports('animation-timeline', 'scroll()'), 'Reading progress tracks page scroll.'],
      ['Container queries', supports('container-type', 'inline-size'), 'Relief cards adapt to their own width.'],
      ['Container style queries', supports('container', 'style(--x: y)'), 'Supports component-level style conditions.'],
      ['CSS nesting', supports('selector(&)', '& p'), 'Keeps related styles together.'],
      ['@scope', supports('selector(@scope)'), 'Scoped component styling.'],
      ['Anchor positioning', supports('position-area', 'top'), 'Positions help popovers near triggers.'],
      ['Popover API', Boolean(HTMLElement.prototype.showPopover), 'Native theme selector.'],
      ['Dialog element', Boolean(window.HTMLDialogElement), 'Accessible submission modal.'],
      [':has()', supports('selector(:has(a))'), 'Highlights selected claim mode.'],
      ['field-sizing', supports('field-sizing', 'content'), 'Progressive form sizing.'],
      ['Trusted Types', Boolean(window.trustedTypes), 'Extra protection against DOM injection.'],
      ['Navigation API', Boolean(window.navigation), 'Modern navigation events.'],
      ['Web Animations API', Boolean(Element.prototype.animate), 'Programmatic interaction motion.'],
      ['Canvas 2D', Boolean(document.createElement('canvas').getContext('2d')), 'Hero animation and signature capture.'],
      ['Web Audio', Boolean(window.AudioContext || window.webkitAudioContext), 'Optional audio capability detection.'],
      ['Clipboard API', Boolean(navigator.clipboard), 'Potential copy actions.'],
      ['Web Share API', Boolean(navigator.share), 'Native sharing where available.'],
      ['localStorage', safeStorage.set('rebatedirect.test', '1') && safeStorage.remove('rebatedirect.test'), 'Claim and preference persistence.']
    ].map(([label, supported, description]) => ({ label, supported, description }));
  }

  init() {
    this.model.subscribe((state, patch) => this.render(state, patch));
    this.bindGlobalEvents();
    this.syncFromLocation();
    this.render(this.model.getState(), {});
  }

  bindGlobalEvents() {
    document.addEventListener('click', event => this.handleClick(event));
    document.addEventListener('input', event => this.handleInput(event));
    document.addEventListener('change', event => this.handleChange(event));
    document.addEventListener('submit', event => this.handleSubmit(event));
    document.addEventListener('keydown', event => this.handleKeydown(event));
    window.addEventListener('hashchange', () => this.syncFromLocation());
    if (window.navigation) {
      window.navigation.addEventListener('navigate', event => {
        if (event.canIntercept && event.hashChange) event.intercept({ handler: () => this.syncFromLocation() });
      });
    }
    this.initialiseCanvas();
  }

  handleClick(event) {
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) return;
    const action = actionElement.dataset.action;

    switch (action) {
      case 'set-tax-band': this.model.setTaxBand(actionElement.dataset.band); break;
      case 'toggle-tax-year': this.model.toggleTaxYear(actionElement.dataset.year); break;
      case 'set-category': this.model.setActiveCategory(actionElement.dataset.category); break;
      case 'reset-filters': this.model.setSearchQuery(''); this.model.setActiveCategory('All reliefs'); break;
      case 'add-relief': this.addRelief(actionElement.dataset.catalogId); break;
      case 'open-drawer': this.openDrawer(); break;
      case 'close-drawer': this.closeDrawer(); break;
      case 'remove-claim-item': this.model.removeClaimItem(actionElement.dataset.claimItemId); break;
      case 'toggle-item-year': this.model.toggleClaimItemYear(actionElement.dataset.claimItemId, actionElement.dataset.year); break;
      case 'clear-claim': this.model.clearClaim(); this.announce('Claim draft cleared.'); break;
      case 'start-submission': this.openModal(); break;
      case 'submission-back': this.model.setClaimStep(this.model.getState().claimStep - 1); break;
      case 'submit-claim': this.submitClaim(); break;
      case 'print-dossier': window.print(); break;
      case 'close-modal': this.closeModal(); break;
      case 'set-theme': this.model.setTheme(actionElement.dataset.theme); break;
    }
  }

  handleInput(event) {
    const target = event.target;
    if (target.id === 'relief-search') {
      const value = target.value;
      debounce(() => this.model.setSearchQuery(value), 220)();
    }
    const itemId = target.dataset.claimItemId;
    if (!itemId) return;
    const patches = {
      'item-fee': { annualFee: clamp(target.value, 0, 10000) },
      'item-allowance': { annualAllowance: clamp(target.value, 0, 5000) },
      'item-weeks': { weeks: clamp(target.value, 0, 52) },
      'item-miles': { businessMiles: clamp(target.value, 0, 200000) },
      'item-reimbursement': { employerReimbursement: clamp(target.value, 0, 100000) }
    };
    if (patches[target.dataset.actionInput]) this.model.updateClaimItem(itemId, patches[target.dataset.actionInput]);
    if (target.name === 'typedSignature') this.model.setSignature(target.value);
  }

  handleChange(event) {
    if (event.target.name === 'claim-mode') this.model.setClaimMode(event.target.value);
    if (['paye', 'unreimbursed', 'authorised'].includes(event.target.name)) {
      this.model.setDeclaration(event.target.name, event.target.checked);
    }
  }

  handleSubmit(event) {
    if (event.target.id === 'claimant-form') {
      event.preventDefault();
      if (this.validateClaimantForm(event.target)) this.model.setClaimStep(2);
    }
    if (event.target.id === 'declaration-form') {
      event.preventDefault();
      if (this.validateDeclarationForm(event.target)) this.model.setClaimStep(3);
    }
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      if (this.activeModal?.open) this.closeModal();
      if (this.activeDrawer) this.closeDrawer();
    }
  }

  validateClaimantForm(form) {
    const fields = [
      { input: form.elements.fullName, errorId: 'full-name-error', message: 'Enter your full name.', validator: value => value.trim().length > 1 },
      { input: form.elements.postcode, errorId: 'postcode-error', message: 'Enter a valid UK postcode.', validator: isPostcodeValid },
      { input: form.elements.email, errorId: 'email-error', message: 'Enter a valid email address.', validator: isEmailValid },
      { input: form.elements.phone, errorId: 'phone-error', message: 'Enter a UK phone number.', validator: value => /^(\+44|0)\d{9,10}$/.test(value.replace(/\s+/g, '')) },
      { input: form.elements.niNumber, errorId: 'ni-number-error', message: 'Enter a NI number in the format QQ 12 34 56 C.', validator: isNiNumberValid }
    ];
    let isValid = true;
    for (const field of fields) {
      const error = document.getElementById(field.errorId);
      const valid = field.validator(field.input.value);
      field.input.setAttribute('aria-invalid', String(!valid));
      field.input.setAttribute('aria-describedby', field.errorId);
      if (error) error.textContent = valid ? '' : field.message;
      if (!valid && isValid) { field.input.focus(); isValid = false; }
    }
    return isValid;
  }

  validateDeclarationForm(form) {
    const required = ['paye', 'unreimbursed', 'authorised'];
    const allChecked = required.every(name => form.elements[name].checked);
    const signature = form.elements.typedSignature.value.trim();
    const signatureValid = signature.length > 1;
    const signatureError = document.getElementById('typed-signature-error');
    form.elements.typedSignature.setAttribute('aria-invalid', String(!signatureValid));
    form.elements.typedSignature.setAttribute('aria-describedby', 'typed-signature-error');
    if (signatureError) signatureError.textContent = signatureValid ? '' : 'Type your name or draw a signature to continue.';
    if (!allChecked) this.announce('Please confirm all eligibility and authority declarations.', true);
    if (!signatureValid) form.elements.typedSignature.focus();
    return allChecked && signatureValid;
  }

  addRelief(catalogId) {
    const added = this.model.addClaimItem(catalogId);
    this.announce(added ? 'Relief added to your claim.' : 'That relief is already in your claim.');
    if (added) this.openDrawer();
  }

  submitClaim() {
    const reference = this.model.submitClaim();
    this.announce(`Claim ${reference} archived locally.`);
  }

  openModal() {
    this.closeModal();
    const modal = createSubmissionModal(this.model.getState(), this);
    document.getElementById('modal-root').append(modal);
    this.activeModal = modal;
    modal.showModal();
    this.transition(() => modal.querySelector('.modal-card')?.classList.add('open'));
    if (this.model.getState().claimStep === 2) this.initialiseSignaturePad();
  }

  closeModal() {
    if (!this.activeModal) return;
    this.activeModal.close();
    this.activeModal.remove();
    this.activeModal = null;
    if (this.model.getState().claimReference) this.model.setClaimStep(1);
  }

  openDrawer() {
    this.closeDrawer();
    const drawer = createSummaryDrawer(this.model.getState(), this);
    document.getElementById('drawer-root').append(drawer);
    this.activeDrawer = drawer;
    document.body.style.overflow = 'hidden';
    drawer.querySelector('[data-action="close-drawer"]')?.focus();
  }

  closeDrawer() {
    if (!this.activeDrawer) return;
    this.activeDrawer.remove();
    this.activeDrawer = null;
    document.body.style.overflow = '';
    document.getElementById('open-drawer')?.focus();
  }

  transition(update) {
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(update);
    } else update();
  }

  announce(message, urgent = false) {
    const toast = el('div', { class: `toast${urgent ? ' error' : ''}`, role: 'status' }, message);
    document.getElementById('toast-root').append(toast);
    setTimeout(() => toast.remove(), 3400);
  }

  syncFromLocation() {
    const hash = window.location.hash.replace(/^#\/?/, '') || 'home';
    const [route, query = ''] = hash.split('?');
    this.model.setRoute(route);
    const params = new URLSearchParams(query);
    if (params.has('q')) this.model.setSearchQuery(params.get('q'));
    if (params.has('category')) this.model.setActiveCategory(params.get('category'));
    const titles = { home: 'Overview', reliefs: 'Find reliefs', claim: 'My claim', about: 'About' };
    document.title = `${titles[this.model.getState().route] || 'RebateDirect UK'} — RebateDirect UK`;
  }

  render(state, patch) {
    const viewRoot = document.getElementById('view-root');
    const nextView = state.route === 'reliefs' ? createReliefsView(state, this)
      : state.route === 'claim' ? createClaimView(state, this)
      : state.route === 'about' ? createAboutView(state, this)
      : createHomeView(state, this);

    this.transition(() => {
      viewRoot.replaceChildren(nextView);
      document.querySelectorAll('.primary-nav a').forEach(link => {
        if (link.dataset.route === state.route) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    });

    const calculation = this.model.getClaimCalculation();
    document.getElementById('refund-preview').textContent = formatMoney(calculation.netRefund);

    if (this.activeDrawer) {
      const scrollTop = this.activeDrawer.querySelector('.drawer-body')?.scrollTop || 0;
      this.activeDrawer.replaceWith(createSummaryDrawer(state, this));
      this.activeDrawer = document.querySelector('#claim-drawer');
      this.activeDrawer.querySelector('.drawer-body').scrollTop = scrollTop;
    }

    if (patch.route) window.scrollTo({ top: 0, behavior: 'smooth' });
    this.initialiseCanvas();
  }

  initialiseCanvas() {
    const canvas = document.getElementById('relief-canvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let particles = [];
    let visible = true;
    let running = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * ratio);
      canvas.height = Math.max(1, rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: reducedMotion ? 12 : 36 }, () => ({
        x: Math.random() * rect.width, y: Math.random() * rect.height,
        radius: 1 + Math.random() * 2.6, speed: 0.25 + Math.random() * 0.85, hue: Math.random()
      }));
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);
      context.strokeStyle = 'rgba(255,255,255,.15)';
      context.lineWidth = 1;
      for (let x = 0; x < rect.width; x += 30) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, rect.height); context.stroke();
      }
      for (const particle of particles) {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = particle.hue > 0.5 ? 'rgba(99,179,237,.85)' : 'rgba(52,211,153,.85)';
        context.fill();
        if (!reducedMotion) {
          particle.x += particle.speed;
          particle.y += Math.sin(particle.x / 42) * 0.4;
          if (particle.x > rect.width + 10) particle.x = -10;
        }
      }
      if (visible && !document.hidden && !reducedMotion) this.canvasAnimationId = requestAnimationFrame(draw);
      else running = false;
    };

    const start = () => { if (!running) { running = true; this.canvasAnimationId = requestAnimationFrame(draw); } };
    resize();
    this.canvasObserver?.disconnect();
    this.canvasObserver = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) start();
    }, { threshold: 0.05 });
    this.canvasObserver.observe(canvas);
    new ResizeObserver(debounce(resize, 120)).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    start();
  }

  initialiseSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    this.signatureContext = context;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    context.scale(ratio, ratio);
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.strokeStyle = 'oklch(20% 0.04 255)';

    const position = event => {
      const bounds = canvas.getBoundingClientRect();
      const pointer = event.touches?.[0] || event;
      return { x: pointer.clientX - bounds.left, y: pointer.clientY - bounds.top };
    };
    const begin = event => { this.isDrawing = true; const point = position(event); context.beginPath(); context.moveTo(point.x, point.y); };
    const move = event => {
      if (!this.isDrawing) return;
      event.preventDefault();
      const point = position(event);
      context.lineTo(point.x, point.y);
      context.stroke();
      this.model.setSignature(canvas.toDataURL('image/png'));
    };
    const end = () => { this.isDrawing = false; };
    canvas.addEventListener('pointerdown', begin);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointerleave', end);
  }
}

/* === INITIALIZATION === */
const taxModel = new TaxRebateModel();
const taxView = { /* Pure component factories are defined above. */ };
const taxController = new TaxRebateController(taxModel, taxView);
taxController.init();
