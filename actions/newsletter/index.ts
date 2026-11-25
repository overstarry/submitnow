import { siteConfig } from '@/config/site';
import { NewsletterWelcomeEmail } from '@/emails/newsletter-welcome';
import { normalizeEmail, validateEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from '@/lib/unsubscribe-token';
import {
  addContactToAudience,
  getContactsFromAudience,
  removeContactFromAudience,
  sendEmail,
} from '../resend';

export async function subscribeToNewsletter(email: string) {
  try {
    await checkRateLimit();

    const normalizedEmail = normalizeEmail(email);
    const { isValid, error } = validateEmail(normalizedEmail);

    if (!isValid) {
      throw new Error(error || 'Invalid email address');
    }

    // Add to audience
    await addContactToAudience(normalizedEmail);

    // Build signed unsubscribe link
    const unsubscribeToken = createUnsubscribeToken(normalizedEmail);
    const unsubscribeUrl = new URL('/unsubscribe', siteConfig.url);
    unsubscribeUrl.searchParams.set('token', unsubscribeToken);
    const unsubscribeLink = unsubscribeUrl.toString();

    // Send welcome email
    await sendEmail({
      email: normalizedEmail,
      subject: `Welcome to ${siteConfig.name}`,
      react: NewsletterWelcomeEmail,
      reactProps: {
        email: normalizedEmail,
        unsubscribeLink,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Newsletter subscription failed:', error);
    throw error;
  }
}

export async function unsubscribeFromNewsletter(token: string) {
  try {
    await checkRateLimit();

    const verifiedEmail = verifyUnsubscribeToken(token);
    if (!verifiedEmail) {
      throw new Error('Invalid or expired unsubscribe link');
    }

    const normalizedEmail = normalizeEmail(verifiedEmail);
    const { isValid, error } = validateEmail(normalizedEmail);

    if (!isValid) {
      throw new Error(error || 'Invalid email address');
    }

    // Remove silently if present so unsubscribe links remain idempotent
    // without revealing whether an address was previously subscribed.
    const { data: contacts } = await getContactsFromAudience();
    const isSubscribed = Array.isArray(contacts)
      ? contacts.some((item: { email: string }) => item.email === normalizedEmail)
      : true;

    if (isSubscribed) {
      await removeContactFromAudience(normalizedEmail);
    }

    return { success: true, email: normalizedEmail };
  } catch (error) {
    console.error('Newsletter unsubscribe failed:', error);
    throw error;
  }
}
