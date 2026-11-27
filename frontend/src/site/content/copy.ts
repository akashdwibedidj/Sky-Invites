import type {
  BusinessTypeOption,
  CategoryInfo,
  FaqItem,
  FeatureItem,
  HowItWorksStep,
  MonthlyVolumeOption,
  PricingTier,
} from '../types';

/**
 * Centralized copy dictionary for Sky Invites.
 * Every visible heading, label, message, FAQ, and error lives here
 * so wording can be edited in one place.
 */
export const COPY = {
  brand: {
    name: 'Sky Invites',
    footerTagline: 'Invitations that feel as special as your celebration.',
    footerBottomNote: 'Made for weddings, birthdays, and family celebrations',
  },

  nav: {
    howItWorks: 'How it works',
    examples: 'Examples',
    pricing: 'Pricing',
    business: 'For Businesses',
    faq: 'FAQ',
    login: 'Login',
    dashboard: 'My Invitations',
    createCta: 'Create your invite',
    openMenuLabel: 'Open menu',
    closeMenuLabel: 'Close menu',
  },

  footer: {
    links: [
      { label: 'For Businesses', to: '/business' },
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Refund', to: '/refund' },
      { label: 'Contact', to: '/contact' },
    ],
  },

  home: {
    hero: {
      headline: 'Invitations your guests will actually watch.',
      subline:
        'Tell us about your celebration. We turn it into a beautiful invitation, ready to send on WhatsApp in minutes.',
      ctaPrimary: 'Create free invite',
    },
    categories: {
      heading: 'For every milestone worth sharing',
      subline: 'Pick an occasion to start with wording and colors that fit the moment.',
    },
    businessCallout: {
      heading: 'Making invitations for your clients?',
      subline: 'Create beautiful invitations for every client, faster than ever.',
      cta: 'Explore for businesses',
    },
    howItWorks: {
      heading: 'How it works',
      subline: 'Four simple steps from a quick note to an invitation you are proud to send.',
    },
    examples: {
      heading: 'Invitations for every celebration',
      subline: 'Browse real-world examples across weddings, birthdays, anniversaries, and more.',
      allFilter: 'All',
      scrollLeftLabel: 'See earlier examples',
      scrollRightLabel: 'See more examples',
    },
    features: {
      heading: 'Designed to feel personal',
      subline:
        'Warm details, easy editing, and clear sharing built for hosts and families—no design skills needed.',
    },
    waitlist: {
      eyebrow: 'Video invitations',
      heading: 'Be the first to send a video invitation.',
      subline:
        'Leave your details below and we will notify you first when video invitations open, with a special launch offer for early members.',
      nameLabel: 'Your name',
      namePlaceholder: 'Ananya Sharma',
      emailLabel: 'Email address',
      emailPlaceholder: 'ananya@example.com',
      whatsappLabel: 'WhatsApp number',
      optionalHint: '(optional)',
      whatsappPlaceholder: '+91 98765 43210',
      eventLabel: 'What are you celebrating?',
      submitLabel: 'Join the waitlist',
      submittingLabel: 'Saving your spot…',
      errorEmptyName: 'Please tell us your name.',
      errorInvalidEmail: 'That email address looks incomplete. Please check and try again.',
      errorFallback: "We couldn't save your spot right now. Please try again in a moment.",
      successMessage: "You're on the list. We'll write as soon as video invitations open.",
    },
    pricingPreview: {
      heading: 'Simple plans for every celebration',
      subline: 'Try image invitations free today. Paid video invitations launch soon.',
    },
    faq: {
      heading: 'Questions & answers',
    },
    finalCta: {
      heading: 'Make a first impression your guests remember',
      subline:
        'Create a free image invitation in minutes today, or save your spot for invite videos.',
      ctaPrimary: 'Create free invite',
      ctaSecondary: 'Join the waitlist',
    },
  },

  previewModal: {
    closeLabel: 'Close preview',
    steps: [
      '1 · Opening look & welcome',
      '2 · Names & occasion',
      '3 · Date, place & note for guests',
    ],
    note: 'Preview of how your invitation unfolds. Image invitations can be edited and downloaded today; full invite videos are coming soon.',
    pause: 'Pause',
    play: 'Play',
    restart: 'Restart',
    cta: 'Create in this style',
  },

  pricingPage: {
    eyebrow: 'Pricing',
    heading: 'Try it free today',
    subline:
      'Create and download image invitations at no cost today.',
    tabs: {
      individuals: 'For Individuals',
      businesses: 'For Businesses',
    },
    individualsDetails: {
      heading: 'Included with every invitation',
      items: [
        {
          title: 'Made for your guests’ phones',
          body: 'Every invitation opens cleanly on WhatsApp and phone screens so guests can read every detail clearly.',
        },
        {
          title: 'Special launch offer',
          body: 'People who join our waitlist receive early notice and a launch discount when video invitations arrive.',
        },
      ],
      billingHeading: 'Good to know',
      tryCta: 'Create free invite',
      businessLink: 'Creating invitations for clients? See For Businesses',
    },
    businessesDetails: {
      heading: 'Business plans coming soon',
      subline:
        'We are preparing plans for invitation companies, wedding planners, event agencies, and print studios. Share a few details about your work and we will get back to you within one working day.',
      talkCta: 'Talk to us',
    },
  },

  businessPage: {
    hero: {
      eyebrow: 'For Businesses',
      heading: "Your clients' invitations, made in minutes.",
      subline:
        'Deliver beautiful invitations to more couples and families, without long design waits.',
      ctaPrimary: 'Talk to us',
      ctaSecondary: 'See how it works',
    },
    whoWeHelp: {
      heading: 'Who we help',
      subline: 'Made for teams who craft memorable celebrations for other people.',
      cards: [
        {
          title: 'Invitation & card companies',
          description:
            'Offer digital and video invitations alongside your printed suites without adding extra design hours.',
        },
        {
          title: 'Wedding planners',
          description:
            'Give couples warm save-the-dates and event updates ready to send on WhatsApp the very same day.',
        },
        {
          title: 'Event agencies',
          description:
            'Keep invitations consistent across milestone birthdays, family gatherings, and company events.',
        },
        {
          title: 'Print & design studios',
          description:
            'Turn client event briefs into polished starting drafts quickly so your team can focus on finishing touches.',
        },
      ],
    },
    benefits: {
      heading: 'Why businesses use Sky Invites',
      subline: 'Less back-and-forth, happier clients, and room to take on more events.',
      items: [
        {
          index: '01',
          title: 'Say yes to more clients',
          description:
            'Create invitations quickly enough to accept last-minute bookings and peak-season requests.',
        },
        {
          index: '02',
          title: 'Faster turnaround',
          description:
            'Go from a client conversation to a shareable invitation draft in minutes instead of days.',
        },
        {
          index: '03',
          title: 'One consistent look for every event',
          description:
            'Keep names, colors, fonts, and event details balanced from the first welcome line to the closing note.',
        },
        {
          index: '04',
          title: 'Your clients can review and approve',
          description:
            'Share clear drafts with couples and families so wording updates happen without confusion.',
        },
        {
          index: '05',
          title: 'Easy to share on WhatsApp',
          description:
            'Deliver invitations in the exact format families prefer to forward to their guest lists.',
        },
        {
          index: '06',
          title: 'Your brand, your way',
          badge: 'Coming soon',
          description:
            'Add your studio name and branding on client deliveries. Custom branding and team access are coming soon.',
        },
      ],
    },
    howItWorks: {
      heading: 'How it works for businesses',
      subline: 'Simple from your first client enquiry to final delivery.',
      steps: [
        {
          number: '01',
          title: 'Tell us about your business',
          description:
            'Share how many invitations you create each month and the kinds of celebrations your clients book.',
        },
        {
          number: '02',
          title: 'Create invitations for each client',
          description:
            'Enter each family’s details and get an invitation tailored to their celebration in minutes.',
        },
        {
          number: '03',
          title: 'Share for approval and changes',
          description:
            'Send the draft to your client and update names, timings, or colors whenever they ask.',
        },
        {
          number: '04',
          title: 'Deliver and delight',
          description:
            'Hand over a finished invitation your clients are excited to share with every guest.',
        },
      ],
    },
    faq: {
      heading: 'Business questions',
      items: [
        {
          id: 'biz-faq-1',
          question: 'Can I create invitations for many clients?',
          answer:
            'Yes. You can keep separate invitations for each couple, family, or company event and reopen any of them whenever details change.',
        },
        {
          id: 'biz-faq-2',
          question: 'Can my clients make changes?',
          answer:
            'You can share a preview with your client for feedback and quickly update names, dates, places, or wording before delivering the final copy.',
        },
        {
          id: 'biz-faq-3',
          question: 'Will my branding be on the invitations?',
          answer:
            'Paid invitations are delivered cleanly without a Sky Invites watermark. Dedicated studio branding options are coming soon.',
        },
        {
          id: 'biz-faq-4',
          question: 'How is pricing worked out?',
          answer:
            'Plans are based on roughly how many invitations your business creates each month. Send us a quick note below and we will share full pricing before launch.',
        },
        {
          id: 'biz-faq-5',
          question: 'How do I get started?',
          answer:
            'Fill out the short enquiry form below. We will reach out within one working day to learn about your work and set up access.',
        },
      ],
    },
    enquiry: {
      eyebrow: 'Get in touch',
      heading: 'Tell us about your business',
      subline:
        'Share a few details below and our team will reply within one working day.',
      businessNameLabel: 'Business name',
      businessNamePlaceholder: 'Marigold Wedding Co.',
      contactNameLabel: 'Your name',
      contactNamePlaceholder: 'Rohan Verma',
      workEmailLabel: 'Work email',
      workEmailPlaceholder: 'rohan@marigoldweddings.com',
      whatsappLabel: 'WhatsApp number',
      whatsappOptional: '(optional)',
      whatsappPlaceholder: '+91 98765 43210',
      businessTypeLabel: 'Business type',
      businessTypes: [
        'Invitation company',
        'Wedding planner',
        'Event agency',
        'Print studio',
        'Other',
      ] as BusinessTypeOption[],
      volumeLabel: 'Invitations per month',
      volumes: ['Under 10', '10 to 50', '50 to 200', '200+'] as MonthlyVolumeOption[],
      messageLabel: 'Message',
      messagePlaceholder: 'Tell us a little about the invitations you make for your clients…',
      submitLabel: 'Send enquiry',
      submittingLabel: 'Sending…',
      errorRequired: 'Please fill in your business name, your name, and a short message.',
      errorEmail: 'Please enter a valid work email address.',
      errorFallback: "We couldn't send your enquiry right now. Please try again shortly.",
      successMessage: "Thank you! We'll get back to you within one working day.",
    },
  },

  auth: {
    eyebrow: 'Sky Invites',
    loginHeading: 'Welcome back',
    loginSubline: 'Sign in to open your saved invitations and pick up where you left off.',
    signupHeading: 'Start creating your invitation',
    signupSubline: 'Save your drafts, edit any detail later, and keep all your celebrations in one place.',
    googleCta: 'Continue with Google',
    orEmail: 'or with email',
    nameLabel: 'Your name',
    namePlaceholder: 'Meera Kapoor',
    emailLabel: 'Email address',
    emailPlaceholder: 'meera@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 6 characters',
    accountTypeLabel: "I'm signing up as",
    accountTypeOptional: '(optional)',
    accountTypeIndividual: 'Individual or family',
    accountTypeBusiness: 'Business or planner',
    loginSubmit: 'Sign in',
    loginSubmitting: 'Signing in…',
    signupSubmit: 'Create account',
    signupSubmitting: 'Creating account…',
    loginPrompt: 'New to Sky Invites? ',
    loginLink: 'Create an account',
    signupPrompt: 'Already have an account? ',
    signupLink: 'Sign in',
    sideQuote: '“An invitation should feel like opening a warm handwritten note from someone you love.”',
    errors: {
      missingName: 'Please enter your name so we know what to call you.',
      invalidEmail: "That email address doesn't look right. Please check and try again.",
      shortPassword: 'Please choose a password with at least 6 characters.',
      genericAuth: "That email or password doesn't look right. Please try again.",
      googleAuth: "We couldn't finish signing in with Google. Please try again.",
    },
  },

  dashboard: {
    eyebrow: 'Sky Invites',
    headingFallback: 'Your invitations',
    headingPrefix: 'Welcome,',
    subline: 'Reopen your saved invitations, update details anytime, or start a new one.',
    createButton: 'Create new invitation',
    signOutButton: 'Sign out',
    loadingError: "We couldn't load your invitations right now. Please refresh to try again.",
    emptyHeading: "You haven't made an invitation yet.",
    emptySubline: "Let's make your first one—tell us about your celebration and see it come together in minutes.",
    emptyCta: 'Make your first invitation',
    openButton: 'Open',
    statuses: {
      draft: 'Draft',
      ready: 'Ready',
      videoComingSoon: 'Video coming soon',
    },
  },

  createPage: {
    backHome: 'Back to home',
    studioLabelPrefix: 'Sky Invites',
    heading: 'Your invitation editor loads here',
    sublinePrefix: 'This page connects to your Sky Invites editor with',
    sublineSuffix: 'ready to start.',
    sampleLabelPrefix: 'Example idea',
    viewDashboard: 'View your invitations',
    backToExamples: 'See examples',
  },

  contactPage: {
    eyebrow: 'Contact us',
    heading: 'Sky Invites',
    subline:
      'Have a question about an invitation, early access, or creating invites for clients? Send us a message and we will reply within 2 to 4 working days.',
    emailAddress: 'skyinvitesofficial@gmail.com',
    phoneNumber: '+918594866910',
    phoneDisplay: '+91 8594866910, Monday to Saturday, 10am to 6pm IST',
    address: 'Old Town, Bhubaneswar, Odisha 751002, India',
    replyTime: 'We reply within 2 to 4 working days.',
    nameLabel: 'Your name',
    namePlaceholder: 'Rohan Verma',
    emailLabel: 'Email address',
    emailPlaceholder: 'rohan@example.com',
    reasonLabel: 'What is this about?',
    reasons: [
      'General question',
      'My invitation',
      'Business enquiries',
      'Video invitations waitlist',
    ],
    subjectLabel: 'Subject',
    subjectPlaceholder: 'Question about a wedding invitation',
    messageLabel: 'Message',
    messagePlaceholder: 'Tell us how we can help…',
    submitLabel: 'Send message',
    submittingLabel: 'Sending…',
    errorRequired: 'Please enter your name, subject, and message.',
    errorEmail: "That email address doesn't look right. Please check and try again.",
    errorFallback: "We couldn't send your message right now. Please try again.",
    successMessage: 'Thank you for writing to us. We will reply within 2 to 4 working days.',
  },

  protectedRoute: {
    loading: 'Opening your invitations…',
  },

  legal: {
    backHome: 'Back to home',
    terms: {
      title: 'Terms of Service',
      updated: 'Last updated: 27/11/2026',
      sections: [
        {
          heading: 'Who we are',
          body: 'Sky Invites is run by Akash Dwibedi, Bhubaneswar, India. Contact: skyinvitesofficial@gmail.com.',
        },
        {
          heading: 'The service',
          body: 'You describe your event, and we create invitation images and videos for you to edit, download and share.',
        },
        {
          heading: 'Your account',
          body: 'You must give correct details and keep your password safe. You are responsible for activity on your account.',
        },
        {
          heading: 'Credits and prices',
          body: 'Prices are in Indian rupees and shown before you pay. Credits are added to your account immediately after payment is confirmed, and invitations are available to download in your account. Credits never expire. Prices may change, but not for credits you have already bought.',
        },
        {
          heading: 'Limits',
          body: 'Each card allows one regeneration of its image and one video generation. We may change these limits for future purchases.',
        },
        {
          heading: 'Your content',
          body: 'You own the names, text and details you provide. You give us permission to use them only to create and deliver your invitations. You must not submit anything unlawful, hateful, or about someone without your right to use it.',
        },
        {
          heading: 'Your invitations',
          body: 'You may use the downloaded invitations for your own events and, if you are a business, for your clients. The results are generated, so they may not be unique and you may not get exactly what you imagined.',
        },
        {
          heading: 'Acceptable use',
          body: 'Do not misuse the service, try to break it, or resell access to it.',
        },
        {
          heading: 'Availability',
          body: 'We work to keep the service running but cannot promise it will always be available. Generation can occasionally fail, and in that case you are not charged.',
        },
        {
          heading: 'Liability',
          body: 'To the extent the law allows, our liability is limited to the amount you paid for the affected order. We are not responsible for losses from third parties, such as the people you send invitations to.',
        },
        {
          heading: 'Changes and ending',
          body: 'We may update these terms, and we will show the date above. We may suspend accounts that break these terms.',
        },
        {
          heading: 'Law and disputes',
          body: 'These terms follow Indian law. Courts at Bhubaneswar have jurisdiction.',
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      updated: 'Last updated: 27/11/2026',
      sections: [
        {
          heading: 'What we collect',
          body: 'Your name, email, sign-in details (a password is stored only in hashed form, or your Google account name and email if you use Google sign-in), the event details and wording you enter, the invitations created, and your order and credit history.',
        },
        {
          heading: 'Forms',
          body: 'If you join early access or write to us, we keep your name, email and message so we can reply.',
        },
        {
          heading: 'Payments',
          body: 'Payments are handled by Razorpay. We do not see or store your card, UPI or bank details. We keep the order ID, amount and status.',
        },
        {
          heading: 'Why we use it',
          body: 'To create your invitations, run your account, process payments, give support, and keep the service safe.',
        },
        {
          heading: 'Who we share it with',
          body: 'Service providers that help us run Sky Invites: Google (sign-in), Razorpay, and OpenAI and xAI, which help us create images and videos. Your event details are sent to them only to deliver your invitation. We do not sell your data.',
        },
        {
          heading: 'Storage and security',
          body: 'Your invitations are visible only to your account. We protect data with access controls and encryption in transit. No system is perfectly secure.',
        },
        {
          heading: 'How long we keep it',
          body: 'Account data is kept until you delete your account, and payment records for as long as Indian law requires.',
        },
        {
          heading: 'Your choices',
          body: 'You can ask to see, correct or delete your data by writing to skyinvitesofficial@gmail.com. We will respond within 30 days.',
        },
        {
          heading: 'Cookies',
          body: 'We use only the browser storage needed to keep you signed in.',
        },
        {
          heading: 'Children',
          body: 'The service is for adults.',
        },
        {
          heading: 'Grievance contact',
          body: 'Akash Dwibedi, skyinvitesofficial@gmail.com.',
        },
        {
          heading: 'Changes',
          body: 'We will show updates and the date here.',
        },
      ],
    },
    refund: {
      title: 'Refund and Cancellation Policy',
      updated: 'Last updated: 27/11/2026',
      sections: [
        {
          heading: 'Credits',
          body: 'You buy credits to create invitation images and videos. Credits never expire.',
        },
        {
          heading: 'Free credits',
          body: 'The 2 free image credits given to new accounts have no cash value and cannot be refunded.',
        },
        {
          heading: 'Failed creations',
          body: 'If an image or video fails to generate, you are not charged. The credit is returned to your account automatically.',
        },
        {
          heading: 'Unused purchases',
          body: 'If you have not used any credits from a purchase, you can ask for a refund within 7 days of payment. Write to skyinvitesofficial@gmail.com with your order ID.',
        },
        {
          heading: 'Used credits',
          body: 'Once any credit from a purchase has been used, that purchase is not refundable, because the work has been delivered.',
        },
        {
          heading: 'Problems with your result',
          body: 'If something is wrong with a delivered invitation, write to us within 7 days and we will look into it.',
        },
        {
          heading: 'How refunds are paid',
          body: 'Approved refunds go back to the original payment method within 5 to 7 working days of approval, depending on your bank.',
        },
        {
          heading: 'Cancellation',
          body: 'There are no subscriptions, so there is nothing to cancel.',
        },
      ],
    },
  },

  categoriesList: [
    {
      name: 'Wedding',
      folioNumber: '01',
      tagline: 'For the day you have dreamed about.',
      sampleIdea: 'A warm candlelit courtyard wedding for Aarav & Meera in Udaipur this November',
    },
    {
      name: 'Engagement',
      folioNumber: '02',
      tagline: 'Share the happy news with everyone close to you.',
      sampleIdea: 'An evening ring ceremony under fairy lights with family and friends',
    },
    {
      name: 'Birthday',
      folioNumber: '03',
      tagline: 'Make every year feel like an occasion.',
      sampleIdea: 'A sunlit 30th garden dinner with wildflowers and warm gold accents',
    },
    {
      name: 'Baby Shower',
      folioNumber: '04',
      tagline: 'Welcome a little one with warmth and joy.',
      sampleIdea: 'A gentle morning tea shower in soft ivory and blush flowers',
    },
    {
      name: 'Anniversary',
      folioNumber: '05',
      tagline: 'Celebrate the years you have built together.',
      sampleIdea: 'A 25th silver anniversary family dinner in Jaipur',
    },
    {
      name: 'Corporate',
      folioNumber: '06',
      tagline: 'Thoughtful invites for dinners, launches, and gatherings.',
      sampleIdea: 'An evening founders dinner in Mumbai with clean dark-green accents',
    },
  ] satisfies CategoryInfo[],

  howItWorksSteps: [
    {
      number: '01',
      title: 'Tell us about your event',
      description:
        'Share the names, date, place, and feeling you want—like a sunlit garden dinner or an evening family celebration.',
    },
    {
      number: '02',
      title: 'See your invitation come to life',
      description:
        'Our AI brings your words together into a warm, finished invitation with matching colors, borders, and wording.',
    },
    {
      number: '03',
      title: 'Make it yours',
      description:
        'Change the names, timing, dress note, fonts, or colors anytime until every detail feels right.',
    },
    {
      number: '04',
      title: 'Share with everyone you love',
      description:
        'Download your invitation in moments and send it straight to family and friends on WhatsApp.',
    },
  ] satisfies HowItWorksStep[],

  featuresList: [
    {
      id: 'made-for-you',
      index: '01',
      title: 'Made just for you',
      description:
        'Every detail reflects your names, your venue, and the warmth of your gathering.',
    },
    {
      id: 'one-beautiful-look',
      index: '02',
      title: 'One beautiful look from start to finish',
      description:
        'Colors, borders, and wording stay harmonious from the opening welcome through to your RSVP note.',
    },
    {
      id: 'your-words-fonts',
      index: '03',
      title: 'Your words, your fonts',
      description:
        'Edit couple names, family blessings, timings, and fonts directly whenever plans evolve.',
    },
    {
      id: 'gentle-movement',
      index: '04',
      title: 'Gentle, elegant movement',
      description:
        'Invite videos are paced softly so guests can read every word comfortably without rushing.',
    },
    {
      id: 'easy-to-share',
      index: '05',
      title: 'Easy to share',
      description:
        'Designed to open cleanly on phones so sharing on WhatsApp and family groups takes seconds.',
    },
    {
      id: 'for-every-occasion',
      index: '06',
      title: 'For every occasion',
      description:
        'Warm styles for weddings, engagements, milestone birthdays, baby showers, anniversaries, and dinners.',
    },
  ] satisfies FeatureItem[],

  individualPlans: [
    {
      id: 'free-invite',
      name: 'Free Invite',
      badge: 'Try it, no card needed',
      priceLabel: '₹0',
      cadence: 'Available today',
      description:
        'Create an image invitation from your words, update names and dates anytime, and download it free.',
      features: [
        'Image invitations made for your event',
        'Edit names, dates, places, and wording anytime',
        'Choice of six celebration styles',
        'Download and share on WhatsApp',
      ],
      ctaLabel: 'Create free invite',
      highlighted: false,
      comingSoon: false,
    },
  ] satisfies PricingTier[],

  faqItems: [
    {
      id: 'faq-how',
      question: 'How does Sky Invites make my invitation?',
      answer:
        'Just write a few lines about your celebration—who it is for, when it is happening, and the mood you want. Sky Invites turns your words into a finished invitation with matching colors and clean wording.',
    },
    {
      id: 'faq-time',
      question: 'How long does it take?',
      answer:
        'Your first invitation draft is ready in under a minute. You can spend as little or as much time as you like adjusting names, dates, and colors before you download.',
    },
    {
      id: 'faq-edit',
      question: 'Can I change names, dates, and wording afterward?',
      answer:
        'Yes. Every line—from couple names and family notes to venue details and timings—can be edited anytime.',
    },
    {
      id: 'faq-share',
      question: 'How do I share my invitation with guests?',
      answer:
        'Once you are happy with your invitation, download it directly to your phone or computer and send it on WhatsApp, text message, or family chat groups.',
    },
    {
      id: 'faq-free',
      question: 'Is it free to try right now?',
      answer:
        'Yes. Making and downloading image invitations is completely free today, with no card required. Paid plans will apply when video invitations launch.',
    },
    {
      id: 'faq-launch',
      question: 'When will video invitations be ready?',
      answer:
        'Video invitations are opening very soon. Join the waitlist above and we will message you first with an early-member launch discount.',
    },
  ] satisfies FaqItem[],
} as const;
