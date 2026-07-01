import { MediaPreview } from "./PublicLandingMedia";
import RendererMap from "./RendererMap";
import {
  asArray,
  getItemText,
  getItemTitle,
  normalizeExternalUrl,
} from "./publicLandingUtils";
import { inferMediaType } from "./publicLandingUtils";
import {
  resolveRuntimeCardStyle,
  resolveRuntimeMediaStyle,
  resolveRuntimePrimaryButtonStyle,
  resolveRuntimeSectionBackground,
  resolveRuntimeSectionStyle,
  resolveRuntimeTextStyle,
} from "./landingThemeRuntime";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeEditorTextStyle(style = {}) {
  const source = asObject(style);
  const normalized = { ...source };

  if (source.fontSize !== undefined && source.fontSize !== "") {
    normalized.fontSize =
      typeof source.fontSize === "number" ? `${source.fontSize}px` : source.fontSize;
  }

  if ("bold" in source) {
    normalized.fontWeight = source.bold ? 800 : 400;
    delete normalized.bold;
  }

  if ("italic" in source) {
    normalized.fontStyle = source.italic ? "italic" : "normal";
    delete normalized.italic;
  }

  if ("underline" in source) {
    normalized.textDecoration = source.underline ? "underline" : "none";
    delete normalized.underline;
  }

  if (!normalized.fontFamily) {
    delete normalized.fontFamily;
  }

  return normalized;
}

function getSectionKey(sectionType) {
  return sectionType || "custom";
}

function getSectionStyles(section = {}) {
  return asObject(section?.payload?.styles);
}

function getItemStyle(item = {}, key) {
  const styles = asObject(item?.styles || item?.payload?.styles);
  return normalizeEditorTextStyle(asObject(styles[key]));
}

function getPreviewClass(activePreviewId, previewId, baseClass = "") {
  return `${baseClass} ${
    activePreviewId === previewId ? "landing-preview-highlight" : ""
  }`.trim();
}

function stopPreviewClick(event, previewId, onPreviewClick) {
  event.stopPropagation();
  onPreviewClick?.(previewId);
}

function getItemPreviewId(section, item, index) {
  return item?.id
    ? `item-${item.id}`
    : `section-${section?.id || section?.section_type}-item-${index}`;
}

function getVisibility(payload = {}) {
  return {
    eyebrow: true,
    heading: true,
    description: true,
    ...asObject(payload.content_visibility),
  };
}

function getGridStyle(section = {}, viewportMode) {
  const gridStyles = asObject(getSectionStyles(section).grid);

  const columns =
    viewportMode === "mobile"
      ? gridStyles.mobileColumns
      : viewportMode === "tablet"
        ? gridStyles.tabletColumns
        : gridStyles.desktopColumns;

  return {
    gap: gridStyles.gap || undefined,
    gridTemplateColumns: columns
      ? `repeat(${columns}, minmax(0, 1fr))`
      : undefined,
  };
}

function getItemMediaUrl(item = {}) {
  return (
    cleanText(item.image_url) ||
    cleanText(item.media_url) ||
    cleanText(item.image) ||
    cleanText(item.url)
  );
}

function getItemMediaPosition(item = {}) {
  return item.media_position || item.image_position || "top";
}

function getItemMediaFit(item = {}) {
  const fit = item.media_fit || item.object_fit || "cover";

  if (fit === "contain") return "contain";
  if (fit === "fill") return "fill";

  return "cover";
}

function getSectionMediaUrl(payload = {}) {
  return (
    cleanText(payload.media_url) ||
    cleanText(payload.section_media_url) ||
    cleanText(payload.section_image_url) ||
    cleanText(payload.image_url) ||
    cleanText(payload.background_image_url) ||
    cleanText(payload.background_image)
  );
}

function getSectionMediaPosition(payload = {}) {
  return (
    payload.media_position ||
    payload.section_media_position ||
    payload.section_image_position ||
    payload.image_position ||
    "top"
  );
}

function getSectionMediaFit(payload = {}) {
  const fit =
    payload.media_fit ||
    payload.section_media_fit ||
    payload.section_image_fit ||
    payload.object_fit ||
    "cover";

  if (fit === "contain") return "contain";
  if (fit === "fill") return "fill";

  return "cover";
}

function getSectionMediaFocus(payload = {}) {
  return (
    payload.media_focus ||
    payload.section_media_focus ||
    payload.section_image_focus ||
    "center"
  );
}

function getSectionMediaWidth(payload = {}) {
  return (
    payload.media_width ||
    payload.section_media_width ||
    payload.section_image_width ||
    ""
  );
}

function getSectionMediaMaxWidth(payload = {}) {
  return (
    payload.media_max_width ||
    payload.section_media_max_width ||
    payload.section_image_max_width ||
    ""
  );
}

function getSectionMediaHeight(payload = {}) {
  return (
    payload.media_height ||
    payload.section_media_height ||
    payload.section_image_height ||
    ""
  );
}

function getSectionOverlayColor(payload = {}) {
  return (
    payload.media_overlay_color ||
    payload.section_media_overlay_color ||
    payload.section_image_overlay_color ||
    "#000000"
  );
}

function getSectionOverlayOpacity(payload = {}) {
  return (
    payload.media_overlay_opacity ||
    payload.section_media_overlay_opacity ||
    payload.section_image_overlay_opacity ||
    0
  );
}

function getMediaObjectPosition(focus) {
  if (focus === "top") return "center top";
  if (focus === "bottom") return "center bottom";
  if (focus === "left") return "left center";
  if (focus === "right") return "right center";

  return "center center";
}

function getItemButtonLabel(item = {}) {
  return cleanText(item.button_label) || cleanText(item.cta_label);
}

function getItemButtonUrl(item = {}) {
  return normalizeExternalUrl(
    item.button_url || item.cta_url || item.link_url || item.href
  );
}

function getButtonLabel(item = {}, fallback = "Learn More") {
  return (
    getItemButtonLabel(item) ||
    cleanText(item.link_label) ||
    cleanText(item.linkLabel) ||
    fallback
  );
}

export default function RendererSections({
  sections,
  runtime,
  startIndex = 2,
  viewportMode,
  compact,
  activePreviewId,
  onPreviewClick,
}) {
  const visibleSections = sections.filter(
    (section) => !["services", "booking", "hero"].includes(section.section_type)
  );

  if (!visibleSections.length) return null;

  return (
    <>
      {visibleSections.map((section, index) => (
        section.section_type === "map" ? (
          <RendererMap
            key={section.id}
            section={section}
            runtime={runtime}
            sectionIndex={startIndex + index}
            viewportMode={viewportMode}
            compact={compact}
            activePreviewId={activePreviewId}
            onPreviewClick={onPreviewClick}
          />
        ) : (
          <RendererSectionBlock
            key={section.id}
            section={section}
            runtime={runtime}
            sectionIndex={startIndex + index}
            viewportMode={viewportMode}
            compact={compact}
            activePreviewId={activePreviewId}
            onPreviewClick={onPreviewClick}
          />
        )
      ))}
    </>
  );
}

function RendererSectionBlock({
  section,
  runtime,
  sectionIndex,
  viewportMode,
  compact,
  activePreviewId,
  onPreviewClick,
}) {
  const payload = asObject(section.payload);
  const styles = getSectionStyles(section);
  const visibility = getVisibility(payload);
  const sectionKey = getSectionKey(section.section_type);
  const sectionPreviewId = `section-${section.id || section.section_type}`;

  const title = section.title || payload.title || section.section_type;
  const subtitle = section.subtitle || payload.subtitle || payload.eyebrow || "";
  const description =
    section.description || payload.description || payload.body || "";

  const items = asArray(payload.items);

  const sectionMediaUrl = getSectionMediaUrl(payload);
  const sectionMediaPosition = getSectionMediaPosition(payload);
  const sectionMediaWidth = getSectionMediaWidth(payload);
  const sectionMediaMaxWidth = getSectionMediaMaxWidth(payload);
  const sectionMediaHeight = getSectionMediaHeight(payload);

  const hasSectionMedia = Boolean(sectionMediaUrl);
  const isSectionSideMedia =
    hasSectionMedia &&
    ["left", "right"].includes(sectionMediaPosition) &&
    viewportMode !== "mobile";
  const isSectionBackgroundMedia =
    hasSectionMedia && sectionMediaPosition === "background";

  const sectionBackground = resolveRuntimeSectionBackground(
    runtime,
    sectionIndex,
    "white"
  );

  const sectionStyle = resolveRuntimeSectionStyle(runtime, sectionKey, {
    backgroundColor: sectionBackground,
    ...asObject(styles.section),
  });

  const sectionCardStyle = resolveRuntimeCardStyle(runtime, {
    ...asObject(styles.container),
    ...asObject(styles.card),
    position: isSectionBackgroundMedia ? "relative" : undefined,
    overflow: isSectionBackgroundMedia ? "hidden" : undefined,
  });

  const eyebrowStyle = resolveRuntimeTextStyle(runtime, `${sectionKey}_eyebrow`, {
    color: runtime.primaryColor,
    ...normalizeEditorTextStyle(styles.eyebrow),
  });

  const headingStyle = resolveRuntimeTextStyle(runtime, `${sectionKey}_heading`, {
    color: runtime.section.headingColor,
    ...normalizeEditorTextStyle(styles.heading),
  });

  const descriptionStyle = resolveRuntimeTextStyle(
    runtime,
    `${sectionKey}_description`,
    {
      color: runtime.section.bodyTextColor,
      ...normalizeEditorTextStyle(styles.description),
    }
  );

  const sectionPadding =
    viewportMode === "mobile"
      ? "px-5 py-12"
      : viewportMode === "tablet"
        ? "px-7 py-16"
        : "px-10 py-20";

  const hasHeader =
    (visibility.eyebrow !== false &&
      cleanText(subtitle || section.section_type)) ||
    (visibility.heading !== false && cleanText(title)) ||
    (visibility.description !== false &&
      cleanText(description) &&
      !["faq", "contact"].includes(section.section_type));

  function renderSectionHeader() {
    if (!hasHeader) return null;

    return (
      <div>
        {visibility.eyebrow !== false && (
          <p className="uppercase tracking-[0.22em]" style={eyebrowStyle}>
            {subtitle || section.section_type}
          </p>
        )}

        {visibility.heading !== false && cleanText(title) && (
          <h3 className="mt-3" style={headingStyle}>
            {title}
          </h3>
        )}

        {visibility.description !== false &&
          description &&
          !["faq", "contact"].includes(section.section_type) && (
            <p className="mt-3 max-w-3xl whitespace-pre-line leading-7" style={descriptionStyle}>
              {description}
            </p>
          )}
      </div>
    );
  }

  function renderSectionItems() {
    return (
      <RendererSectionItems
        section={section}
        sectionType={section.section_type}
        items={items}
        runtime={runtime}
        viewportMode={viewportMode}
        activePreviewId={activePreviewId}
        onPreviewClick={onPreviewClick}
      />
    );
  }

  function renderSectionContent() {
    return (
      <div className="relative z-[2] min-w-0 flex-1">
        {renderSectionHeader()}
        {renderSectionItems()}
      </div>
    );
  }

  function renderSectionMedia(extraClassName = "") {
    if (!sectionMediaUrl || isSectionBackgroundMedia) return null;

    const mediaType = inferMediaType(sectionMediaUrl);

    const mediaStyle = resolveRuntimeMediaStyle(runtime, "section_media", {
      width: sectionMediaWidth || undefined,
      maxWidth: sectionMediaMaxWidth || undefined,
      height: sectionMediaHeight || undefined,
      objectFit: getSectionMediaFit(payload),
      objectPosition: getMediaObjectPosition(getSectionMediaFocus(payload)),
      ...asObject(styles.media),
      ...asObject(styles.image),
    });

    return (
      <div className={`relative z-[2] min-w-0 ${extraClassName}`.trim()}>
        <MediaPreview
          url={sectionMediaUrl}
          title={title}
          mediaType={mediaType}
          autoPlay={Boolean(payload.video_autoplay)}
          className="h-full min-h-[220px] w-full rounded-2xl"
          style={mediaStyle}
        />
      </div>
    );
  }

  function renderSectionBackgroundMedia() {
    if (!sectionMediaUrl || !isSectionBackgroundMedia) return null;

    const mediaType = inferMediaType(sectionMediaUrl);

    const mediaStyle = resolveRuntimeMediaStyle(runtime, "section_media", {
      width: "100%",
      height: "100%",
      objectFit: getSectionMediaFit(payload),
      objectPosition: getMediaObjectPosition(getSectionMediaFocus(payload)),
      ...asObject(styles.media),
      ...asObject(styles.image),
    });

    return (
      <div className="absolute inset-0 z-0">
        <MediaPreview
          url={sectionMediaUrl}
          title={title}
          mediaType={mediaType}
          autoPlay={Boolean(payload.video_autoplay)}
          className="h-full w-full"
          style={mediaStyle}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: getSectionOverlayColor(payload),
            opacity: getSectionOverlayOpacity(payload),
          }}
        />
      </div>
    );
  }

  function renderSectionInner() {
    if (isSectionSideMedia) {
      return (
        <div
          className={`relative z-[2] flex gap-7 ${
            sectionMediaPosition === "right" ? "flex-row-reverse" : ""
          }`}
        >
          <div
            className="min-w-0 shrink-0"
            style={{
              width: sectionMediaWidth || "42%",
              maxWidth: sectionMediaMaxWidth || "560px",
            }}
          >
            {renderSectionMedia("h-full")}
          </div>

          {renderSectionContent()}
        </div>
      );
    }

    if (hasSectionMedia && sectionMediaPosition === "bottom") {
      return (
        <div className="relative z-[2]">
          {renderSectionContent()}
          {renderSectionMedia("mt-7")}
        </div>
      );
    }

    return (
      <div className="relative z-[2]">
        {hasSectionMedia &&
          !isSectionBackgroundMedia &&
          renderSectionMedia("mb-7")}
        {renderSectionContent()}
      </div>
    );
  }

  return (
    <section
      data-preview-id={sectionPreviewId}
      className={getPreviewClass(
        activePreviewId,
        sectionPreviewId,
        sectionPadding
      )}
      style={sectionStyle}
      onClick={(event) =>
        stopPreviewClick(event, sectionPreviewId, onPreviewClick)
      }
    >
      <div className="mx-auto max-w-[1280px]">
        <div className={`${compact ? "p-5" : "p-7"}`} style={sectionCardStyle}>
          {renderSectionBackgroundMedia()}
          {renderSectionInner()}
        </div>
      </div>
    </section>
  );
}

function RendererSectionItems({
  section,
  sectionType,
  items,
  runtime,
  viewportMode,
  activePreviewId,
  onPreviewClick,
}) {
  if (!items.length) return null;

  const gridStyle = getGridStyle(section, viewportMode);

  if (sectionType === "faq") {
    return (
      <AccordionItems
        section={section}
        items={items}
        runtime={runtime}
        itemType="faq"
        activePreviewId={activePreviewId}
        onPreviewClick={onPreviewClick}
      />
    );
  }

  if (sectionType === "about" || sectionType === "custom") {
    return (
      <div className="mt-6 grid gap-4" style={gridStyle}>
        {items.map((item, index) => (
          <FlexibleContentItem
            key={item.id || index}
            section={section}
            item={item}
            index={index}
            runtime={runtime}
            activePreviewId={activePreviewId}
            onPreviewClick={onPreviewClick}
          />
        ))}
      </div>
    );
  }

  if (sectionType === "contact") {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-2" style={gridStyle}>
        {items.map((item, index) => (
          <ContactItem
            key={item.id || index}
            section={section}
            item={item}
            index={index}
            runtime={runtime}
            activePreviewId={activePreviewId}
            onPreviewClick={onPreviewClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4" style={gridStyle}>
      {items.map((item, index) => (
        <FlexibleContentItem
          key={item.id || index}
          section={section}
          item={item}
          index={index}
          runtime={runtime}
          activePreviewId={activePreviewId}
          onPreviewClick={onPreviewClick}
        />
      ))}
    </div>
  );
}

function ContactItem({
  section,
  item,
  index,
  runtime,
  activePreviewId,
  onPreviewClick,
}) {
  if (item.type === "textbox") {
    return (
      <RendererTextboxItem
        section={section}
        item={item}
        index={index}
        runtime={runtime}
        activePreviewId={activePreviewId}
        onPreviewClick={onPreviewClick}
      />
    );
  }

  return (
    <FlexibleContentItem
      section={section}
      item={{
        ...item,
        title: item.label || `Contact ${index + 1}`,
        body: [item.value, item.description].filter(Boolean).join("\n"),
        button_label: item.link_label,
        button_url: item.link_url,
      }}
      index={index}
      runtime={runtime}
      activePreviewId={activePreviewId}
      onPreviewClick={onPreviewClick}
      titleStyleKey="contact_item_label"
      textStyleKey="contact_item_description"
    />
  );
}

function FlexibleContentItem({
  section,
  item,
  index,
  runtime,
  activePreviewId,
  onPreviewClick,
  titleStyleKey = "generic_item_title",
  textStyleKey = "generic_item_text",
}) {
  if (item.type === "textbox") {
    return (
      <RendererTextboxItem
        section={section}
        item={item}
        index={index}
        runtime={runtime}
        activePreviewId={activePreviewId}
        onPreviewClick={onPreviewClick}
      />
    );
  }

  const previewId = getItemPreviewId(section, item, index);
  const mediaUrl = getItemMediaUrl(item);
  const mediaPosition = getItemMediaPosition(item);
  const isSideMedia = mediaPosition === "left" || mediaPosition === "right";
  const isBackgroundMedia = mediaPosition === "background";

  const linkUrl = getItemButtonUrl(item);
  const linkLabel = getButtonLabel(item);
  const title = getItemTitle(item, `Item ${index + 1}`);
  const text = getItemText(item);

  const cardStyle = resolveRuntimeCardStyle(runtime, {
    ...getItemStyle(item, "card"),
    position: isBackgroundMedia ? "relative" : undefined,
    overflow: isBackgroundMedia ? "hidden" : undefined,
  });

  const titleStyle = resolveRuntimeTextStyle(runtime, titleStyleKey, {
    color: runtime.section.headingColor,
    ...getItemStyle(item, "title"),
  });

  const textStyle = resolveRuntimeTextStyle(runtime, textStyleKey, {
    color: runtime.section.bodyTextColor,
    ...getItemStyle(item, "text"),
  });

  function renderTextContent() {
    return (
      <div className="relative z-[2] min-w-0">
        {title && (
          <h4 style={titleStyle}>
            {title}
          </h4>
        )}

        {text && (
          <p className="mt-2 whitespace-pre-line leading-7" style={textStyle}>
            {text}
          </p>
        )}

        {linkUrl && (
          <a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="mt-4 inline-flex w-fit rounded-xl px-4 py-3 text-xs font-black transition hover:-translate-y-0.5"
            style={{
              ...resolveRuntimePrimaryButtonStyle(runtime),
              ...getItemStyle(item, "button"),
              ...getItemStyle(item, "cta"),
            }}
          >
            {linkLabel} →
          </a>
        )}
      </div>
    );
  }

  function renderMediaBlock(extraClassName = "") {
    if (!mediaUrl || isBackgroundMedia) return null;

    const mediaType = inferMediaType(mediaUrl);

    const mediaStyle = resolveRuntimeMediaStyle(runtime, "section_item_media", {
      width: item.media_width || item.image_width || undefined,
      maxWidth: item.media_max_width || item.image_max_width || undefined,
      height: item.media_height || item.image_height || undefined,
      objectFit: getItemMediaFit(item),
      ...getItemStyle(item, "media"),
      ...getItemStyle(item, "image"),
    });

    return (
      <div className={extraClassName}>
        <MediaPreview
          url={mediaUrl}
          title={title}
          mediaType={mediaType}
          autoPlay={Boolean(item.video_autoplay)}
          className="h-full min-h-[180px] w-full rounded-2xl"
          style={mediaStyle}
        />
      </div>
    );
  }

  function renderBackgroundMedia() {
    if (!mediaUrl || !isBackgroundMedia) return null;

    const mediaType = inferMediaType(mediaUrl);
    const mediaStyle = resolveRuntimeMediaStyle(runtime, "section_item_media", {
      width: "100%",
      height: "100%",
      objectFit: getItemMediaFit(item),
      ...getItemStyle(item, "media"),
      ...getItemStyle(item, "image"),
    });

    return (
      <div className="absolute inset-0 z-0">
        <MediaPreview
          url={mediaUrl}
          title={title}
          mediaType={mediaType}
          autoPlay={Boolean(item.video_autoplay)}
          className="h-full w-full"
          style={mediaStyle}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor:
              item.overlay_color || getItemStyle(item, "overlay").backgroundColor,
            opacity:
              item.overlay_opacity || getItemStyle(item, "overlay").opacity || 0,
          }}
        />
      </div>
    );
  }

  function renderInner() {
    if (isSideMedia && mediaUrl) {
      return (
        <div
          className={`relative z-[2] flex gap-5 ${
            mediaPosition === "right" ? "flex-row-reverse" : ""
          }`}
        >
          <div
            className="min-w-0 shrink-0"
            style={{ width: item.media_width || item.image_width || "42%" }}
          >
            {renderMediaBlock("h-full")}
          </div>

          <div className="min-w-0 flex-1">{renderTextContent()}</div>
        </div>
      );
    }

    if (mediaPosition === "bottom") {
      return (
        <div className="relative z-[2]">
          {renderTextContent()}
          {renderMediaBlock("mt-5")}
        </div>
      );
    }

    return (
      <div className="relative z-[2]">
        {renderMediaBlock("mb-5")}
        {renderTextContent()}
      </div>
    );
  }

  return (
    <div
      data-preview-id={previewId}
      className={getPreviewClass(activePreviewId, previewId, "p-5")}
      style={cardStyle}
      onClick={(event) => stopPreviewClick(event, previewId, onPreviewClick)}
    >
      {renderBackgroundMedia()}
      {renderInner()}
    </div>
  );
}

function AccordionItems({
  section,
  items,
  runtime,
  itemType,
  activePreviewId,
  onPreviewClick,
}) {
  const filteredItems = items.filter(
    (item) =>
      item.type === "textbox" ||
      getItemTitle(item, "") ||
      getItemText(item) ||
      item.content
  );

  if (!filteredItems.length) return null;

  return (
    <div className="mt-6 grid gap-3">
      {filteredItems.map((item, index) => {
        if (item.type === "textbox") {
          return (
            <RendererTextboxItem
              key={item.id || index}
              section={section}
              item={item}
              index={index}
              runtime={runtime}
              activePreviewId={activePreviewId}
              onPreviewClick={onPreviewClick}
            />
          );
        }

        const previewId = getItemPreviewId(section, item, index);

        const title =
          itemType === "faq"
            ? item.question || item.title || `Question ${index + 1}`
            : getItemTitle(item, `Item ${index + 1}`);

        const text =
          itemType === "faq"
            ? item.answer || item.body || item.description || ""
            : getItemText(item);

        const linkUrl = getItemButtonUrl(item);
        const linkLabel = getButtonLabel(item);

        const cardStyle = resolveRuntimeCardStyle(
          runtime,
          getItemStyle(item, "card")
        );
        const titleStyle = resolveRuntimeTextStyle(
          runtime,
          `${itemType}_item_title`,
          {
            color: runtime.section.headingColor,
            ...getItemStyle(item, "title"),
          }
        );
        const textStyle = resolveRuntimeTextStyle(
          runtime,
          `${itemType}_item_text`,
          {
            color: runtime.section.bodyTextColor,
            ...getItemStyle(item, "text"),
          }
        );

        return (
          <details
            key={item.id || index}
            data-preview-id={previewId}
            className={getPreviewClass(activePreviewId, previewId, "group")}
            style={cardStyle}
            open={index === 0}
            onClick={(event) =>
              stopPreviewClick(event, previewId, onPreviewClick)
            }
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
              <span style={titleStyle}>
                {title}
              </span>

              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black transition group-open:rotate-45"
                style={resolveRuntimePrimaryButtonStyle(runtime)}
              >
                +
              </span>
            </summary>

            {(text || linkUrl) && (
              <div className="px-5 pb-5">
                {text && (
                  <p className="whitespace-pre-line leading-7" style={textStyle}>
                    {text}
                  </p>
                )}

                {linkUrl && (
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="mt-4 inline-flex w-fit rounded-xl px-4 py-3 text-xs font-black transition hover:-translate-y-0.5"
                    style={{
                      ...resolveRuntimePrimaryButtonStyle(runtime),
                      ...getItemStyle(item, "button"),
                      ...getItemStyle(item, "cta"),
                    }}
                  >
                    {linkLabel} →
                  </a>
                )}
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}

function RendererTextboxItem({
  section,
  item,
  index,
  runtime,
  activePreviewId,
  onPreviewClick,
}) {
  const content = item.content || item.body || item.description || "";

  if (!content) return null;

  const previewId = getItemPreviewId(section, item, index);
  const cardStyle = resolveRuntimeCardStyle(runtime, getItemStyle(item, "card"));
  const textStyle = resolveRuntimeTextStyle(runtime, "textbox_item_text", {
    color: runtime.section.bodyTextColor,
    ...getItemStyle(item, "text"),
  });

  return (
    <div
      data-preview-id={previewId}
      className={getPreviewClass(activePreviewId, previewId, "p-5")}
      style={cardStyle}
      onClick={(event) => stopPreviewClick(event, previewId, onPreviewClick)}
    >
      <p className="whitespace-pre-line leading-7" style={textStyle}>
        {content}
      </p>
    </div>
  );
}
