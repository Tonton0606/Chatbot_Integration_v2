import { useMemo, useState } from "react";

import {
  GAP_META,
  LeadGenBulkActionBar,
  LeadGenDetailDrawer,
  LeadGenIntelligenceBanner,
  LeadGenKPIGrid,
  LeadGenResultsTable,
  LeadGenSearchBuilder,
  LeadGenToastStack,
  LeadScoreDistribution,
  OutreachFunnel,
  SavedSearches,
} from "../../components/admin/layout/Admin_LeadGenerator_Components.jsx";

/* ============================================================
   MOCK DATA — 60+ PH businesses across multiple industries
   --------------------------------------------------------------
   Generated to vary across digital gaps: missing website/phone/
   email/hours, low reviews, poor ratings. Score is computed from
   gaps. Tier (hot/warm/cold) is derived from score.
============================================================ */

const INDUSTRIES = [
  "Roofing Contractors", "Dental Clinics", "Restaurants", "Real Estate Brokers",
  "Salons & Spas", "Auto Repair Shops", "Law Firms", "Gyms & Fitness Centers",
  "Pet Clinics", "Coffee Shops", "Bakeries", "Plumbers", "Electricians",
  "Photographers", "Event Venues", "Insurance Brokers", "Printing Services",
  "Laundromats", "Travel Agencies", "Car Dealerships",
];

const CITIES = [
  "Quezon City", "Makati", "BGC, Taguig", "Pasig", "Manila", "Mandaluyong",
  "San Juan", "Pasay", "Parañaque", "Las Piñas", "Marikina", "Caloocan",
  "Antipolo", "Cainta", "Muntinlupa",
];

const STREETS = [
  "Aurora Blvd", "EDSA Ave", "Ortigas Ave", "Shaw Blvd", "Roxas Blvd",
  "Commonwealth Ave", "Marcos Highway", "Katipunan Ave", "Quezon Ave",
  "Taft Ave", "Ayala Ave", "C5 Road", "Mindanao Ave", "España Blvd",
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randPhone() {
  return `+63 9${Math.floor(10 + Math.random() * 90)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`;
}

function computeScore(lead) {
  let score = 0;
  const gaps = [];
  if (!lead.website) { score += 30; gaps.push("no_website"); }
  if (!lead.phone)   { score += 20; gaps.push("no_phone"); }
  if (!lead.email)   { score += 10; gaps.push("no_email"); }
  if (!lead.hasHours){ score += 15; gaps.push("no_hours"); }
  if ((lead.reviews ?? 0) < 10) { score += 15; gaps.push("low_reviews"); }
  if ((lead.rating ?? 5) < 3.5) { score += 15; gaps.push("poor_rating"); }
  if (!lead.socials?.facebook && !lead.socials?.instagram) { score += 10; gaps.push("no_social"); }
  return { score: Math.min(100, score), gaps };
}

function classifyTier(score) {
  if (score >= 60) return "hot";
  if (score >= 30) return "warm";
  return "cold";
}

function makeLead({ id, name, category, city, rating, reviews, website, phone, email, hasHours, fb, ig }) {
  const base = {
    id,
    name,
    category,
    city,
    address: `${Math.floor(100 + Math.random() * 900)} ${rand(STREETS)}, ${city}`,
    rating: rating ?? null,
    reviews: reviews ?? 0,
    website: website || null,
    phone: phone || null,
    email: email || null,
    hasHours: hasHours !== false,
    socials: {
      facebook: fb ? `https://facebook.com/${fb}` : null,
      instagram: ig ? `https://instagram.com/${ig}` : null,
    },
    status: "new",
    lastScraped: "2026-05-20",
  };
  const { score, gaps } = computeScore(base);
  return { ...base, score, gaps, tier: classifyTier(score) };
}

const RAW_LEADS = [
  // Roofing — high-gap targets
  { name: "Acme Roofing Specialists",   category: "Roofing Contractors", city: "Quezon City", rating: 4.6, reviews: 124, website: "https://acmeroofing.ph", phone: randPhone(), email: "hello@acmeroofing.ph", fb: "acmeroofing", ig: "acmeroofing.ph" },
  { name: "Reliable Roofers PH",        category: "Roofing Contractors", city: "Caloocan",    rating: 3.2, reviews: 8,   website: null,                       phone: randPhone(), email: null, hasHours: false, fb: "reliableroofersph" },
  { name: "TopShield Roofing & Gutter", category: "Roofing Contractors", city: "Marikina",    rating: 4.0, reviews: 47,  website: "https://topshield.ph",     phone: randPhone(), email: "info@topshield.ph", fb: "topshield" },
  { name: "JR Roof Repair Manila",      category: "Roofing Contractors", city: "Manila",      rating: 2.8, reviews: 3,   website: null,                       phone: null,        email: null, hasHours: false },
  { name: "Pinoy Yero Pros",            category: "Roofing Contractors", city: "Antipolo",    rating: 3.5, reviews: 18,  website: null,                       phone: randPhone(), email: null, fb: "pinoyyeropros" },

  // Dental — varied
  { name: "BrightSmile Dental Clinic",       category: "Dental Clinics", city: "Makati",       rating: 4.8, reviews: 312, website: "https://brightsmile.ph",  phone: randPhone(), email: "appt@brightsmile.ph", fb: "brightsmile", ig: "brightsmile_dental" },
  { name: "Quezon Family Dental",            category: "Dental Clinics", city: "Quezon City",  rating: 4.2, reviews: 88,  website: "https://qfamilydental.com", phone: randPhone(), email: null, fb: "qfamilydental" },
  { name: "Pearl Dental & Ortho",            category: "Dental Clinics", city: "Pasig",        rating: 4.5, reviews: 156, website: "https://pearldental.ph",  phone: randPhone(), email: "hi@pearldental.ph", fb: "pearldental.ph", ig: "pearldental" },
  { name: "Dr. Cruz Dental Office",          category: "Dental Clinics", city: "San Juan",     rating: 3.0, reviews: 6,   website: null,                       phone: randPhone(), email: null, hasHours: false },
  { name: "AffordaDental Marikina",          category: "Dental Clinics", city: "Marikina",     rating: 3.8, reviews: 22,  website: null,                       phone: randPhone(), email: null, fb: "affordadental" },
  { name: "PerfectBite Dental Studio",       category: "Dental Clinics", city: "BGC, Taguig",  rating: 4.9, reviews: 421, website: "https://perfectbite.ph",  phone: randPhone(), email: "care@perfectbite.ph", fb: "perfectbite", ig: "perfectbite.ph" },

  // Restaurants
  { name: "Lola Maria's Carinderia",         category: "Restaurants", city: "Manila",      rating: 4.3, reviews: 78,  website: null,                       phone: null,        email: null, hasHours: false, fb: "lolamarias" },
  { name: "Sisig King Pasig",                 category: "Restaurants", city: "Pasig",       rating: 4.6, reviews: 245, website: "https://sisigking.ph",     phone: randPhone(), email: "orders@sisigking.ph", fb: "sisigking", ig: "sisigking.ph" },
  { name: "Inihaw Republic",                  category: "Restaurants", city: "Quezon City", rating: 4.1, reviews: 132, website: null,                       phone: randPhone(), email: null, fb: "inihawrepublic" },
  { name: "Tito Bert's Lechon Manok",        category: "Restaurants", city: "Caloocan",    rating: 3.9, reviews: 41,  website: null,                       phone: randPhone(), email: null, hasHours: false },
  { name: "Asado House Makati",               category: "Restaurants", city: "Makati",      rating: 4.7, reviews: 567, website: "https://asadohouse.ph",    phone: randPhone(), email: "reservations@asadohouse.ph", fb: "asadohousemkti", ig: "asado_house" },
  { name: "Aling Nene's Tapsihan",           category: "Restaurants", city: "Las Piñas",    rating: 4.0, reviews: 9,   website: null,                       phone: null,        email: null, hasHours: false },

  // Real Estate
  { name: "Metro Manila Properties",          category: "Real Estate Brokers", city: "BGC, Taguig", rating: 4.4, reviews: 89,  website: "https://mmproperties.ph",  phone: randPhone(), email: "info@mmproperties.ph", fb: "mmproperties.ph", ig: "mmproperties" },
  { name: "Jaime Realty Co.",                 category: "Real Estate Brokers", city: "Makati",      rating: 3.5, reviews: 17,  website: null,                        phone: randPhone(), email: null, fb: "jaimerealty" },
  { name: "Ortigas Lot Specialists",          category: "Real Estate Brokers", city: "Pasig",       rating: 4.0, reviews: 32,  website: "https://ortigaslots.com",   phone: randPhone(), email: null },
  { name: "Brgy Bahay Hunter PH",             category: "Real Estate Brokers", city: "Marikina",    rating: 2.4, reviews: 5,   website: null,                        phone: null,        email: null, hasHours: false },

  // Salons & Spas
  { name: "Glow Beauty Salon BGC",            category: "Salons & Spas", city: "BGC, Taguig", rating: 4.8, reviews: 412, website: "https://glowbeauty.ph",  phone: randPhone(), email: "book@glowbeauty.ph", fb: "glowbeauty", ig: "glowbeauty.bgc" },
  { name: "Soothe Wellness Spa",              category: "Salons & Spas", city: "Makati",      rating: 4.6, reviews: 287, website: "https://soothespa.ph",   phone: randPhone(), email: "spa@soothespa.ph", fb: "soothespaph", ig: "soothespa" },
  { name: "Maria's Hair Studio",              category: "Salons & Spas", city: "Quezon City", rating: 3.7, reviews: 14,  website: null,                      phone: randPhone(), email: null, fb: "mariashairstudio" },
  { name: "Posh Nails Pasig",                 category: "Salons & Spas", city: "Pasig",       rating: 4.2, reviews: 76,  website: null,                      phone: randPhone(), email: null, ig: "poshnails.pasig" },

  // Auto Repair
  { name: "Manong Auto Repair Shop",          category: "Auto Repair Shops", city: "Caloocan",    rating: 4.5, reviews: 91,  website: null,                       phone: randPhone(), email: null, fb: "manongauto" },
  { name: "Speedy Lube & Wash",               category: "Auto Repair Shops", city: "Quezon City", rating: 3.9, reviews: 34,  website: null,                       phone: randPhone(), email: null },
  { name: "AutoMechanics PH",                 category: "Auto Repair Shops", city: "Pasig",       rating: 4.3, reviews: 142, website: "https://automechanics.ph", phone: randPhone(), email: "service@automechanics.ph", fb: "automechanics.ph" },
  { name: "Carlo's Tire & Alignment",         category: "Auto Repair Shops", city: "Marikina",    rating: 2.9, reviews: 4,   website: null,                       phone: null,        email: null, hasHours: false },

  // Law Firms
  { name: "Reyes & Cruz Law Office",          category: "Law Firms", city: "Makati",      rating: 4.7, reviews: 56,  website: "https://reyescruzlaw.ph",  phone: randPhone(), email: "info@reyescruzlaw.ph", fb: "reyescruzlaw" },
  { name: "Atty. Santos Legal Consultancy",   category: "Law Firms", city: "Quezon City", rating: 4.0, reviews: 11,  website: null,                       phone: randPhone(), email: null },
  { name: "Bayanihan Law Group",              category: "Law Firms", city: "Manila",      rating: 4.5, reviews: 38,  website: "https://bayanihanlaw.ph",  phone: randPhone(), email: "hello@bayanihanlaw.ph", fb: "bayanihanlaw", ig: "bayanihanlawph" },

  // Gyms
  { name: "Pulse Fitness BGC",                category: "Gyms & Fitness Centers", city: "BGC, Taguig", rating: 4.8, reviews: 521, website: "https://pulsefitness.ph", phone: randPhone(), email: "membership@pulsefitness.ph", fb: "pulsefitness", ig: "pulse_bgc" },
  { name: "Iron Manila Gym",                  category: "Gyms & Fitness Centers", city: "Manila",      rating: 4.3, reviews: 187, website: "https://ironmanila.ph",   phone: randPhone(), email: "info@ironmanila.ph", fb: "ironmanila" },
  { name: "FitClub Pasig",                    category: "Gyms & Fitness Centers", city: "Pasig",       rating: 3.7, reviews: 22,  website: null,                       phone: randPhone(), email: null, fb: "fitclubpasig" },
  { name: "Boxing Brothers QC",               category: "Gyms & Fitness Centers", city: "Quezon City", rating: 4.6, reviews: 98,  website: null,                       phone: randPhone(), email: null, ig: "boxingbros_qc" },

  // Pet Clinics
  { name: "Tail Waggers Pet Clinic",          category: "Pet Clinics", city: "Quezon City", rating: 4.9, reviews: 287, website: "https://tailwaggers.ph",  phone: randPhone(), email: "care@tailwaggers.ph", fb: "tailwaggersph", ig: "tailwaggers" },
  { name: "Dr. Lim Veterinary Clinic",        category: "Pet Clinics", city: "Makati",      rating: 4.5, reviews: 91,  website: null,                       phone: randPhone(), email: null },
  { name: "Furry Friends Vet",                category: "Pet Clinics", city: "Pasig",       rating: 3.8, reviews: 19,  website: null,                       phone: randPhone(), email: null, hasHours: false, fb: "furryfriendsvet" },

  // Coffee Shops
  { name: "Brew Lab Manila",                  category: "Coffee Shops", city: "Manila",      rating: 4.7, reviews: 234, website: "https://brewlab.ph",      phone: randPhone(), email: "hello@brewlab.ph", fb: "brewlabph", ig: "brewlab.manila" },
  { name: "Café Linda's",                     category: "Coffee Shops", city: "San Juan",    rating: 4.4, reviews: 67,  website: null,                       phone: randPhone(), email: null, ig: "cafelindas" },
  { name: "Latte House Antipolo",             category: "Coffee Shops", city: "Antipolo",    rating: 4.0, reviews: 28,  website: null,                       phone: randPhone(), email: null },
  { name: "Beans & Books QC",                 category: "Coffee Shops", city: "Quezon City", rating: 4.6, reviews: 144, website: "https://beansandbooks.ph", phone: randPhone(), email: "ciao@beansandbooks.ph", fb: "beansandbooks", ig: "beansandbooks.ph" },

  // Bakeries
  { name: "Pan de Sal Origins",               category: "Bakeries", city: "Manila",      rating: 4.8, reviews: 312, website: "https://pandesalorigins.ph", phone: randPhone(), email: "wholesale@pandesalorigins.ph", fb: "pandesalorigins", ig: "pandesalorigins" },
  { name: "Mama's Cakes & Pastries",          category: "Bakeries", city: "Pasig",       rating: 3.9, reviews: 41,  website: null,                          phone: randPhone(), email: null, fb: "mamascakes.pasig" },
  { name: "Hot Pandesal QC",                  category: "Bakeries", city: "Quezon City", rating: 3.5, reviews: 12,  website: null,                          phone: null,        email: null, hasHours: false },

  // Plumbers
  { name: "Reliable Plumbing Manila",         category: "Plumbers", city: "Manila",      rating: 4.3, reviews: 58,  website: null,                       phone: randPhone(), email: null, fb: "reliableplumbing" },
  { name: "AquaFix PH",                       category: "Plumbers", city: "Quezon City", rating: 4.0, reviews: 23,  website: "https://aquafix.ph",       phone: randPhone(), email: "info@aquafix.ph", fb: "aquafix" },
  { name: "Mang Tony's Plumbing",             category: "Plumbers", city: "Caloocan",    rating: 3.2, reviews: 7,   website: null,                       phone: null,        email: null, hasHours: false },

  // Electricians
  { name: "Spark Electrical Services",        category: "Electricians", city: "Pasig",       rating: 4.5, reviews: 71,  website: "https://sparkelec.ph",  phone: randPhone(), email: "service@sparkelec.ph", fb: "sparkelec" },
  { name: "Ace Electrical Marikina",          category: "Electricians", city: "Marikina",    rating: 3.8, reviews: 19,  website: null,                     phone: randPhone(), email: null },
  { name: "Reliable Volt PH",                 category: "Electricians", city: "Quezon City", rating: 4.2, reviews: 34,  website: null,                     phone: randPhone(), email: null, fb: "reliablevoltph" },

  // Photographers
  { name: "Wedding Tales Photography",        category: "Photographers", city: "Makati",      rating: 4.9, reviews: 187, website: "https://weddingtales.ph", phone: randPhone(), email: "book@weddingtales.ph", fb: "weddingtales", ig: "weddingtales.ph" },
  { name: "Frames & Stories Studio",          category: "Photographers", city: "BGC, Taguig", rating: 4.7, reviews: 142, website: "https://framesandstories.ph", phone: randPhone(), email: "hello@framesandstories.ph", ig: "framesandstories" },
  { name: "Click PH Photography",             category: "Photographers", city: "Quezon City", rating: 3.6, reviews: 11,  website: null,                       phone: randPhone(), email: null, ig: "clickphoto.ph" },

  // Event Venues
  { name: "The Pavilion Pasig",               category: "Event Venues", city: "Pasig",   rating: 4.6, reviews: 89,  website: "https://pavilionpasig.ph", phone: randPhone(), email: "events@pavilionpasig.ph", fb: "pavilionpasig" },
  { name: "Grand Ballroom Manila",            category: "Event Venues", city: "Manila",  rating: 4.4, reviews: 67,  website: "https://grandballroom.ph", phone: randPhone(), email: "book@grandballroom.ph", fb: "grandballroom.mnl", ig: "grandballroom" },
  { name: "Garden Cove Antipolo",             category: "Event Venues", city: "Antipolo",rating: 4.2, reviews: 34,  website: null,                       phone: randPhone(), email: null, fb: "gardencove.antipolo" },

  // Insurance, Printing, Laundry, Travel, Car dealer
  { name: "Bayan Insurance Brokers",          category: "Insurance Brokers", city: "Makati",      rating: 4.3, reviews: 48,  website: "https://bayaninsurance.ph", phone: randPhone(), email: "hello@bayaninsurance.ph", fb: "bayaninsurance" },
  { name: "QuickPrint Express",               category: "Printing Services", city: "Quezon City", rating: 4.0, reviews: 38,  website: null,                          phone: randPhone(), email: null },
  { name: "Sparkle Laundromat",               category: "Laundromats",       city: "Marikina",    rating: 3.5, reviews: 16,  website: null,                          phone: randPhone(), email: null, hasHours: false },
  { name: "WanderPH Travel Agency",           category: "Travel Agencies",   city: "Pasig",       rating: 4.6, reviews: 91,  website: "https://wanderph.com",        phone: randPhone(), email: "trip@wanderph.com", fb: "wanderph", ig: "wanderph.travel" },
  { name: "Asian Motors BGC",                 category: "Car Dealerships",   city: "BGC, Taguig", rating: 4.4, reviews: 154, website: "https://asianmotors.ph",     phone: randPhone(), email: "sales@asianmotors.ph", fb: "asianmotors.ph" },
];

const MOCK_LEADS_FULL = RAW_LEADS.map((r, idx) => makeLead({ id: `lg-${String(idx + 1).padStart(3, "0")}`, ...r }));

const SAVED_SEARCHES = [
  { industry: "Roofing Contractors",   city: "Quezon City",  estimatedLeads: 28 },
  { industry: "Dental Clinics",        city: "Makati",       estimatedLeads: 45 },
  { industry: "Restaurants",           city: "Manila",       estimatedLeads: 67 },
  { industry: "Salons & Spas",         city: "BGC, Taguig",  estimatedLeads: 32 },
  { industry: "Real Estate Brokers",   city: "Pasig",        estimatedLeads: 24 },
];

const INSIGHTS = {
  theme: "Q2 outreach focus · No-website roofers in NCR",
  summary: "AI detected 23 high-gap roofing contractors in NCR with no website. Avg gap score = 67. Recommended pitch: bundled web + SEO at the PHP 35K tier.",
  suggestions: [
    { query: "Roofing contractors · Caloocan",    reason: "12 leads detected, 9 with no website" },
    { query: "Dental clinics · Marikina",          reason: "8 leads, 4 with low review count (rep mgmt)" },
    { query: "Restaurants · Las Piñas",            reason: "Avg gap 58, prime for booking system pitch" },
    { query: "Salons & Spas · San Juan",           reason: "High social engagement, missing booking site" },
  ],
};

/* ============================================================
   EXCEL EXPORT (uses exceljs, already installed)
============================================================ */
async function exportLeadsToExcel(leads, filename) {
  const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ExponifyPH Lead Generator";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Leads");

  sheet.columns = [
    { header: "Business Name",   key: "name",     width: 32 },
    { header: "Category",        key: "category", width: 22 },
    { header: "City",            key: "city",     width: 18 },
    { header: "Address",         key: "address",  width: 36 },
    { header: "Phone",           key: "phone",    width: 22 },
    { header: "Website",         key: "website",  width: 32 },
    { header: "Email",           key: "email",    width: 28 },
    { header: "Rating",          key: "rating",   width: 10 },
    { header: "Reviews",         key: "reviews",  width: 10 },
    { header: "Gap Score",       key: "score",    width: 12 },
    { header: "Tier",            key: "tier",     width: 10 },
    { header: "Status",          key: "status",   width: 14 },
    { header: "Gaps",            key: "gaps",     width: 40 },
    { header: "Facebook",        key: "facebook", width: 28 },
    { header: "Instagram",       key: "instagram",width: 28 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC9A84C" } };

  leads.forEach((l) => {
    sheet.addRow({
      name: l.name,
      category: l.category,
      city: l.city,
      address: l.address,
      phone: l.phone || "",
      website: l.website || "",
      email: l.email || "",
      rating: l.rating ?? "",
      reviews: l.reviews ?? 0,
      score: l.score,
      tier: l.tier,
      status: l.status,
      gaps: l.gaps.map((g) => GAP_META[g]?.label || g).join(", "),
      facebook: l.socials?.facebook || "",
      instagram: l.socials?.instagram || "",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ============================================================
   MAIN VIEW
============================================================ */
export default function AdminLeadGeneratorView({ onPushToPipeline, onPushBatchToPipeline }) {
  const [leads, setLeads] = useState(MOCK_LEADS_FULL);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);

  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [gapFilter, setGapFilter] = useState("all");
  const [isSearching, setIsSearching] = useState(false);

  const [tableSearch, setTableSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [toasts, setToasts] = useState([]);
  const pushToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts((arr) => [...arr, { id, ...toast }]);
    setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), 5000);
  };
  const dismissToast = (id) => setToasts((arr) => arr.filter((t) => t.id !== id));

  async function handleSearch() {
    setIsSearching(true);
    // Simulate API latency
    await new Promise((r) => setTimeout(r, 1400));
    setIsSearching(false);
    pushToast({
      kind: "success",
      title: "Search complete",
      description: `Filtered to "${industry || "all"}" in "${city || "all cities"}". (Mock data — wire Serper API later.)`,
    });
  }

  function applyPreset(preset) {
    setIndustry(preset.industry);
    setCity(preset.city);
    pushToast({
      kind: "success",
      title: "Preset applied",
      description: `${preset.industry} in ${preset.city}. Click Run Search to fetch.`,
    });
  }

  const filteredLeads = useMemo(() => {
    let result = leads;

    // Search builder filters
    if (industry.trim()) {
      const q = industry.toLowerCase();
      result = result.filter((l) => l.category.toLowerCase().includes(q));
    }
    if (city.trim()) {
      const q = city.toLowerCase();
      result = result.filter((l) => l.city.toLowerCase().includes(q));
    }
    if (minRating > 0) {
      result = result.filter((l) => (l.rating ?? 0) >= minRating);
    }
    if (gapFilter === "no_website")  result = result.filter((l) => !l.website);
    if (gapFilter === "has_website") result = result.filter((l) => !!l.website);
    if (gapFilter === "low_reviews") result = result.filter((l) => l.gaps.includes("low_reviews"));
    if (gapFilter === "no_phone")    result = result.filter((l) => !l.phone);

    // Table filters
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q)
      );
    }
    if (tierFilter !== "all")   result = result.filter((l) => l.tier === tierFilter);
    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);

    return result;
  }, [leads, industry, city, minRating, gapFilter, tableSearch, tierFilter, statusFilter]);

  function toggleSelect(id) {
    setSelectedIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  }

  function toggleSelectAll(newAllSelected) {
    if (newAllSelected) {
      setSelectedIds(filteredLeads.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function updateLeadStatus(id, status) {
    setLeads((arr) => arr.map((l) => (l.id === id ? { ...l, status } : l)));
    setSelectedLead((curr) => (curr && curr.id === id ? { ...curr, status } : curr));
  }

  function pushOne(lead) {
    if (lead.status !== "new") return;
    updateLeadStatus(lead.id, "in_pipeline");
    onPushToPipeline?.(lead);
    pushToast({
      kind: "success",
      title: "Pushed to Pipeline",
      description: `${lead.name} added to Leads Pipeline as a New lead.`,
    });
  }

  function pushSelectedBatch() {
    const toPush = leads.filter((l) => selectedIds.includes(l.id) && l.status === "new");
    if (toPush.length === 0) {
      pushToast({
        kind: "error",
        title: "Nothing to push",
        description: "Selected leads are already in the pipeline.",
      });
      return;
    }
    setLeads((arr) =>
      arr.map((l) => (selectedIds.includes(l.id) && l.status === "new" ? { ...l, status: "in_pipeline" } : l))
    );
    onPushBatchToPipeline?.(toPush);
    clearSelection();
    pushToast({
      kind: "success",
      title: `Pushed ${toPush.length} lead${toPush.length === 1 ? "" : "s"} to Pipeline`,
      description: "Switch to the Pipeline tab to see them as New leads.",
    });
  }

  function markContacted(lead) {
    if (lead.status === "new" || lead.status === "in_pipeline") {
      updateLeadStatus(lead.id, "contacted");
      pushToast({
        kind: "success",
        title: "Marked as contacted",
        description: `${lead.name} status updated.`,
      });
    }
  }

  async function exportSelected() {
    const targets = selectedIds.length > 0
      ? leads.filter((l) => selectedIds.includes(l.id))
      : filteredLeads;

    if (targets.length === 0) {
      pushToast({ kind: "error", title: "Nothing to export", description: "No leads available with current filters." });
      return;
    }

    try {
      const date = new Date().toISOString().slice(0, 10);
      const filename = `leads_${(industry || "all").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${(city || "all").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${date}.xlsx`;
      await exportLeadsToExcel(targets, filename);
      pushToast({
        kind: "success",
        title: "Excel file downloaded",
        description: `${targets.length} lead${targets.length === 1 ? "" : "s"} exported as ${filename}`,
      });
    } catch (err) {
      console.error(err);
      pushToast({ kind: "error", title: "Export failed", description: err.message });
    }
  }

  return (
    <div className="space-y-5 pb-12">
      <LeadGenIntelligenceBanner
        insights={{
          ...INSIGHTS,
          suggestions: INSIGHTS.suggestions.map((s) => ({
            ...s,
            onApply: () => {
              const [industryPart, cityPart] = s.query.split(" · ");
              setIndustry(industryPart || "");
              setCity(cityPart || "");
            },
          })),
        }}
      />

      <LeadGenSearchBuilder
        industry={industry}
        setIndustry={setIndustry}
        city={city}
        setCity={setCity}
        minRating={minRating}
        setMinRating={setMinRating}
        hasWebsiteFilter={gapFilter}
        setHasWebsiteFilter={setGapFilter}
        radius={radius}
        setRadius={setRadius}
        onSearch={handleSearch}
        isSearching={isSearching}
        industries={INDUSTRIES}
        cities={CITIES}
      />

      <SavedSearches presets={SAVED_SEARCHES} onApply={applyPreset} />

      <LeadGenKPIGrid leads={leads} />

      <LeadGenBulkActionBar
        selectedCount={selectedIds.length}
        onPush={pushSelectedBatch}
        onExport={exportSelected}
        onAddCampaign={() => {}}
        onClear={clearSelection}
      />

      <LeadGenResultsTable
        leads={filteredLeads}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onSelectLead={setSelectedLead}
        search={tableSearch}
        onSearchChange={setTableSearch}
        tierFilter={tierFilter}
        onTierFilterChange={setTierFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        totalCount={leads.length}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <LeadScoreDistribution leads={leads} />
        <OutreachFunnel leads={leads} />
      </div>

      {selectedLead && (
        <LeadGenDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onPush={(l) => { pushOne(l); }}
          onMarkContacted={markContacted}
        />
      )}

      <LeadGenToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
