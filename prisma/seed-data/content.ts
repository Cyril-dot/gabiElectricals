// GabiElectricals seed — services, people, orders, bookings, content, promos.

export const SERVICES = [
  { slug: 'house-wiring', name: 'House Wiring & Rewiring', base: 1500, dur: 480, desc: 'Full new-build wiring or rewire of older homes to Ghana Electricity regulations — certified design, pure copper only, tested before energising.', includes: ['Circuit design & load schedule', 'Pure copper Folded/Eastern cable', 'RCBO protection on every zone', 'Test certificate & as-built diagram'] },
  { slug: 'fault-finding', name: 'Fault Finding & Repair', base: 350, dur: 120, desc: 'Dead circuit, intermittent trip, burnt socket — our testers trace it fast with insulation resistance and clamp diagnostics, then fix it properly.', includes: ['Systematic circuit testing', 'Same-day repair where possible', 'Written fault report'] },
  { slug: 'socket-install', name: 'Socket, Switch & Light Installation', base: 250, dur: 90, desc: 'Add sockets, move switches, hang chandeliers, replace faceplates — neat, shuttered, correctly fused work.', includes: ['Isolate & test before close', 'Genuine MK/Genesis parts', '12-month workmanship warranty'] },
  { slug: 'db-upgrade', name: 'Distribution Board Upgrade', base: 850, dur: 240, desc: 'Replace fuse-wire era boards with a proper consumer unit: MCBs per circuit, RCBO protection, labelled and photographed.', includes: ['Schneider/ABB protection', 'Copper busbar board', 'Circuit labels + schedule'] },
  { slug: 'gen-inverter-install', name: 'Generator & Inverter Installation', base: 1200, dur: 300, desc: 'Generator changeover, inverter + battery rooms, earthing and bonding done to code — no back-feed risk to ECG lines.', includes: ['Double-throw changeover', 'Sized battery bank', 'Earthing & bonding'] },
  { slug: 'solar-install', name: 'Solar Installation', base: 4500, dur: 480, desc: 'Grid-assist or full-off-grid solar: roof survey, mounting, DC cabling, inverter commissioning and monitoring app setup.', includes: ['Production estimate for your roof', 'Tier-A panels, MPPT', '5-yr workmanship warranty'] },
  { slug: 'cctv-install', name: 'CCTV & Security Installation', base: 1800, dur: 240, desc: '4–16 camera DVR/NVR installs with phone viewing, cabling in conduit, and access control or alarms if you need them.', includes: ['Night-vision camera layout', '1TB recording minimum', 'Phone viewing setup'] },
  { slug: 'safety-inspection', name: 'Safety Inspection & Certification', base: 600, dur: 180, desc: 'Landlords, facilities managers and buyers: full inspection with insulation, polarity and RCD tests plus a signed certificate.', includes: ['22-point electrical check', 'Pass/fail certificate', 'Remedial quote if needed'] },
  { slug: 'prepaid-meter', name: 'Prepaid Meter Installation & Relocation', base: 750, dur: 180, desc: 'ECG-standard meter tails, lockable cabinets and relocation work done to utility requirements.', includes: ['Compliant meter box', '60A isolator & earth', 'Load-limit tuning'] },
  { slug: 'emergency-callout', name: 'Emergency 24/7 Call-Out', base: 450, dur: 60, desc: 'Sparking board, total power loss, burnt feeder — an emergency electrician rolls within the hour across Greater Accra.', includes: ['<60 min response in Accra', 'Safe isolation first', 'Same-visit repair when possible'] },
  { slug: 'commercial-work', name: 'Commercial & Industrial Work', base: 3500, dur: 480, desc: 'Three-phase distribution, lighting for warehouses, retail fit-outs and plant connections with shutdown planning.', includes: ['3-phase design', 'Out-of-hours work', 'Compliance documentation'] },
  { slug: 'estate-contracts', name: 'Estate Electrical Contracts', base: 12000, dur: 960, desc: 'Multi-unit rollouts for estates and developers: standardised boards, metering, common-area lighting and snags.', includes: ['Dedicated crew + supervisor', 'Rate-card pricing per unit', 'Programme-based delivery'] },
];

export const URGENCY = { STANDARD: 0, URGENT: 15, EMERGENCY: 40 }; // % surcharge

export const TECHNICIANS = [
  { name: 'Kwame Mensah', spec: ['House wiring', 'DB upgrades'], regions: ['Greater Accra'], bio: '18 years on Accra sites. NIET-certified, leads the rewiring crew.' },
  { name: 'Yaw Boateng', spec: ['Solar', 'Inverters'], regions: ['Greater Accra', 'Kumasi'], bio: 'PV specialist — 200+ roofs commissioned, Growatt & Victron trained.' },
  { name: 'Kojo Asante', spec: ['CCTV', 'Smart home'], regions: ['Greater Accra', 'Takoradi'], bio: 'Low-voltage systems; builds tidy conduit runs and phone-viewing setups.' },
  { name: 'Nana Adjei', spec: ['Fault finding', 'Emergency'], regions: ['Greater Accra'], bio: 'Our night-call responder; 12 years industrial fault diagnosis.' },
  { name: 'Ibrahim Fuseini', spec: ['Commercial', '3-phase'], regions: ['Greater Accra', 'Tamale'], bio: 'Substation-adjacent experience; handles estates and warehouses.' },
  { name: 'Emmanuel Tetteh', spec: ['Prepaid meters', 'DB upgrades'], regions: ['Greater Accra', 'Kasoa'], bio: 'Ex-ECG contractor; knows utility compliance cold.' },
  { name: 'Selorm Agbeko', spec: ['Solar', 'Batteries'], regions: ['Kumasi', 'Cape Coast'], bio: 'Off-grid specialist for clinics and schools up country.' },
  { name: 'Daniel Otoo', spec: ['House wiring', 'CCTV'], regions: ['Greater Accra', 'Tema'], bio: 'Tema industrial-area veteran; neat, on-time, safety-first.' },
];

export const CUSTOMERS = [
  'Kofi Owusu', 'Ama Serwaa', 'Yaw Darko', 'Akosua Frimpong', 'Kwesi Appiah', 'Abena Owusu-Ansah', 'Kojo Antwi', 'Efua Mensimah', 'Fiifi Eshun', 'Adjoa Arthur', 'Nii Ayi Tetteh', 'Dede Larbi', 'Selorm Kudjo', 'Mawuena Dzidza', 'Kwabena Sarpong', 'Ayeley Aggor', 'Ernest Addo', 'Grace Amoah', 'Isaac Quartey', 'Comfort Nartey', 'Prince Amoako', 'Vida Yeboah', 'Samuel Laryea', 'Nadia Issah', 'Theophilus Nkrumah', 'Ruth Asibey', 'Godfred Acheampong', 'Priscilla Ankrah', 'Raymond Arko', 'Josephine Lamptey',
];

export const REGIONS_CITIES: Record<string, string[]> = {
  'Greater Accra': ['Accra', 'Tema', 'Madina', 'Kasoa', 'Spintex', 'East Legon', 'Adenta', 'Achimota', 'Lashon'],
  'Ashanti': ['Kumasi'],
  'Western': ['Takoradi'],
  'Northern': ['Tamale'],
  'Central': ['Cape Coast'],
};

export const COUPONS = [
  { code: 'WELCOME10', type: 'PERCENT' as const, value: 10, minSpend: 200, firstOrderOnly: true, desc: '10% off first order' },
  { code: 'FLASH50', type: 'FIXED' as const, value: 50, minSpend: 800, desc: '₵50 off orders over ₵800' },
  { code: 'FREESHIP', type: 'FREE_DELIVERY' as const, value: 0, minSpend: 500, desc: 'Free delivery in Greater Accra over ₵500' },
  { code: 'EASTER26', type: 'PERCENT' as const, value: 15, minSpend: 300, usageLimit: 200, desc: 'Seasonal 15% promo' },
  { code: 'REF20', type: 'FIXED' as const, value: 20, minSpend: 150, referralOnly: true, desc: '₵20 friend-of-a-friend credit' },
  { code: 'CABLES99', type: 'PERCENT' as const, value: 8, minSpend: 0, desc: '8% off cables & wires', cat: 'cables-wires' },
];

export const POPUPS = [
  { name: 'Welcome ₵50', kind: 'WELCOME', headline: 'First order? Take ₵50 off.', body: 'Spend ₵500+ on genuine cables, breakers or lighting and save ₵50 with code POWER50. Premium gear, real savings.', button: 'Claim ₵50', coupon: 'FLASH50', bg: '#0B1B3A', target: 6, priority: 10, active: true, freq: 'WEEK' },
  { name: 'Exit-intent Solar', kind: 'EXIT', headline: 'Before you go — dumsor-proof your home', body: 'Book a free solar survey this month and get ₵200 off any installation over ₵10,000.', button: 'Book free survey', href: '/services/solar-install', bg: '#0A5CFF', target: 0, priority: 9, active: true, freq: 'DAY' },
  { name: 'Book a Service', kind: 'TIMED', headline: 'Certified electricians, same-day in Accra', body: 'From ₵250 — sockets, lights, DB upgrades and fault finding by NIET-certified techs.', button: 'Book now', href: '/book', whatsapp: true, bg: '#0B1B3A', target: 15, priority: 5, active: true, freq: 'WEEK' },
  { name: 'Flash Deal Banner', kind: 'SCROLL', headline: '⚡ 48-Hour Flash Sale', body: 'Up to 20% off panels, inverters and surge protection. Countdown is live on the Deals page.', button: 'Shop deals', href: '/deals', bg: '#FFB020', text: '#0B1B3A', accent: '#0A5CFF', target: 55, priority: 7, active: true, freq: 'WEEK' },
];

export const HERO_SLIDES = [
  { headline: 'Premium Power. Trusted Safety.', sub: 'Genuine cables, breakers and solar — delivered same-day across Accra by electricians who put their name on every connection.', cta: 'Shop the catalog', href: '/shop', cta2: 'Book an electrician', href2: '/book', image: '/images/hero/hero-wiring.webp', badge: '100% Genuine guarantee' },
  { headline: 'Beat Dumsor. Own Your Power.', sub: 'Inverters, tubular and lithium banks, and turnkey solar — sized honestly by engineers, installed to code.', cta: 'Explore backup power', href: '/shop?cat=solar-inverters', cta2: 'Load calculator', href2: '/tools/load-calculator', image: '/images/hero/hero-solar.webp', badge: 'Free load assessment' },
  { headline: 'Certified Electricians, On Demand.', sub: 'Fault finding at ₵350, rewires, DB upgrades and 24/7 emergency call-outs across Greater Accra, Kumasi and Takoradi.', cta: 'Book a service', href: '/book', cta2: 'See services', href2: '/services', image: '/images/hero/hero-technician.webp', badge: 'Same-day slots available' },
];

export const TESTIMONIALS = [
  { name: 'Nana Adwoa Darku', role: 'Homeowner, East Legon', quote: 'They rewired our 4-bedroom in 9 days — labelled board, test certificates, site left spotless. The premium price was worth every pesewa.', rating: 5, area: 'Accra' },
  { name: 'Kwabena O.', role: 'Facilities Manager, Tema', quote: 'We bought 30 Folded Cable rolls and a Schneider board. Serial-verified genuine, delivered same-day. No more Makola roulette.', rating: 5, area: 'Tema' },
  { name: 'Dr. Mensah', role: 'Clinic owner, Kumasi', quote: 'The 10kVA generator + changeover keeps our cold chain alive through every outage. Ibrahim’s team commissioned it in one day.', rating: 5, area: 'Kumasi' },
  { name: 'Ayeley R.', role: 'Landlord, Spintex', quote: 'Safety inspection found two bypass attempts across my units. The certificate saved me an insurance argument later.', rating: 5, area: 'Spintex' },
  { name: 'Fiifi B.', role: 'Contractor, Kasoa', quote: 'Their contractor pricing and referral wallet pay my site foreman’s bonuses. Genuine stock, honest lead times.', rating: 4, area: 'Kasoa' },
  { name: 'Selorm K.', role: 'Solar customer, Madina', quote: '5kVA hybrid + lithium: 6 hours of TV, fans and fridge through total ECG darkness, charged back by noon sun.', rating: 5, area: 'Madina' },
];

export const FAQS = [
  { q: 'Are your cables really 100% pure copper?', a: 'Yes. Every roll of Folded Cable, Eastern Electric and Nexans we sell carries its serial and certification — we buy from authorised channels only and you can verify with the manufacturer. Counterfeit CCA “cables” are a fire risk; we refuse to stock them.', cat: 'Shop' },
  { q: 'How fast is delivery in Accra?', a: 'Order before 2pm for Same-Day Delivery in Accra, Tema, Spintex, Madina and Adenta. Other zones: 1–3 days. Kasoa and Obetsebi-Komenda typically next morning.', cat: 'Delivery' },
  { q: 'What payment methods do you accept?', a: 'MTN MoMo, Telecel Cash, AT Money, Visa/Mastercard (secure hosted checkout), bank transfer / GhIPSS, QR code payment, and pay-on-delivery where enabled. Card details are never stored on our servers.', cat: 'Payments' },
  { q: 'Do you offer installation with products?', a: 'Yes — add professional installation to eligible products at checkout, or book any of our 12 certified services. All install work carries a 12-month workmanship warranty.', cat: 'Services' },
  { q: 'What is your return & warranty policy?', a: 'Unopened items in original condition can be returned within 14 days for store credit or exchange. Manufacturer warranties (6 months–25 years depending on item) are honoured through us with your invoice as proof.', cat: 'Shop' },
  { q: 'Can you handle estate or contractor projects?', a: 'Absolutely. We run estate electrical contracts with dedicated crews, per-unit rate cards, and contractor pricing. Use the wholesale/contractor form and we respond within one business day.', cat: 'Services' },
  { q: 'How does the referral program work?', a: 'Share your link /r/YOURCODE. A friend gets ₵20 off their first order; you earn ₵20 wallet credit once their order ships (min ₵150 order). Credit works at checkout or withdraws to MoMo above ₵100.', cat: 'General' },
  { q: 'Are your electricians certified?', a: 'All technicians hold NIET/EAB certification and undergo background checks. You see your technician’s name and photo when a booking is confirmed.', cat: 'Services' },
];

export const BLOG_POSTS = [
  { slug: 'dumsor-preparedness-2026', title: 'Dumsor Preparedness 2026: Sizing Backup Power That Actually Lasts', excerpt: 'How to calculate what your home truly needs — from emergency bulbs to a full inverter room — without overpaying.', tags: ['backup power', 'dumsor'], read: 7 },
  { slug: 'fake-cables-fire-risk', title: 'Fake Cables in Ghana: How to Spot Counterfeit Wire Before It Burns Your Home', excerpt: 'CCA vs pure copper, weight tests, serial checks, and the three tricks fake cable sellers use at market stalls.', tags: ['safety', 'cables'], read: 6 },
  { slug: 'solar-for-ghanaian-homes', title: 'Solar for Ghanaian Homes: Real Numbers on Roofs in Accra and Kumasi', excerpt: 'Panel orientation, harmattan dust, salt air on the coast — what 5kVA of solar actually generates here, monthly.', tags: ['solar'], read: 9 },
  { slug: 'rcbo-explained', title: 'Why One ₵415 RCBO Can Save Your Family: Earth-Fault Protection Explained', excerpt: 'Fuse wires and plain MCBs protect cables, not people. Here is the upgrade every Ghanaian board needs.', tags: ['safety', 'breakers'], read: 5 },
  { slug: 'inverter-battery-guide', title: 'Tubular vs Gel vs Lithium: Choosing Inverter Batteries in Ghana’s Heat', excerpt: 'Cycle life, water topping, true cost per kWh over five years — an honest comparison for Ghanaian temperatures.', tags: ['backup power'], read: 8 },
  { slug: 'prepaid-meter-tokens', title: 'Prepaid Meter Basics: Tokens, Keypads and What to Do When Yours Dies', excerpt: 'Dead keypad panic, low-credit beeps, relocation rules — a practical guide for ECG prepaid customers.', tags: ['prepaid'], read: 4 },
  { slug: 'rewiring-old-house', title: 'Rewiring a 30-Year-Old House in Adenta: What Certified Electricians Look For', excerpt: 'Aluminium-era wiring, missing earths, fuse-wire boards — the inspection list before your rewire quote.', tags: ['wiring'], read: 6 },
  { slug: 'smart-home-on-a-budget', title: 'Build a Smart Home in Accra for Under ₵1,500 — WiFi Switches First', excerpt: 'Start with lighting: retrofit switches, occupancy sensors and a smart plug that meters your fridge.', tags: ['smart home'], read: 5 },
];
