// api/email-sync.js
// Fetches recent Outlook emails and runs them through AI analysis
// Can be triggered manually (POST /api/email-sync) or via Vercel Cron

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Refresh the Microsoft access token using stored refresh token
async function getAccessToken() {
    const { data: tokenRow, error } = await supabase
        .from('email_tokens')
        .select('*')
        .eq('id', 'outlook_token')
        .single();

    if (error || !tokenRow) throw new Error('No Outlook token found. Please connect your account.');

    // If token is still valid (with 5 min buffer), use it
    const expiresAt = new Date(tokenRow.expires_at);
    if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
        return tokenRow.access_token;
    }

    // Otherwise refresh it
    const tenantId = process.env.AZURE_TENANT_ID;
    const tokenRes = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.AZURE_CLIENT_ID,
                client_secret: process.env.AZURE_CLIENT_SECRET,
                refresh_token: tokenRow.refresh_token,
                grant_type: 'refresh_token',
                scope: 'https://graph.microsoft.com/Mail.Read offline_access',
            }),
        }
    );

    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(`Token refresh failed: ${tokens.error_description}`);

    // Update stored tokens
    await supabase.from('email_tokens').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || tokenRow.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    }).eq('id', 'outlook_token');

    return tokens.access_token;
}

// Fetch emails from the last 24 hours (or custom window)
async function fetchRecentEmails(accessToken, hoursBack = 24) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const url = `https://graph.microsoft.com/v1.0/me/messages?` +
        `$filter=receivedDateTime ge ${since}&` +
        `$select=id,subject,from,receivedDateTime,bodyPreview,body&` +
        `$top=50&` +
        `$orderby=receivedDateTime desc`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    if (data.error) throw new Error(`Graph API error: ${data.error.message}`);

    return data.value || [];
}

// Use GPT-4o to classify and extract investor info from an email
async function analyzeEmail(email, investors) {
    const investorList = investors
        .map(inv => `- ${inv.name} (${inv.fund || 'No fund'}) — Current stage: ${inv.stage}`)
        .join('\n');

    const prompt = `You are an investor relations assistant for a startup. 
Analyze this email and determine if it relates to investor communications.

Known investors in our tracker:
${investorList}

Email details:
From: ${email.from?.emailAddress?.name || 'Unknown'} <${email.from?.emailAddress?.address || ''}>
Date: ${email.receivedDateTime}
Subject: ${email.subject}
Body: ${(email.bodyPreview || '').substring(0, 800)}

Respond with ONLY valid JSON in this exact format:
{
  "is_investor_related": true or false,
  "matched_investor_name": "exact investor name from the list above, or null",
  "contact_name": "name of the person who sent the email",
  "extracted_status": "one of: Not Contacted, Contacted, Intro Call, NDA Shared, Deck Shared, Term Sheet, Closed / Dropped — or null if unclear",
  "extracted_discussion_point": "1-2 sentence summary of what was discussed, or null",
  "extracted_date": "YYYY-MM-DD format date of the interaction, or null",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of why you matched this investor"
}`;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
    });

    return JSON.parse(completion.choices[0].message.content);
}

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get current investors for matching
        const { data: investors, error: invError } = await supabase
            .from('investors')
            .select('id, name, fund, stage');

        if (invError) throw invError;

        // Get access token (refreshes if needed)
        const accessToken = await getAccessToken();

        // Fetch recent emails
        const hoursBack = parseInt(req.query.hours || '24');
        const emails = await fetchRecentEmails(accessToken, hoursBack);

        const results = {
            processed: 0,
            investor_related: 0,
            skipped_duplicates: 0,
            errors: 0,
        };

        for (const email of emails) {
            try {
                // Skip if already processed (dedup by email ID)
                const { data: existing } = await supabase
                    .from('email_suggestions')
                    .select('id')
                    .eq('email_id', email.id)
                    .single();

                if (existing) {
                    results.skipped_duplicates++;
                    continue;
                }

                results.processed++;

                // Run AI analysis
                const analysis = await analyzeEmail(email, investors);

                if (!analysis.is_investor_related || analysis.confidence < 0.5) continue;

                results.investor_related++;

                // Find matched investor ID
                const matchedInvestor = analysis.matched_investor_name
                    ? investors.find(inv =>
                        inv.name.toLowerCase().includes(analysis.matched_investor_name.toLowerCase()) ||
                        analysis.matched_investor_name.toLowerCase().includes(inv.name.toLowerCase())
                    )
                    : null;

                // Store suggestion for human review
                await supabase.from('email_suggestions').insert({
                    email_id: email.id,
                    email_subject: email.subject,
                    email_from: `${email.from?.emailAddress?.name} <${email.from?.emailAddress?.address}>`,
                    email_date: email.receivedDateTime?.split('T')[0],
                    email_snippet: email.bodyPreview?.substring(0, 500),
                    matched_investor_id: matchedInvestor?.id || null,
                    matched_investor_name: analysis.matched_investor_name,
                    extracted_status: analysis.extracted_status,
                    extracted_discussion_point: analysis.extracted_discussion_point,
                    extracted_date: analysis.extracted_date,
                    confidence: analysis.confidence,
                    status: 'pending',
                });

            } catch (emailErr) {
                console.error(`Error processing email ${email.id}:`, emailErr);
                results.errors++;
            }
        }

        res.json({
            success: true,
            message: `Processed ${results.processed} emails, found ${results.investor_related} investor-related`,
            ...results,
        });

    } catch (err) {
        console.error('Email sync error:', err);
        res.status(500).json({ error: err.message });
    }
}
