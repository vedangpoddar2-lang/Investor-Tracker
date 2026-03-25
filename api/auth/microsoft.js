// api/auth/microsoft.js
// Redirects user to Microsoft OAuth login page

export default function handler(req, res) {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const redirectUri = `${process.env.VITE_APP_URL}/api/auth/callback`;

    const scopes = [
        'https://graph.microsoft.com/Mail.Read',
        'offline_access',
        'openid',
        'profile',
    ].join(' ');

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scopes,
        response_mode: 'query',
    });

    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
    res.redirect(authUrl);
}
