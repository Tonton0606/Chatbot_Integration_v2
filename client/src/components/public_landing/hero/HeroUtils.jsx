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

export function getPreviewClass(activePreviewId, previewId, extraClass = "") {
  return `${extraClass} ${
    activePreviewId === previewId ? "landing-preview-highlight" : ""
  }`.trim();
}

export function stopPreviewClick(event, previewId, onPreviewClick) {
  event.stopPropagation();
  onPreviewClick?.(previewId);
}

export function renderTextWithLineBreaks(text, keyPrefix = "text") {
  const lines = String(text || "").split("\n");

  return lines.map((line, index) => (
    <span key={`${keyPrefix}-${index}`}>
      {index > 0 && <br />}
      {line}
    </span>
  ));
}

export function StyledText({
  as: Component = "span",
  text,
  className = "",
  style = {},
  activePreviewId,
  previewId,
  onPreviewClick,
  preserveLineBreaks = true,
}) {
  const content = preserveLineBreaks
    ? renderTextWithLineBreaks(text, previewId || "styled-text")
    : text;

  if (!previewId) {
    return (
      <Component className={className} style={style}>
        {content}
      </Component>
    );
  }

  return (
    <Component
      data-preview-id={previewId}
      className={getPreviewClass(activePreviewId, previewId, className)}
      style={style}
      onClick={(event) => stopPreviewClick(event, previewId, onPreviewClick)}
    >
      {content}
    </Component>
  );
}

export function HighlightedHeadline({
  text,
  highlight,
  highlightColor,
  highlightStyle = {},
}) {
  const rawText = String(text || "");
  const rawHighlight = String(highlight || "").trim();

  if (!rawText) return null;

  if (!rawHighlight) {
    return renderTextWithLineBreaks(rawText, "headline-line");
  }

  const lowerText = rawText.toLowerCase();
  const lowerHighlight = rawHighlight.toLowerCase();
  const startIndex = lowerText.indexOf(lowerHighlight);

  if (startIndex === -1) {
    return renderTextWithLineBreaks(rawText, "headline-line");
  }

  const beforeText = rawText.slice(0, startIndex);
  const matchedText = rawText.slice(startIndex, startIndex + rawHighlight.length);
  const afterText = rawText.slice(startIndex + rawHighlight.length);

  return (
    <>
      {renderTextWithLineBreaks(beforeText, "headline-before")}

      <span
        style={{
          color: highlightColor,
          ...highlightStyle,
        }}
      >
        {renderTextWithLineBreaks(matchedText, "headline-highlight")}
      </span>

      {renderTextWithLineBreaks(afterText, "headline-after")}
    </>
  );
}
