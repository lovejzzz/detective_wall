// Photos published elsewhere on the web, pinned by the page that shows them ("page:<https URL>").
// The server fetches that page's own lead picture (see server/pageimage.ts), so the image comes
// from our origin and can be painted; the page itself is the credit.

export const pagePhotoOf = (imageUrl?: string) => (imageUrl?.startsWith("page:https://") ? imageUrl.slice(5) : null);

/** Where the browser loads the picture from. */
export const pagePhotoSrc = (page: string) => `/api/page-image?u=${encodeURIComponent(page)}`;

/** The publisher, for the credit line: "mainichi.jp", "keishicho.metro.tokyo.lg.jp". */
export function publisherOf(page: string): string {
  try {
    return new URL(page).hostname.replace(/^www\d?\./, "");
  } catch {
    return page;
  }
}

/** Loads a page's picture as an image element, ready to paint; null if it can't be had. */
export function loadPagePhoto(page: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth ? img : null);
    img.onerror = () => resolve(null);
    img.src = pagePhotoSrc(page);
  });
}
