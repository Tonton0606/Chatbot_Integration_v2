import { CalendarCheck } from "lucide-react";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
function isVideoUrl(url) {
  return VIDEO_EXTENSIONS.test(String(url || "").trim());
}

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

export default function PublicHero({
  page,
  colors,
  isLight,
  onBookingClick,
}) {
  const isVideo = isVideoUrl(page?.hero_image_url);
  const autoPlay = Boolean(page?.payload?.hero_video_autoplay);

  return (
    <section
      className="public-landing-hero"
      style={{
        background: isLight
          ? "linear-gradient(135deg,#fff,#f8fafc)"
          : `radial-gradient(circle at top left, ${colors.primary}22, transparent 30%),
             linear-gradient(135deg, ${colors.secondary}, #020617 75%)`,
      }}
    >
      {page?.hero_image_url && (
        <div className="public-landing-hero-bg">
          {isVideo ? (
            <video
              src={page.hero_image_url}
              autoPlay={autoPlay}
              muted={autoPlay}
              loop={autoPlay}
              playsInline
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <img
              src={page.hero_image_url}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          )}

          <div
            className="public-landing-hero-overlay"
            style={{
              background: isLight
                ? "rgba(255,255,255,.72)"
                : "linear-gradient(135deg, rgba(2,6,23,.92), rgba(2,6,23,.72))",
            }}
          />

        </div>
      )}

      <div className="public-landing-hero-inner">

        {/* NAVBAR */}

        <nav className="public-landing-nav">

          <div className="public-landing-brand">

            {page?.logo_url ? (

              <img
                src={page.logo_url}
                alt={page.title}
              />

            ) : (

              <div
                className="
                public-landing-brand-mark
                flex
                items-center
                justify-center
                font-black
                text-black
                "
                style={{
                  background: colors.primary,
                }}
              >
                {page?.title?.charAt(0)}
              </div>

            )}

            <span className="public-landing-brand-title">
              {page?.title}
            </span>

          </div>


          {page?.show_booking && (

            <a
              href="#booking"
              onClick={onBookingClick}
              className="
              rounded-full
              px-4
              py-2
              text-xs
              font-black
              text-black
              "
              style={{
                background: colors.primary,
              }}
            >
              Book
            </a>

          )}

        </nav>


        {/* CONTENT */}

        <div className="max-w-4xl">

          <SectionLabel color={colors.primary}>
            {page?.hero_badge || "WORKSPACE"}
          </SectionLabel>


          <h1
            className="
            mt-4
            text-5xl
            md:text-7xl
            font-black
            leading-[0.95]
            tracking-[-0.05em]
            "
          >
            {page?.headline ||
              `Welcome to ${page?.title}`}
          </h1>


          {page?.subheadline && (

            <p
              className={`
              mt-6
              max-w-2xl
              text-base
              leading-8
              md:text-xl
              ${
                isLight
                  ? "text-slate-600"
                  : "text-slate-300"
              }
              `}
            >
              {page.subheadline}
            </p>

          )}


          {page?.show_booking && (

            <a
              href="#booking"
              onClick={onBookingClick}
              className="
              mt-8
              inline-flex
              items-center
              rounded-full
              px-8
              py-4
              font-black
              text-black
              shadow-xl
              transition
              hover:scale-[1.02]
              "
              style={{
                background: colors.primary,
              }}
            >
              <CalendarCheck
                className="mr-2 h-5 w-5"
              />

              {page.primary_cta_label ||
                "Book Appointment"}

            </a>

          )}


          {/* STATS */}

          {asArray(page?.hero_stats).length > 0 && (

            <div
              className="
              mt-10
              grid
              grid-cols-2
              gap-4
              md:grid-cols-4
              "
            >

              {page.hero_stats.map(
                (stat, index) => (

                  <div
                    key={index}
                    className={`
                    rounded-3xl
                    p-5
                    ${
                      isLight
                        ? "bg-white shadow-md"
                        : "border border-white/10 bg-white/[0.05]"
                    }
                    `}
                  >

                    <p
                      className="
                      text-2xl
                      md:text-3xl
                      font-black
                      "
                      style={{
                        color: colors.primary,
                      }}
                    >
                      {stat.value}
                    </p>


                    <p
                      className="
                      mt-1
                      text-xs
                      md:text-sm
                      "
                    >
                      {stat.label}
                    </p>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>

    </section>
  );
}
