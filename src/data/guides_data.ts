export interface GuideArticle {
  id: string;
  category: 'quickstart' | 'stylist' | 'wardrobe' | 'capsule' | 'studio' | 'inspirations' | 'profile' | 'gdpr';
  title: string;
  summary: string;
  readingTime: string;
  badge?: string;
  sections: {
    heading: string;
    content: string[];
    steps?: string[];
    callout?: {
      type: 'tip' | 'important' | 'info';
      text: string;
    };
  }[];
  faqs?: {
    question: string;
    answer: string;
  }[];
}

export interface GuideCategory {
  id: 'all' | 'quickstart' | 'stylist' | 'wardrobe' | 'capsule' | 'studio' | 'inspirations' | 'profile' | 'gdpr';
  title: string;
  icon: string;
  description: string;
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  { id: 'all', title: 'All guides', icon: '', description: 'Everything in one place.' },
  { id: 'quickstart', title: 'Getting started', icon: '', description: 'How the app is organised and the first three things to do.' },
  { id: 'stylist', title: 'Stylist', icon: '', description: 'Daily looks, occasions, weather, and teaching your stylist what you like.' },
  { id: 'wardrobe', title: 'Wardrobe', icon: '', description: 'Adding pieces, editing them, duplicates, insights and gaps.' },
  { id: 'capsule', title: 'Travel capsules', icon: '', description: 'Packing a small set of pieces for a trip, with a look for every day.' },
  { id: 'studio', title: 'Studio', icon: '', description: 'Arranging pieces into a flat-lay and saving it.' },
  { id: 'inspirations', title: "Inspiration & What's new", icon: '', description: 'Inspiration photos, the sources you follow, and your trend briefing.' },
  { id: 'profile', title: 'Profile & sizes', icon: '', description: 'How you dress, fit details, style, and your password.' },
  { id: 'gdpr', title: 'Privacy & security', icon: '', description: 'Downloading or deleting your data, and two-factor sign-in.' },
];

export const GUIDES_ARTICLES: GuideArticle[] = [
  {
    id: 'quickstart-overview',
    category: 'quickstart',
    title: 'Getting started with Atelier Edit',
    summary: 'Atelier Edit suggests outfits from the clothes you already own. Here is how it is organised.',
    readingTime: '2 min read',
    badge: 'Start here',
    sections: [
      {
        heading: 'How the app is organised',
        content: [
          'Today: your Stylist (daily looks) and What\'s new (this season\'s trends read against your wardrobe).',
          'Wardrobe: your Pieces, travel Capsules and the flat-lay Studio.',
          'Inspiration: photos you have saved and the sources you follow.',
          'The Account menu (top right) holds your profile and sizes, these guides, and sign out. The Snap button (or the round camera button on a phone) saves an inspiration photo from anywhere.',
        ],
      },
      {
        heading: 'Your first three steps',
        content: ['A short checklist on Today walks you through these the first time you sign in.'],
        steps: [
          'Tell us how you dress (womenswear, menswear or both) and pick the style closest to yours.',
          'Add at least three pieces in Wardrobe › Pieces. One photo can hold several items laid flat; they are separated automatically.',
          'On Today › Stylist, press "Style me" for three looks built from your pieces.',
        ],
      },
    ],
  },
  {
    id: 'stylist-consultation-guide',
    category: 'stylist',
    title: 'Getting looks from your stylist',
    summary: 'Ask for looks for any occasion, build around a favourite piece, and teach the stylist what you like.',
    readingTime: '3 min read',
    sections: [
      {
        heading: 'Asking for looks',
        content: [
          'Each request returns three looks built from your wardrobe. They take into account your style, the weather in your city, trends from the sources you follow, and anything you tell the stylist.',
        ],
        steps: [
          'Go to Today › Stylist.',
          'Optionally describe the occasion, e.g. "Dinner in Paris", "a rainy commute" or "a gallery opening".',
          'Press "Style me".',
        ],
      },
      {
        heading: 'Weather',
        content: [
          'The weather card shows conditions for your city. Use "Change Weather" to style for somewhere else, such as a destination you are travelling to. Set your home city in your profile.',
        ],
      },
      {
        heading: 'Building a look around one piece',
        content: ['In Wardrobe › Pieces, press "Build a look around this" on any piece. Your next looks will all include it.'],
      },
      {
        heading: 'Teaching your stylist',
        content: [
          'Under each look: "Love" marks looks you like, "Not for me" hides a look and steers future suggestions away from it, and "Wore it" records that you wore it.',
          'Pieces you wore in the last week are rotated out of new suggestions, and "Not worn lately" in Wardrobe › Insights uses what you have marked as worn.',
          'Open "Why it works" on a look for the full styling notes. Pieces marked "To buy" link to a retailer.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Why can\'t I press "Style me"?',
        answer: 'It needs at least one piece in your wardrobe. Add pieces in Wardrobe › Pieces first.',
      },
      {
        question: 'Do I need to save looks?',
        answer: 'No. Every look is kept automatically on Today › Stylist until you delete it.',
      },
    ],
  },
  {
    id: 'wardrobe-management-guide',
    category: 'wardrobe',
    title: 'Adding and managing your pieces',
    summary: 'Photograph pieces, let the app tag them, then search, edit and tidy your wardrobe.',
    readingTime: '3 min read',
    sections: [
      {
        heading: 'Adding pieces',
        content: [
          'Each photo is analysed for category, colours, brand (if visible) and details. If "Auto-slice multi-item photos" is on, a photo of several items laid flat is split into separate pieces.',
        ],
        steps: [
          'Go to Wardrobe › Pieces.',
          'Choose "Take photo" or "Photo library" (you can select several photos).',
          'Optionally add a brand or notes that apply to these photos.',
          'Press "Add to wardrobe".',
        ],
      },
      {
        heading: 'Finding and editing pieces',
        content: [
          'Search by brand, tag, colour or notes, or filter by category. "Edit details" on a piece lets you correct anything the analysis got wrong. "Edit as a table" lets you change several pieces at once, including deleting them.',
        ],
      },
      {
        heading: 'Duplicates',
        content: ['"Scan for duplicates" finds pieces added more than once and lets you merge them.'],
      },
      {
        heading: 'Insights and gaps',
        content: [
          'The "Insights & gaps" tab shows your wardrobe by category and colour, and pieces you have not worn lately. "Find wardrobe gaps" suggests a few pieces that would work with much of what you already own.',
        ],
      },
    ],
  },
  {
    id: 'capsule-wardrobe-guide',
    category: 'capsule',
    title: 'Packing a travel capsule',
    summary: 'Pick a small set of pieces that work together for a trip, with a day and evening look for each day.',
    readingTime: '2 min read',
    sections: [
      {
        heading: 'Planning a trip',
        content: ['Capsules use only pieces from your wardrobe, chosen for the destination\'s weather and your plans.'],
        steps: [
          'Go to Wardrobe › Capsules and press "New Travel Capsule".',
          'Enter the destination, start and end dates, and what the trip is for.',
          'Choose your luggage: carry-on, checked bag or weekend duffle. This sets how many pieces are packed.',
          'Add any packing notes, such as "need walking shoes", and press "Build capsule".',
        ],
      },
      {
        heading: 'What you get',
        content: [
          'A packing list of the chosen pieces and an itinerary with a day look and an evening look for each day (up to 14 days). Use "Print Packing List" to take it with you.',
        ],
      },
    ],
  },
  {
    id: 'studio-flatlay-guide',
    category: 'studio',
    title: 'Making a flat-lay in the Studio',
    summary: 'Arrange pieces and inspiration photos on a canvas and save the layout.',
    readingTime: '2 min read',
    sections: [
      {
        heading: 'Building a flat-lay',
        content: ['Open Wardrobe › Studio. Your pieces and inspiration photos are listed beside the canvas.'],
        steps: [
          'Press "Add to Canvas" on a piece or photo to place it.',
          'Drag items to reposition them.',
          'Select an item, then use Scale + / Scale −, Rotate, or "Bring to Front" to layer it over others.',
          'Use "Remove Item" to take one item off, or "Clear Canvas" to start again.',
        ],
      },
      {
        heading: 'Saving',
        content: ['Give the flat-lay a title and press "Save flat-lay". Saved flat-lays appear below the canvas; "Load to Stage" reopens one for editing.'],
      },
    ],
  },
  {
    id: 'inspirations-feeds-guide',
    category: 'inspirations',
    title: "Inspiration, sources and What's new",
    summary: 'Save photos that inspire you, choose the sources that shape your trend briefing, and read it.',
    readingTime: '3 min read',
    sections: [
      {
        heading: 'Inspiration photos',
        content: [
          'Save street style, shop windows or magazine pages with the Snap button or in Inspiration. Each photo is tagged with its style so your stylist and What\'s new can draw on it.',
        ],
      },
      {
        heading: 'Sources you follow',
        content: [
          'In Inspiration, "+ Subscribe" follows a starter source and "Mute" pauses it. "Add Feed Source" adds your own RSS feed, Substack, YouTube channel or Instagram account.',
        ],
      },
      {
        heading: "What's new",
        content: [
          'Today › What\'s new reads recent articles from your sources against your wardrobe. Each post explains a trend, names the pieces you own that fit it, suggests at most one piece worth adding, and links to the original article. Press "Refresh" for new posts.',
        ],
      },
    ],
  },
  {
    id: 'profile-sizing-password-guide',
    category: 'profile',
    title: 'Profile, sizes and password',
    summary: 'How you dress, optional fit details, your style archetype, and changing or resetting your password.',
    readingTime: '2 min read',
    sections: [
      {
        heading: 'How you dress and fit details',
        content: [
          '"I dress in" decides which clothes are suggested. Fit details (height, waist, shoe and clothing sizing and so on) are optional and only used to suggest sizes for pieces to buy.',
        ],
      },
      {
        heading: 'Your style',
        content: [
          'Choose the style archetype closest to yours, or write your own. Favourite brands, things you avoid and your colour palette are followed closely. Your city sets the weather your looks are styled for.',
        ],
      },
      {
        heading: 'Changing your password',
        content: ['Open Account › Profile & sizes, enter a new password (at least 6 characters) and save.'],
      },
      {
        heading: 'Forgotten password',
        steps: [
          'On the sign-in screen, choose "Forgot your password?".',
          'Enter your account email. We email you a 6-digit verification code, valid for 15 minutes.',
          'Enter the code and a new password. After five wrong codes, request a new one.',
        ],
        content: [],
      },
    ],
  },
  {
    id: 'gdpr-privacy-guide',
    category: 'gdpr',
    title: 'Your data, privacy and security',
    summary: 'Download everything we hold about you, delete your account, and protect sign-in.',
    readingTime: '2 min read',
    sections: [
      {
        heading: 'Download your data (Article 20)',
        content: ['In Account › Profile & sizes, use "Download my data package" to get your profile, wardrobe, inspirations and looks as a file.'],
      },
      {
        heading: 'Delete your account (Article 17, the right to be forgotten)',
        content: ['"Delete your account" permanently removes your account, wardrobe, photos and looks. This cannot be undone.'],
        callout: { type: 'important', text: 'Download your data package first if you want a copy.' },
      },
      {
        heading: 'Emails',
        content: ['Choose whether to receive email digests in the consent settings on your profile. You can change this at any time.'],
      },
      {
        heading: 'Two-factor sign-in',
        content: ['When creating an account you can turn on an authenticator app. You will then enter a 6-digit code from the app each time you sign in.'],
      },
    ],
  },
];
