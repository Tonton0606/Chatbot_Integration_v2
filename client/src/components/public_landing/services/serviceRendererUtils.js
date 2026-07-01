export function getCardTextStyles(card) {
  return card?.payload?.styles || {};
}

export function hasText(value) {
  return String(value || "").trim().length > 0;
}

export function buildTextStyle(style = {}) {
  const output = {};

  if (style.fontSize) output.fontSize = `${style.fontSize}px`;
  if (style.fontFamily) output.fontFamily = style.fontFamily;
  if (style.color) output.color = style.color;
  if (style.bold) output.fontWeight = 800;
  if (style.italic) output.fontStyle = "italic";
  if (style.underline) output.textDecoration = "underline";
  
  if (style.textAlign || style.text_align) {
    output.textAlign = style.textAlign || style.text_align;
    if (output.textAlign === "center") {
      output.marginLeft = "auto";
      output.marginRight = "auto";
    } else if (output.textAlign === "right") {
      output.marginLeft = "auto";
      output.marginRight = "0";
    } else if (output.textAlign === "left" || output.textAlign === "justify") {
      output.marginLeft = "0";
      output.marginRight = "auto";
    }
  }

  const tx = Number(style.translateX ?? style.translate_x ?? 0);
  const ty = Number(style.translateY ?? style.translate_y ?? 0);
  if (tx || ty) {
    output.transform = `translate(${tx}px, ${ty}px)`;
  }

  return output;
}

export function getShapeRadius(shape, fallback = "") {
  if (shape === "rectangle") return "0px";
  if (shape === "square") return "0px";
  if (shape === "rounded_rectangle") return fallback || "18px";
  if (shape === "rounded_square") return fallback || "18px";
  if (shape === "circle") return "9999px";
  if (shape === "pill") return "9999px";
  if (shape === "ellipse") return "9999px";

  return fallback;
}

export function buildVisualStyle(style = {}) {
  const output = {};

  if (style.backgroundColor) output.backgroundColor = style.backgroundColor;
  if (style.color) output.color = style.color;
  if (style.borderColor) output.borderColor = style.borderColor;
  if (style.borderWidth) output.borderWidth = style.borderWidth;

  const shapeRadius = getShapeRadius(style.shape, style.borderRadius);

  if (shapeRadius) {
    output.borderRadius = shapeRadius;
  }

  if (style.boxShadow) output.boxShadow = style.boxShadow;

  if (style.borderColor || style.borderWidth) {
    output.borderStyle = "solid";
  }

  return output;
}

export function getPreviewClass(activePreviewId, previewId, baseClass = "") {
  return `${baseClass} ${
    activePreviewId === previewId ? "landing-preview-highlight" : ""
  }`.trim();
}

export function stopPreviewClick(event, previewId, onPreviewClick) {
  event.stopPropagation();
  onPreviewClick?.(previewId);
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(Math.max(parsed, min), max);
}

export function getViewportColumnCount(payload = {}, viewportMode) {
  if (viewportMode === "mobile") {
    return clampNumber(payload.layout_columns_mobile, 1, 1, 2);
  }

  if (viewportMode === "tablet") {
    return clampNumber(payload.layout_columns_tablet, 2, 1, 4);
  }

  return clampNumber(payload.layout_columns_desktop, 3, 1, 6);
}

export function getServicesGridStyle(payload = {}, viewportMode) {
  const columns = getViewportColumnCount(payload, viewportMode);

  return {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };
}

export function getServiceCardSizeClass(cardSizeMode, compact) {
  if (cardSizeMode === "compact") {
    return "p-4 min-h-[220px]";
  }

  if (cardSizeMode === "large") {
    return "p-8 min-h-[380px]";
  }

  if (cardSizeMode === "comfortable") {
    return "p-7 min-h-[320px]";
  }

  return compact ? "p-5 min-h-[260px]" : "p-7 min-h-[300px]";
}

export function getServiceCardGapClass(cardSizeMode, compact) {
  if (cardSizeMode === "compact") return "gap-4";
  if (cardSizeMode === "large") return "gap-7";
  if (cardSizeMode === "comfortable") return "gap-6";

  return compact ? "gap-5" : "gap-5";
}

export function getServiceCardMediaSizeClass(cardSizeMode, compact) {
  if (cardSizeMode === "compact") return "mb-4 h-32 w-full";
  if (cardSizeMode === "large") return "mb-6 h-60 w-full";
  if (cardSizeMode === "comfortable") return "mb-5 h-48 w-full";

  return compact ? "mb-5 h-40 w-full" : "mb-5 h-44 w-full";
}
