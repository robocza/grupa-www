// Server only. Sends transactional email through the MailerSend API, where robocza.org is a
// verified sending domain (SPF and DKIM are set up in DNS).

const API_URL = 'https://api.mailersend.com/v1/email';

export interface EmailAddress {
    email: string;
    name?: string;
}

export interface Email {
    from: EmailAddress;
    to: EmailAddress[];
    replyTo?: EmailAddress;
    subject: string;
    html: string;
    text: string;
}

function apiToken(): string | undefined {
    // As in stripe.ts: import.meta.env is replaced at build time, so it may only be used in dev.
    return process.env.MAILERSEND_API_TOKEN ?? (import.meta.env.DEV ? import.meta.env.MAILERSEND_API_TOKEN : undefined);
}

// Throws if the token is missing or MailerSend rejects the email, so the caller can report
// the failure (the Stripe webhook then retries).
export async function sendEmail(email: Email): Promise<void> {
    const token = apiToken();
    if (!token) {
        throw new Error('MAILERSEND_API_TOKEN is not set');
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: email.from,
            to: email.to,
            reply_to: email.replyTo,
            subject: email.subject,
            html: email.html,
            text: email.text,
        }),
    });

    if (!response.ok) {
        throw new Error(`MailerSend responded ${response.status}: ${await response.text()}`);
    }
}
