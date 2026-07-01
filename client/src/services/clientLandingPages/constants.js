export const DEFAULT_SERVICES = [
  {
    title: "Consultation",
    description: "Book a consultation with our team.",
    image_url: "",
    cta_label: "Book Consultation",
  },
  {
    title: "Business Support",
    description: "Get personalized support based on your goals.",
    image_url: "",
    cta_label: "Get Support",
  },
  {
    title: "Growth Planning",
    description: "Create a clear roadmap for your next stage of growth.",
    image_url: "",
    cta_label: "Start Planning",
  },
];

export const DEFAULT_FEATURE_CARDS = [
  {
    title: "Fast Scheduling",
    description: "Let visitors book appointments directly from your landing page.",
    image_url: "",
    tag: "Booking",
  },
  {
    title: "Professional Online Presence",
    description: "Showcase your company, services, and offer in one public page.",
    image_url: "",
    tag: "Branding",
  },
  {
    title: "Workspace Integrated",
    description: "Bookings flow directly into your ExponifyPH workspace.",
    image_url: "",
    tag: "Automation",
  },
];

export const DEFAULT_PROCESS_STEPS = [
  {
    title: "Discover",
    description: "Visitors learn about your company and services.",
  },
  {
    title: "Book",
    description: "They submit an appointment request through your landing page.",
  },
  {
    title: "Confirm",
    description: "You approve the booking and generate the meeting link.",
  },
];

export const DEFAULT_HERO_STATS = [
  {
    label: "Fast Booking",
    value: "24/7",
  },
  {
    label: "Workspace Ready",
    value: "100%",
  },
  {
    label: "Google Meet",
    value: "Live",
  },
];

export const DEFAULT_FAQS = [
  {
    question: "How do I book an appointment?",
    answer:
      "Use the booking form on this landing page and our team will confirm your request.",
  },
];

export const DEFAULT_NAVIGATION_LINKS = [
  {
    label: "Services",
    target: "#services",
  },
  {
    label: "Process",
    target: "#process",
  },
  {
    label: "Book",
    target: "#booking",
  },
];

export const DEFAULT_CORE_SECTIONS = [
  {
    section_type: "hero",
    title: "Hero",
    subtitle: "Welcome",
    description: "",
    payload: {
      headline: "",
      subheadline: "",
      cta_label: "Book Appointment",
    },
    order_index: 0,
  },
  {
    section_type: "about",
    title: "About Us",
    subtitle: "Company",
    description:
      "Use this section to introduce your business, explain what you offer, and build trust with visitors.",
    payload: {
      body:
        "Use this section to introduce your business, explain what you offer, and build trust with visitors.",
    },
    order_index: 1,
  },
  {
    section_type: "services",
    title: "Our Services",
    subtitle: "Services",
    description: "Choose the service that fits your needs.",
    payload: {
      headline: "Our Services",
      description: "Choose the service that fits your needs.",
      items: DEFAULT_SERVICES,
    },
    order_index: 2,
  },
  {
    section_type: "booking",
    title: "Book an Appointment",
    subtitle: "Appointment",
    description:
      "Send us your preferred schedule and our team will confirm your appointment.",
    payload: {
      title: "Book an Appointment",
      description:
        "Send us your preferred schedule and our team will confirm your appointment.",
    },
    order_index: 3,
  },
  {
    section_type: "faq",
    title: "Frequently Asked Questions",
    subtitle: "Support",
    description: "",
    payload: {
      faqs: DEFAULT_FAQS,
    },
    order_index: 4,
  },
  {
    section_type: "contact",
    title: "Contact Us",
    subtitle: "Contact",
    description: "Reach out through the booking form and our team will respond.",
    payload: {
      body: "Reach out through the booking form and our team will respond.",
    },
    order_index: 5,
  },
];
