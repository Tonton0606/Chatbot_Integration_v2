import { useEffect, useRef, useState } from "react";
import { VolumeX } from "lucide-react";

export function MediaPreview({
  url,
  title,
  mediaType,
  autoPlay = false,
  className = "",
  style,
  onClick,
}) {
  const videoRef = useRef(null);
  const [showUnmute, setShowUnmute] = useState(false);

  useEffect(() => {
    if (mediaType === "video" && autoPlay && videoRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              videoRef.current?.play().catch(() => {
                // Browser blocked unmuted autoplay. Fallback to muted.
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  videoRef.current.play().catch(() => {});
                  setShowUnmute(true);
                }
              });
            } else {
              videoRef.current?.pause();
            }
          });
        },
        { rootMargin: "400px", threshold: 0 }
      );

      observer.observe(videoRef.current);

      return () => {
        if (videoRef.current) {
          observer.unobserve(videoRef.current);
        }
        observer.disconnect();
      };
    }
  }, [mediaType, autoPlay, url]);

  if (!url) return null;

  const mediaStyle = {
    width: "100%",
    height: "100%",
    objectFit: style?.objectFit || "cover",
    ...style,
  };

  if (mediaType === "video") {
    function handleExpand(event) {
      event.preventDefault();
      event.stopPropagation();
      onClick?.(event);
    }

    function handleUnmute(event) {
      event.preventDefault();
      event.stopPropagation();
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.play().catch(() => {});
        setShowUnmute(false);
      }
    }

    return (
      <div
        className={`relative overflow-hidden bg-black ${className}`}
        style={{
          width: style?.width,
          maxWidth: style?.maxWidth,
          height: style?.height,
          borderRadius: style?.borderRadius,
          borderColor: style?.borderColor,
          borderWidth: style?.borderWidth,
          borderStyle: style?.borderStyle,
          boxShadow: style?.boxShadow,
        }}
        aria-label={`Video preview: ${title || "video"}`}
      >
        <video
          ref={videoRef}
          src={url.includes('#') ? url : `${url}#t=0.001`}
          controls={!autoPlay}
          loop={autoPlay}
          playsInline
          preload="auto"
          className="block h-[calc(100%-36px)] w-full bg-black"
          style={{
            objectFit: style?.objectFit || "contain",
          }}
        >
          Your browser does not support the video tag.
        </video>

        {showUnmute && (
          <button
            type="button"
            onClick={handleUnmute}
            className="absolute right-3 top-3 z-10 flex items-center justify-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-black/80"
            aria-label="Unmute video"
          >
            <VolumeX className="h-4 w-4" />
            UNMUTE
          </button>
        )}

        <button
          type="button"
          onClick={handleExpand}
          className="absolute bottom-0 left-0 right-0 flex h-9 w-full items-center justify-center bg-black/90 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-black"
          aria-label={`Expand ${title || "video"}`}
        >
          Expand Video
        </button>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={title || ""}
      className={`block ${className}`}
      style={mediaStyle}
    />
  );
}

export function MediaModal({ media, onClose }) {
  if (!media?.url) return null;

  const isVideo = media.type === "video";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={media.title || "Media player"}
      onClick={onClose}
    >
      <div
        className={
          isVideo
            ? "w-[95vw] overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl md:w-[82vw] lg:w-[68vw] lg:max-w-[1100px]"
            : "flex max-h-[88vh] w-auto max-w-[92vw] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={
            isVideo
              ? "flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950 px-4 py-3"
              : "flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3"
          }
        >
          <p
            className={
              isVideo
                ? "truncate text-sm font-black text-white"
                : "truncate text-sm font-black text-slate-950"
            }
          >
            {media.title || "Media"}
          </p>

          <button
            type="button"
            onClick={onClose}
            className={
              isVideo
                ? "rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white hover:bg-white/10"
                : "rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
            }
          >
            Close
          </button>
        </div>

        {isVideo ? (
          <video
            key={media.url}
            src={media.url}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="max-h-[78vh] w-full bg-black"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="flex max-h-[calc(88vh-49px)] items-center justify-center bg-slate-50 p-2 sm:p-4">
            <img
              src={media.url}
              alt={media.title || "Media"}
              className="block max-h-[calc(88vh-81px)] max-w-[88vw] rounded-2xl object-contain shadow-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
