// Site settings that come from the build environment, so no account IDs live in the code.
// Set them as GitHub repository variables (see README) and the deploy workflow passes them in.

const env = import.meta.env;

export const CONFIG = {
  /** Stripe Payment Link for the supporter pack. Its success URL should be <site>/?supporter=thanks */
  supporterCheckoutUrl: (env.VITE_SUPPORTER_CHECKOUT_URL as string | undefined) ?? '',
  supporterPrice: '$3',
  /** Where the feedback form posts: the KeyFlame Supabase project's feedback table. */
  feedbackUrl: (env.VITE_FEEDBACK_URL as string | undefined) || 'https://lmnsdqieycefnrjajknx.supabase.co/rest/v1/feedback',
  /**
   * The project's public anon key. It is meant to ship in web pages: the table only
   * accepts inserts from it, so nobody can read reports with it.
   */
  feedbackKey:
    (env.VITE_FEEDBACK_KEY as string | undefined) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbnNkcWlleWNlZm5yamFqa254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTQxMDksImV4cCI6MjEwODY3MDEwOX0.5ter3qKVhR_tJqaGEp7MqMp00ttpEDtUd4acIxnQ_yQ',
};
