// Site settings that come from the build environment, so no account IDs live in the code.
// Set them as GitHub repository variables (see README) and the deploy workflow passes them in.

const env = import.meta.env;

export const CONFIG = {
  /** Stripe Payment Link for the supporter pack. Its success URL should be <site>/?supporter=thanks */
  supporterCheckoutUrl: (env.VITE_SUPPORTER_CHECKOUT_URL as string | undefined) ?? '',
  supporterPrice: '$3',
  /** Where the feedback form posts. With a key it is a Supabase REST table, like https://<ref>.supabase.co/rest/v1/feedback */
  feedbackUrl: (env.VITE_FEEDBACK_URL as string | undefined) ?? '',
  /** Supabase publishable (anon) key. The table only allows inserts, so it is safe to ship. */
  feedbackKey: (env.VITE_FEEDBACK_KEY as string | undefined) ?? '',
};
