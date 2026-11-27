// Fills the CSP's connect-src with the exact origins of the two APIs (no wildcard host).
export function writeConfig(template, urls) {
  const origins = urls.map((u) => {
    const url = new URL(u);
    if (url.protocol !== "https:") throw new Error(`Not an https URL: ${url.origin}`);
    if (url.pathname !== "/" || url.search || url.hash)
      throw new Error(`Expected an origin only (no path, query or fragment): ${url.origin}`);
    return url.origin;
  });
  return template.replace("__API_ORIGINS__", origins.join(" "));
}
