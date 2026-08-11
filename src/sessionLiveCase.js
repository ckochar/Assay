export const LIVE_CASE_KEY = "assay.live.case";
export const LIVE_PDF_KEY = "assay.live.pdf";

export function saveLiveCaseSession({ review, pdfBase64, fileName = "live-source.pdf" }) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LIVE_CASE_KEY, JSON.stringify(review));
  if (pdfBase64) {
    window.sessionStorage.setItem(LIVE_PDF_KEY, JSON.stringify({ pdfBase64, fileName }));
  }
}

export function loadLiveCaseSession() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(LIVE_CASE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function loadLivePdfSession() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(LIVE_PDF_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function clearLiveCaseSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LIVE_CASE_KEY);
  window.sessionStorage.removeItem(LIVE_PDF_KEY);
}
