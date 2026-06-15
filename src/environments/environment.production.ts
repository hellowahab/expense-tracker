export const environment = {
  production: true,
  apiUrl: '',  // no API in production — localStorage handles everything
  // Public OAuth client ID (not a secret) — locked to drive.appdata only.
  // Same client serves dev + prod; both origins are registered on the client.
  googleClientId: '722703659812-b3m6b2cuh1t04msh6ms44gkg3cks34vu.apps.googleusercontent.com'
};