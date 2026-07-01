import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

const links = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Documentation', href: '#docs' },
    { label: 'API Reference', href: '#api' },
  ],
  company: [
    { label: 'About', href: '#about' },
    { label: 'Blog', href: '#blog' },
    { label: 'Careers', href: '#careers' },
    { label: 'Contact', href: '#contact' },
  ],
  legal: [
    { label: 'Privacy', href: '#privacy' },
    { label: 'Terms', href: '#terms' },
    { label: 'Security', href: '#security' },
  ],
};

const socials = [
  { icon: Github, href: 'https://github.com', label: 'GitHub' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:support@hermesv2.com', label: 'Email' },
];

function Footer() {
  return (
    <footer className="bg-[#070b14] border-t border-[#1a1f2e] text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-4">HermesV2</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              AI-powered business operations platform with enterprise-grade security.
              Built with Groq LLM, Nuclei, and Trivy.
            </p>
            <div className="flex gap-4">
              {socials.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#0d111d] hover:bg-[#1a1f2e] border border-[#2a2f3e] rounded-lg flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5 text-gray-400 hover:text-[#d4a853]" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2">
              {links.product.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="hover:text-[#d4a853] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              {links.company.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="hover:text-[#d4a853] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              {links.legal.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="hover:text-[#d4a853] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#1a1f2e] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} HermesV2. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            Built with ❤️ using React, Vite, Supabase & Groq
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
