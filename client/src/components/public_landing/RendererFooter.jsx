import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import TikTokIcon from "./TikTokIcon"; // Optional: we can use a custom SVG if lucide doesn't have tiktok

const ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: TikTokIcon,
  twitter: Twitter,
  linkedin: Linkedin,
};

export default function RendererFooter({ footer, landingPage }) {
  if (!footer || footer.is_enabled === false) return null;

  const bgColor = footer.background_color || "#0B301A";
  const textColor = footer.text_color || "#FFFFFF";
  const fontSize = footer.font_size || "14px";
  
  const socialLinks = Array.isArray(footer.social_links) ? footer.social_links : [];
  
  const hasContent = footer.logo_url || socialLinks.length > 0 || footer.paragraph_1 || footer.paragraph_2;

  if (!hasContent) return null;

  return (
    <footer 
      style={{ backgroundColor: bgColor, color: textColor, fontSize: fontSize }}
      className="relative z-10 w-full py-12 px-6 lg:px-12 mt-auto"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-3">
          
          {/* Logo & Socials */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            {footer.logo_url ? (
              <img 
                src={footer.logo_url} 
                alt="Footer Logo" 
                className="mb-6 h-16 object-contain"
              />
            ) : (
              <h2 className="mb-6 text-2xl font-bold">{landingPage?.title || "Welcome"}</h2>
            )}

            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-2">
                {socialLinks.map((link, i) => {
                  const Icon = ICONS[link.platform] || Facebook;
                  return (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full transition-transform hover:scale-110 hover:opacity-80"
                      style={{ backgroundColor: `${textColor}1A` }} // 10% opacity background
                    >
                      <Icon className="h-5 w-5" style={{ color: textColor }} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Paragraph 1 */}
          <div className="text-center md:text-left">
            {footer.paragraph_1 && (
              <p className="whitespace-pre-wrap leading-relaxed opacity-90">
                {footer.paragraph_1}
              </p>
            )}
          </div>

          {/* Paragraph 2 */}
          <div className="text-center md:text-left">
            {footer.paragraph_2 && (
              <p className="whitespace-pre-wrap leading-relaxed opacity-90">
                {footer.paragraph_2}
              </p>
            )}
          </div>

        </div>

        {/* Copyright */}
        {footer.copyright_text && (
          <div className="mt-12 pt-6 border-t text-center text-sm opacity-70" style={{ borderColor: `${textColor}33` }}>
            <p>{footer.copyright_text}</p>
          </div>
        )}
      </div>
    </footer>
  );
}
