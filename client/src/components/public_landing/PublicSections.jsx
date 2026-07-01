import { Building2 } from "lucide-react";

function SectionLabel({ children, color }) {
  return (
    <p
      className="public-landing-eyebrow"
      style={{ color }}
    >
      {children}
    </p>
  );
}

export function PublicServiceCard({
  card,
  colors,
  isLight,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(card)}
      className={`
        group
        flex
        h-full
        min-h-[210px]
        flex-col
        rounded-[26px]
        border
        p-5
        text-left
        transition
        duration-200
        hover:-translate-y-1
        sm:min-h-[230px]
        sm:p-6
        ${
          isLight
            ? "border-slate-200 bg-white shadow-sm hover:shadow-xl"
            : "border-white/10 bg-white/[0.045] shadow-[0_20px_80px_rgba(0,0,0,0.22)] hover:border-white/20 hover:bg-white/[0.065]"
        }
      `}
    >
      {card.image_url ? (
        <img
          src={card.image_url}
          alt={card.title}
          className="mb-5 h-36 w-full rounded-2xl object-cover sm:h-44"
        />
      ) : (
        <div
          className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl text-black sm:h-12 sm:w-12"
          style={{ backgroundColor: colors.primary }}
        >
          <Building2 className="h-5 w-5" />
        </div>
      )}

      <h4 className="text-lg font-black leading-tight sm:text-xl">
        {card.title}
      </h4>

      {!!card.description && (
        <p
          className={`mt-3 text-sm leading-7 ${
            isLight ? "text-slate-600" : "text-slate-300"
          }`}
        >
          {card.description}
        </p>
      )}

      <span
        className="
          mt-auto
          inline-flex
          w-fit
          max-w-full
          rounded-full
          px-4
          py-2
          text-xs
          font-black
          leading-tight
          text-black
          sm:text-sm
        "
        style={{ backgroundColor: colors.primary }}
      >
        {card.cta_label || "Book Consultation"}
      </span>
    </button>
  );
}

export function PublicServices({
  serviceGroups = [],
  colors,
  isLight,
  onServiceClick,
}) {
  const groups = serviceGroups.filter(
    (group) => Array.isArray(group.cards) && group.cards.length > 0
  );

  if (!groups.length) {
    return null;
  }

  return (
    <section
      id="services"
      className={`public-landing-section ${
        isLight ? "bg-slate-50 text-slate-950" : "bg-slate-950 text-white"
      }`}
    >
      <div className="public-landing-section-inner">
        <SectionLabel color={colors.primary}>
          Services
        </SectionLabel>

        <h2 className="mt-3 text-[32px] font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          What we offer
        </h2>

        <p
          className={`mt-3 max-w-3xl text-sm leading-7 sm:text-base sm:leading-8 ${
            isLight ? "text-slate-600" : "text-slate-300"
          }`}
        >
          Choose the service, package, or business category that fits what you need.
        </p>

        <div className="mt-9 space-y-12 sm:mt-12 sm:space-y-16">
          {groups.map((group) => (
            <div
              key={group.id}
              className={`
                rounded-[30px]
                border
                p-4
                sm:p-6
                lg:rounded-none
                lg:border-0
                lg:p-0
                ${
                  isLight
                    ? "border-slate-200 bg-white/80"
                    : "border-white/10 bg-white/[0.025] lg:bg-transparent"
                }
              `}
            >
              <div className="mb-5 sm:mb-7">
                <p
                  className="text-[10px] font-black uppercase tracking-[0.22em] sm:text-xs"
                  style={{ color: colors.primary }}
                >
                  {group.category || "Services"}
                </p>

                <h3 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                  {group.title}
                </h3>

                {!!group.description && (
                  <p
                    className={`mt-2 max-w-2xl text-sm leading-7 ${
                      isLight ? "text-slate-600" : "text-slate-300"
                    }`}
                  >
                    {group.description}
                  </p>
                )}
              </div>

              <div className="public-landing-grid public-landing-grid-3">
                {group.cards.map((card) => (
                  <PublicServiceCard
                    key={card.id}
                    card={card}
                    colors={colors}
                    isLight={isLight}
                    onClick={onServiceClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicAbout({
  page,
  colors,
  isLight,
}) {
  if (!page?.about_content) {
    return null;
  }

  return (
    <section
      className={`public-landing-section ${
        isLight ? "bg-white text-slate-950" : "bg-slate-900 text-white"
      }`}
    >
      <div
        className={`
          public-landing-section-inner
          max-w-5xl
          rounded-[30px]
          border
          p-6
          sm:p-8
          lg:border-0
          lg:p-0
          ${
            isLight
              ? "border-slate-200 bg-white"
              : "border-white/10 bg-white/[0.035] lg:bg-transparent"
          }
        `}
      >
        <SectionLabel color={colors.primary}>
          About
        </SectionLabel>

        <h2 className="mt-3 text-[30px] font-black leading-tight sm:text-4xl">
          {page.about_title || "About"}
        </h2>

        <p
          className={`mt-4 text-base leading-8 sm:text-lg ${
            isLight ? "text-slate-600" : "text-slate-300"
          }`}
        >
          {page.about_content}
        </p>
      </div>
    </section>
  );
}

export function PublicDynamicSection() {
  return null;
}
