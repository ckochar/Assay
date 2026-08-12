export const LIVE_CASE_KEY = "assay.live.case";
export const LIVE_PDF_KEY = "assay.live.pdf";

export function saveLiveCaseSession({ review, pdfBase64, fileName = "live-source.pdf" }) {
  if (typeof window === "undefined") return { caseStored: false, pdfStored: false };

  let caseStored = false;
  let pdfStored = false;

  try {
    window.sessionStorage.setItem(LIVE_CASE_KEY, JSON.stringify(review));
    caseStored = true;
  } catch {
    return { caseStored: false, pdfStored: false };
  }

  if (pdfBase64) {
    try {
      window.sessionStorage.setItem(LIVE_PDF_KEY, JSON.stringify({ pdfBase64, fileName }));
      pdfStored = true;
    } catch {
      // A base64 PDF can exceed browser sessionStorage quota. The QC case
      // remains usable with extracted evidence even when the source PDF cannot
      // be retained for the remainder of the browser session.
      window.sessionStorage.removeItem(LIVE_PDF_KEY);
    }
  } else {
    window.sessionStorage.removeItem(LIVE_PDF_KEY);
  }

  return { caseStored, pdfStored };
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
