const BROWSER_FONT_SIZE_TO_PX: Record<string, string> = {
  'xx-small': '9px',
  'x-small': '10px',
  small: '13px',
  medium: '16px',
  large: '18px',
  'x-large': '24px',
  'xx-large': '32px',
  'xxx-large': '48px',
};

const HTML_FONT_SIZE_TO_PX: Record<string, string> = {
  '1': '10px',
  '2': '13px',
  '3': '16px',
  '4': '18px',
  '5': '24px',
  '6': '32px',
  '7': '48px',
};

const LEGACY_CLASS_TO_PX: Record<string, string> = {
  'text-XS': '12px',
  'text-S': '14px',
  'text-M': '16px',
  'text-L': '18px',
  'text-XL': '24px',
  'text-XXL': '32px',
  'text-XXXL': '48px',
};

const normalizeStyleFontSize = (raw: string, forcedPx?: string): string => {
  const value = raw.trim().toLowerCase();
  if (!value) return forcedPx || raw;
  if (forcedPx) return forcedPx;
  return BROWSER_FONT_SIZE_TO_PX[value] || raw;
};

const normalizeElement = (element: HTMLElement, forcedPx?: string) => {
  Object.entries(LEGACY_CLASS_TO_PX).forEach(([className, px]) => {
    if (element.classList.contains(className)) {
      element.style.fontSize = forcedPx || px;
      element.classList.remove(className);
    }
  });

  if (element.style.fontSize) {
    element.style.fontSize = normalizeStyleFontSize(element.style.fontSize, forcedPx);
  }
};

/**
 * Convert browser keyword sizes (`xxx-large`) and legacy CMS classes
 * (`text-S`, `text-XXXL`) into exact pixel values.
 *
 * Why arbitrary pixel values are safer for a CMS:
 * the admin chooses exact visual output, so we persist the literal CSS
 * (`font-size: 20px`) instead of design-system aliases that can drift.
 */
export const normalizeRichTextContainerFontSizes = (root: ParentNode, forcedPx?: string) => {
  root.querySelectorAll<HTMLElement>('*').forEach((element) => normalizeElement(element, forcedPx));

  root.querySelectorAll('font[size]').forEach((node) => {
    const font = node as HTMLFontElement;
    const span = document.createElement('span');
    const mappedSize = forcedPx || HTML_FONT_SIZE_TO_PX[font.getAttribute('size') || ''] || '16px';
    span.style.fontSize = mappedSize;
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
};

export const normalizeRichTextHtml = (html: string, forcedPx?: string): string => {
  if (!html) return '';

  if (typeof document === 'undefined') {
    let next = html;
    Object.entries(BROWSER_FONT_SIZE_TO_PX).forEach(([keyword, px]) => {
      const replacement = forcedPx || px;
      next = next.replace(new RegExp(`font-size\\s*:\\s*${keyword}`, 'gi'), `font-size: ${replacement}`);
    });
    Object.entries(LEGACY_CLASS_TO_PX).forEach(([className, px]) => {
      const replacement = forcedPx || px;
      next = next.replace(new RegExp(className, 'g'), '');
      next = next.replace(/style=(['"])(.*?)\1/g, (_match, quote, style) => `style=${quote}${style}; font-size: ${replacement}${quote}`);
    });
    return next;
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  normalizeRichTextContainerFontSizes(template.content, forcedPx);
  return template.innerHTML;
};
