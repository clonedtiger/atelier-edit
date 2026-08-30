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
  {
    id: 'all',
    title: 'All Guides',
    icon: '📚',
    description: 'Browse the complete documentation and styling handbook.'
  },
  {
    id: 'quickstart',
    title: 'Quickstart & Navigation',
    icon: '🏁',
    description: 'Essential overview of Atelier Edit navigation, mobile gestures, and core concepts.'
  },
  {
    id: 'stylist',
    title: 'Personal Stylist & Climate',
    icon: '👗',
    description: 'AI outfit consultations, live weather forecasts, hero garments, and gap analysis.'
  },
  {
    id: 'wardrobe',
    title: 'Wardrobe & Duplicates',
    icon: '🚪',
    description: 'Garment cataloging, batch photo ingestion, auto-tagging, and duplicate merging.'
  },
  {
    id: 'capsule',
    title: 'Capsules & Travel Packing',
    icon: '🧳',
    description: 'Interchangeable capsule wardrobes, 10x10 and 5x4 travel packing matrices.'
  },
  {
    id: 'studio',
    title: 'Studio (Flat-Lay Canvas)',
    icon: '🎨',
    description: 'Interactive moodboard canvas, drag-and-drop outfit builder, layering, and export.'
  },
  {
    id: 'inspirations',
    title: 'Inspirations & Trend Feeds',
    icon: '💡',
    description: 'Visual moodboard clippings, Gemini aesthetic tag extraction, and RSS channels.'
  },
  {
    id: 'profile',
    title: 'Profile, Sizing & Passwords',
    icon: '👤',
    description: 'Style DNA archetypes, international sizing systems, and password management.'
  },
  {
    id: 'gdpr',
    title: 'Privacy, GDPR & Security',
    icon: '🔒',
    description: 'Article 20 data package exports, Right to be Forgotten, and Two-Factor Authentication.'
  }
];

export const GUIDES_ARTICLES: GuideArticle[] = [
  // 1. Quickstart
  {
    id: 'quickstart-overview',
    category: 'quickstart',
    title: 'Welcome to Atelier Edit: The Personal Style Journal',
    summary: 'A luxury digital wardrobe ecosystem combining your physical clothing inventory, live global weather forecasts, haute couture editorial feeds, and Gemini AI vision styling.',
    readingTime: '3 min read',
    badge: 'Essential',
    sections: [
      {
        heading: 'What is Atelier Edit?',
        content: [
          'Atelier Edit is an intelligent personal styling platform engineered to bridge the gap between high-fashion runway inspiration and your real, everyday physical closet.',
          'Instead of generic fashion advice, Atelier Edit creates personalized outfit compositions tailored to your unique measurements, aesthetic preferences, physical wardrobe items, and real-time destination weather.'
        ]
      },
      {
        heading: 'The Main Navigation Tabs',
        content: [
          'The editorial header allows you to switch seamlessly between the core areas of the platform:'
        ],
        steps: [
          'Stylist: Request tailored outfit consultations for any occasion, city climate, or star anchor garment.',
          'What\'s New: Browse automated daily editorial digests, trend forecasts, and runway analyses from leading fashion houses.',
          'Wardrobe: Catalog your clothing pieces with photos, tags, materials, and automated duplicate item detection.',
          'Capsules: Generate travel packing lists and interchangeable 10x10 or 5x4 capsule wardrobes.',
          'Studio: Craft visual flat-lay outfit collages on an interactive drag-and-drop moodboard canvas.',
          'Inspirations: Pin runway photos and magazine tearsheets for instant AI aesthetic extraction and subscribe to fashion feeds.',
          'My Profile: Customize your Style DNA, physical sizing measurements, password, and UK DPA 2018 privacy preferences.'
        ]
      },
      {
        heading: 'Mobile PWA Experience',
        content: [
          'Atelier Edit is a Progressive Web App (PWA) optimized for mobile devices. You can install it directly to your home screen via your browser menu for instant offline access and native camera uploads.'
        ],
        callout: {
          type: 'tip',
          text: 'Use the "Snap Inspiration" button in the header at any time to snap a photo on your mobile camera or upload an image directly into your wardrobe or moodboard.'
        }
      }
    ]
  },

  // 2. Personal Stylist & Climate
  {
    id: 'stylist-consultation-guide',
    category: 'stylist',
    title: 'How to Use the Personal Stylist Consultation Engine',
    summary: 'Master the AI stylist: synthesize real wardrobe items with runway trends, apply live thermal weather forecasts, and lock hero anchor garments.',
    readingTime: '5 min read',
    badge: 'AI Styling',
    sections: [
      {
        heading: 'How Consultation Works',
        content: [
          'When you request a consultation, the Gemini AI engine analyzes four key dimensions simultaneously:',
          '1. Your physical wardrobe items (outerwear, tops, bottoms, shoes, accessories).',
          '2. Your Style DNA & Sizing Profile (aesthetic archetype, color palette, fit rules).',
          '3. Current fashion stream trends & runway aesthetics.',
          '4. Real-time meteorological data (temperature, wind, precipitation) for your target city.'
        ]
      },
      {
        heading: 'Setting Occasion & Destination Weather',
        content: [
          'You can customize the destination climate and occasion for any consultation:'
        ],
        steps: [
          'Select your destination city (e.g. London, Paris, Tokyo, New York) or click "Add Custom City" to enter any global location.',
          'The climate panel immediately loads live temperature, precipitation forecast, and comfort advice (e.g., "16°C Mild Breeze — Mid-weight tailoring & lightweight layering").',
          'In the Occasion / Destination field, describe your event (e.g., "Boardroom presentation in Mayfair", "Autumn gallery opening", "Casual brunch in Brooklyn").',
          'Click "✨ Advise Me" to generate tailored lookbook recommendations.'
        ]
      },
      {
        heading: 'Hero Anchor Garment Feature',
        content: [
          'Have a star piece you really want to wear today? You can lock it as the Hero Anchor Garment.',
          'When an anchor item is selected, the AI Stylist guarantees that this specific item will be the centerpiece of every generated outfit, selecting coordinating items from your closet to complete the silhouette.'
        ],
        callout: {
          type: 'tip',
          text: 'To anchor an item, click "⭐ Set as Hero Anchor" on any garment card in your Wardrobe tab, then return to the Stylist tab.'
        }
      },
      {
        heading: 'Understanding Wardrobe Gap Analysis & Shopping Links',
        content: [
          'If your wardrobe is missing an essential piece to complete a high-fashion look (e.g., a structured trench coat or leather loafer), the Stylist identifies the gap and provides curated direct shopping links to premier luxury retailers including Net-a-Porter, SSENSE, Farfetch, COS, and Zara.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Why is the Advise Me button disabled?',
        answer: 'The Advise Me button requires at least one item in your digital wardrobe. If your closet is currently empty, click "Ingest Demo Wardrobe (30 Pieces)" on the Stylist tab or add your own clothing in the Wardrobe tab.'
      },
      {
        question: 'How do I save a generated recommendation to my Lookbook?',
        answer: 'Click the "⭐ Save to Personal Lookbook" button underneath any generated outfit card. You can view all saved outfits anytime in your Lookbook drawer.'
      }
    ]
  },

  // 3. Wardrobe & Duplicate Detection
  {
    id: 'wardrobe-management-guide',
    category: 'wardrobe',
    title: 'Wardrobe Management, Batch Uploads & Duplicate Merging',
    summary: 'Learn how to catalog your clothing pieces, use Gemini Vision auto-tagging, search your closet, and merge duplicate records.',
    readingTime: '4 min read',
    sections: [
      {
        heading: 'Adding Clothes to Your Digital Wardrobe',
        content: [
          'Atelier Edit offers three fast ways to build your digital closet:'
        ],
        steps: [
          'Single Item Upload: Click "+ Add New Piece", choose a photo or use your mobile camera, and input details.',
          'Batch Multi-Photo Ingestion: Select multiple clothing photos at once. The system automatically processes each image through Gemini Vision in parallel.',
          'CSV / Catalog Import: Upload a spreadsheet of your existing inventory for bulk catalog creation.'
        ]
      },
      {
        heading: 'Gemini Vision AI Auto-Tagging',
        content: [
          'When you upload a clothing photo, Gemini Vision inspects the garment and automatically predicts:',
          '• Category (Outerwear, Tops, Bottoms, Dresses, Knitwear, Shoes, Bags, Accessories, Jewelry).',
          '• Fabric Composition & Texture (e.g., 100% Wool, Heavy Silk, Brushed Cashmere, Matte Leather).',
          '• Color Palette (Primary shade, undertones, and accent hues).',
          '• Formality & Aesthetic Vibe (Black Tie, Smart Casual, Avant-Garde Tailoring, Minimalist Luxury).',
          '• Designer / Brand (if recognizable tags or silhouettes are present).'
        ]
      },
      {
        heading: 'Using the Duplicate Item Detector & Merge Tool',
        content: [
          'If you accidentally upload the same garment twice or have similar items, Atelier Edit\'s intelligent duplicate detector identifies them based on image hash and metadata similarity.',
          'Click "🔍 Scan for Duplicates" in the Wardrobe header to view potential duplicates and merge them into a single definitive record with one click.'
        ],
        callout: {
          type: 'info',
          text: 'Merging duplicates preserves all existing lookbook references and styling notes while cleaning up redundant cloud storage images.'
        }
      }
    ]
  },

  // 4. Capsules & Travel Matrices
  {
    id: 'capsule-wardrobe-guide',
    category: 'capsule',
    title: 'Building Travel Capsules & 10x10 / 5x4 Packing Matrices',
    summary: 'Create interchangeable capsule wardrobes that maximize outfit versatility with minimal luggage weight for weekend getaways and business trips.',
    readingTime: '4 min read',
    badge: 'Travel',
    sections: [
      {
        heading: 'What is a Capsule Wardrobe?',
        content: [
          'A capsule wardrobe is a curated collection of versatile, complementary garments where almost every top pairs seamlessly with every bottom and outerwear layer.',
          'This allows you to create dozens of distinct outfit combinations from as few as 8 to 14 total pieces.'
        ]
      },
      {
        heading: 'Creating a New Travel Capsule',
        content: [
          'To generate a customized trip capsule:'
        ],
        steps: [
          'Navigate to the Capsules tab and click "+ Create New Capsule".',
          'Enter your Destination City (e.g., "Milan", "Paris", "Zurich").',
          'Set your Trip Duration in days (e.g., 3 days, 5 days, 7 days, 10 days).',
          'Choose the Expected Climate (Warm, Mild, Rainy, Cold, Alpine Snow).',
          'Select the Vibe & Dress Code (Business Executive, Casual Chic, Fashion Week, Gala Dinner).',
          'Click "Generate Capsule Matrix".'
        ]
      },
      {
        heading: 'The 10x10 and 5x4 Packing Matrices',
        content: [
          'Atelier Edit uses mathematical permutation matrices to curate your packing list:',
          '• 10x10 Matrix (10 Days, 10 Pieces): 2 outerwear, 3 tops, 2 bottoms, 1 dress/suit, 2 pairs of shoes = 10+ unique outfits.',
          '• 5x4 Matrix (5 Days, 4 Categories): 1 coat, 2 tops, 1 trouser, 1 shoe = 5 day-to-night transitions.'
        ],
        callout: {
          type: 'tip',
          text: 'You can export your completed capsule as a printable packing checklist and daily outfit calendar directly to PDF.'
        }
      }
    ]
  },

  // 5. Studio (Flat-Lay Canvas)
  {
    id: 'studio-flatlay-guide',
    category: 'studio',
    title: 'How to Use the Studio: Interactive Flat-Lay Outfit Canvas',
    summary: 'Design editorial outfit moodboards and Polyvore-style collage compositions using drag-and-drop, layering, rotation, and custom styling notes.',
    readingTime: '5 min read',
    badge: 'Creative',
    sections: [
      {
        heading: 'Overview of the Studio Canvas',
        content: [
          'The Studio is your digital atelier styling table. It provides an unconstrained, interactive canvas where you can freely arrange clothing items, accessories, and inspirational clippings to visualize complete outfits before putting them on.'
        ]
      },
      {
        heading: 'Adding Items to the Canvas',
        content: [
          'On the left drawer of the Studio, you will find your Wardrobe items and Inspiration clippings:',
          '• Click or drag any garment card to place it onto the canvas.',
          '• You can place multiple items (e.g., blazer + knitwear + tailored trousers + handbag + boots) onto a single board.'
        ]
      },
      {
        heading: 'Canvas Interactive Controls',
        content: [
          'Once an item is on the canvas, clicking it activates the transform bounding box:'
        ],
        steps: [
          'Move / Reposition: Click and drag the item anywhere on the canvas.',
          'Resize / Scale: Drag the corner control handles to enlarge or shrink the item.',
          'Rotate: Drag the circular rotation handle to tilt items for dynamic editorial layouts.',
          'Layer Hierarchy (Z-Index): Use the "Bring Forward" and "Send Backward" buttons to layer garments (e.g., placing a coat over a sweater).',
          'Remove: Click the "🗑️ Remove" button to delete an item from the canvas.'
        ]
      },
      {
        heading: 'Canvas Backgrounds & Styling Annotations',
        content: [
          'Customize the aesthetic mood of your canvas:',
          '• Background Swatches: Choose between Atelier Linen (#FAF8F4), Obsidian Dark (#1A1A1A), Parisian Cream (#F3EFE6), or Warm Charcoal.',
          '• Editorial Notes: Add custom text boxes for styling guidelines (e.g., "Roll up coat sleeves", "Wear with gold hoop earrings").'
        ],
        callout: {
          type: 'tip',
          text: 'Click "💾 Save Flat-Lay Collage" to store the outfit composition in your personal Lookbook, or click "📸 Export Image" to download a high-resolution PNG for Instagram or Pinterest.'
        }
      }
    ]
  },

  // 6. Inspirations & Feeds
  {
    id: 'inspirations-feeds-guide',
    category: 'inspirations',
    title: 'Visual Moodboards, AI Aesthetic Extraction & Feed Subscriptions',
    summary: 'Collect runway clippings, extract style keywords with Gemini Vision, and manage your automated fashion intelligence feeds.',
    readingTime: '3 min read',
    sections: [
      {
        heading: 'Uploading Visual Inspirations',
        content: [
          'Whenever you see an outfit you love—in a magazine, on social media, or on a runway livestream—upload it to your Inspirations board:',
          '• Upload via file picker or use the "Snap Inspiration" quick camera tool in the header.',
          '• Gemini Vision analyzes the photo in seconds, extracting aesthetic tags (e.g., "Old Money Minimalist", "Architectural Tailoring", "Monochrome Layering") and primary color palettes.'
        ]
      },
      {
        heading: 'Managing Fashion Intelligence Channels (RSS/OPML)',
        content: [
          'Atelier Edit continuously pulls editorial updates from curated fashion publications (Vogue, Harper\'s Bazaar, Who What Wear, Substack newsletters, and fashion YouTube channels):',
          '• Click "Manage Channels" to subscribe to new RSS/Atom feeds.',
          '• Click "Export OPML" to back up your fashion subscriptions.',
          '• Click "Import OPML" to import your existing feed collection from Feedly or NetNewsWire.'
        ]
      }
    ]
  },

  // 7. My Profile, Sizing & Passwords
  {
    id: 'profile-sizing-password-guide',
    category: 'profile',
    title: 'My Profile: Style DNA, Sizing Systems & Password Management',
    summary: 'Configure international sizing conversions, define your personal Style DNA, change your account password, and recover forgotten credentials.',
    readingTime: '5 min read',
    badge: 'Account & Security',
    sections: [
      {
        heading: '1. Defining Your Style DNA & Aesthetic Archetypes',
        content: [
          'Your Style DNA governs how Gemini personalizes outfit recommendations for you:',
          '• Aesthetic Archetype: Select from Minimalist Quiet Luxury, Parisian Chic, Structural Avant-Garde / Rebel, Contemporary Streetwear, Old Money / Heritage Preppy, Modern Executive / Power Tailoring, or Bohemian Artisan.',
          '• Favorite Brands & Designers: List the fashion houses whose tailoring and cuts you prefer (e.g., The Row, Toteme, Khaite, COS, Celine).',
          '• Style Rules & Avoided Aesthetics: Explicitly exclude items you dislike (e.g., "No neon hues", "Avoid loud logos", "Avoid synthetic polyester").',
          '• Signature Color Palette: Specify your go-to base colors (e.g., Black, Camel, Oatmeal, Charcoal, Forest Pine).'
        ]
      },
      {
        heading: '2. International Sizing & Measurement Systems',
        content: [
          'Atelier Edit supports global sizing conventions so recommendations match your exact physical fit:'
        ],
        steps: [
          'Height & Weight: Toggle seamlessly between Metric (cm / kg) and Imperial (feet/inches / lbs / stones).',
          'Waist Measurement: Input in inches or centimeters.',
          'Shoe Sizing System: Choose between European (EU 35–48), UK (UK 2–13), US Women (US 4–13), or US Men (US 6–15).',
          'Clothing / Dress Sizing: Select United Kingdom (UK 4–20), European (EU 32–48), United States (US 0–16), or Generic Letter (XXS–XXL).',
          'Hat Sizing: Metric (cm 40–70), US Imperial (6 1/2–7 3/4), or Generic (S/M/L/XL).',
          'Glove Sizing: European Half-Inches (6–10) or Generic (S/M/L/XL).'
        ]
      },
      {
        heading: '3. Changing Your Password (Logged In)',
        content: [
          'To change your password while signed in to your account:'
        ],
        steps: [
          'Navigate to the My Profile tab.',
          'Scroll down to the "Change Password" field under Section 4 (Lifestyle & Context).',
          'Enter your new secure password (minimum 6 characters).',
          'Click the dark "SAVE STYLE DNA & PROFILE" button at the bottom.',
          'Your password is immediately updated and encrypted using bcrypt.'
        ],
        callout: {
          type: 'info',
          text: 'If you do not wish to change your password when updating sizing measurements, simply leave the "Change Password" field blank.'
        }
      },
      {
        heading: '4. Resetting a Forgotten Password (Login Screen)',
        content: [
          'If you are logged out and have forgotten your password:'
        ],
        steps: [
          'On the Login screen, click the "Forgot Password?" link below the login button.',
          'Enter your registered email address or mobile phone number.',
          'Click "Send Verification Code". A secure 6-digit one-time verification code is generated.',
          'Enter the 6-digit code and your desired new password.',
          'Click "Reset Password". You can now immediately sign in with your new credentials.'
        ],
        callout: {
          type: 'important',
          text: 'One-time verification codes expire automatically after 15 minutes for your account security.'
        }
      },
      {
        heading: '5. Marketing & Communication Preferences',
        content: [
          'Under the UK Data Protection Act 2018 (DPA 2018), you have total granular control over communications:',
          '• Email Newsletters & Editorial Digests: Weekly style stream trends and seasonal capsule breakdowns.',
          '• Mobile & SMS Notifications: Urgent notifications for luxury drops and instant stylist consultations.',
          '• Selected Partners & Collaborations: Non-sensitive aesthetic recommendations shared with vetted luxury fashion houses.',
          'Check or uncheck your desired options and click "SAVE PREFERENCES".'
        ]
      }
    ]
  },

  // 8. Privacy & GDPR Rights
  {
    id: 'gdpr-privacy-security-guide',
    category: 'gdpr',
    title: 'Data Privacy, GDPR Rights (UK DPA 2018) & Multi-Factor Auth (MFA)',
    summary: 'Understand your privacy rights under GDPR/UK DPA 2018: export machine-readable data packages, exercise the Right to be Forgotten, and configure MFA.',
    readingTime: '4 min read',
    badge: 'Compliance & Security',
    sections: [
      {
        heading: 'Our Privacy Philosophy',
        content: [
          'Atelier Edit operates under strict compliance with the General Data Protection Regulation (GDPR) and the UK Data Protection Act 2018.',
          'We believe your style data, physical measurements, and wardrobe images belong exclusively to you. We do not sell your personal data to third-party ad brokers.'
        ]
      },
      {
        heading: 'Data Portability & Export (Article 20)',
        content: [
          'You can download a complete, machine-readable JSON data archive of everything stored in your account at any time.'
        ],
        steps: [
          'Navigate to the My Profile tab.',
          'Scroll down to the "Data Privacy & GDPR Rights" panel on the left column.',
          'Click the dark "📥 DOWNLOAD MY DATA PACKAGE" button.',
          'Your browser will download a structured `.json` package containing your profile details, physical sizing measurements, wardrobe items catalog, visual inspiration clippings, generated lookbooks, and consent logs.'
        ]
      },
      {
        heading: 'Right to be Forgotten & Data Erasure (Article 17)',
        content: [
          'Under Article 17 of the GDPR, you have the right to request the total and permanent deletion of your account and all associated data.',
          'When you execute this action:',
          '• Your user account and authentication credentials are permanently purged from the PostgreSQL database.',
          '• All uploaded wardrobe photos and moodboard clippings are permanently deleted from Google Cloud Storage buckets.',
          '• All generated lookbooks, capsule itineraries, and consent logs are expunged.'
        ],
        callout: {
          type: 'important',
          text: 'Account deletion is immediate and non-reversible. Ensure you download your data package first if you wish to keep a backup of your wardrobe catalog.'
        }
      },
      {
        heading: 'Two-Factor Authentication (MFA / TOTP)',
        content: [
          'For enhanced security, Atelier Edit supports Time-based One-Time Passwords (TOTP) compatible with Google Authenticator, 1Password, Authy, and Apple Keychain.',
          'When MFA is active, signing in requires both your password and a rolling 6-digit code from your authenticator device.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Where is my clothing imagery stored?',
        answer: 'All uploaded images are securely stored in private Google Cloud Storage buckets located in the europe-west2 (London, UK) region, with encryption at rest and in transit.'
      },
      {
        question: 'How do I contact the Data Protection Officer (DPO)?',
        answer: 'You can reach our dedicated privacy team at privacy@atelieredit.com for any data subject access requests or GDPR compliance queries.'
      }
    ]
  }
];
