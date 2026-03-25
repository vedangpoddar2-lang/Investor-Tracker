// api/auth/callback.js
// Handles Microsoft OAuth callback, stores tokens in Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Service role for server-side writes
);

export default async function handler(req, res) {
    const { code, error } = req.query;

    if (error) {
        return res.redirect(`/?error=oauth_error&message=${error}`);
    }

    if (!code) {
        return res.status(400).json({ error: 'No authorization code received' });
    }

    try {
        const tenantId = process.env.AZURE_TENANT_ID;
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;
        const redirectUri = `${process.env.VITE_APP_URL}/api/auth/callback`;

        // Exchange code for tokens
        const tokenRes = await fetch(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                    scope: 'https://graph.microsoft.com/Mail.Read offline_access openid profile',
                }),
            }
        );

        const tokens = await tokenRes.json();

        if (tokens.error) {
            console.error('Token exchange error:', tokens);
            return res.redirect(`/?error=token_error`);
        }

        // Store refresh token in Supabase (so we can refresh access later)
        const { error: dbError } = await supabase
            .from('email_tokens')
            .upsert({
                id: 'outlook_token', // Single row — one outlook account
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (dbError) {
            console.error('Failed to store token:', dbError);
            return res.redirect(`/?error=db_error`);
        }

        // Redirect back to the app with success
        res.redirect('/?email_connected=true');
    } catch (err) {
        console.error('Callback error:', err);
        res.redirect(`/?error=callback_error`);
    }
}
