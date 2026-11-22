import config from "../public/staticwebapp.config.json";

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https://login.microsoftonline.com https://*.azurecontainerapps.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

test("test_the_static_web_app_config_sets_the_csp", () => {
  expect(config.globalHeaders["Content-Security-Policy"]).toBe(CSP);
  expect(config.globalHeaders["X-Content-Type-Options"]).toBe("nosniff");
  expect(config.globalHeaders["Referrer-Policy"]).toBe("no-referrer");
  expect(config.navigationFallback.rewrite).toBe("/index.html");
});
