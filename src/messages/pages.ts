import type { Locale } from "@/lib/i18n/core";

export interface StaticPageContent {
  title: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}

type PageKey = "about" | "howItWorks" | "guidelines" | "privacy" | "terms" | "contact";

/** Long-form page copy, kept per locale alongside the UI dictionaries. */
export const pages: Record<Locale, Record<PageKey, StaticPageContent>> = {
  bn: {
    about: {
      title: "আমাদের কথা",
      intro: "“দাম কত?” একটি কমিউনিটি-চালিত প্ল্যাটফর্ম, যেখানে বাংলাদেশের মানুষ নিজেদের কেনা পণ্যের দাম শেয়ার করেন, যাতে অন্যরা বাজারে যাওয়ার আগেই একটা ধারণা পান।",
      sections: [
        { heading: "কেন এই উদ্যোগ", body: ["একই আলু, একই ডিম — কিন্তু মিরপুরে এক দাম, যাত্রাবাড়ীতে আরেক দাম, জেলা শহরে আরও ভিন্ন। এই পার্থক্যগুলো জানা থাকলে মানুষ দরদাম করতে পারেন, সচেতনভাবে বাজার করতে পারেন।", "আমরা চাই বাজারদরের তথ্য সবার জন্য খোলা থাকুক — সহজ ভাষায়, বিনা খরচে।"] },
        { heading: "আমরা কী নই", body: ["এটি কোনো অনলাইন দোকান, মার্কেটপ্লেস বা বিজ্ঞাপনের সাইট নয়। এখানে কিছু কেনা বা বেচা যায় না, কোনো বিক্রেতার সঙ্গে যোগাযোগের ব্যবস্থাও নেই।", "এখানে দেখানো দাম সরকারি বাজারদর নয় এবং আমরা কোনো দামকে “যাচাইকৃত” বলে দাবি করি না।"] },
        { heading: "তথ্যের উৎস", body: ["সব দাম ব্যবহারকারীদের দেওয়া। প্রতিটি রিপোর্টের তারিখ, এলাকা ও রিপোর্টের সংখ্যা স্পষ্টভাবে দেখানো হয়, যাতে আপনি নিজেই বিচার করতে পারেন তথ্যটি কতটা প্রাসঙ্গিক।", "প্রশাসনিক এলাকার তালিকা নেওয়া হয়েছে bangladesh-geocode (MIT লাইসেন্স) থেকে, আর ম্যাপের তথ্য OpenStreetMap অবদানকারীদের।"] },
      ],
    },
    howItWorks: {
      title: "কীভাবে কাজ করে",
      intro: "দাম দেখা, দাম দেওয়া আর তুলনা করা — তিনটিই সহজ, এবং কোনোটির জন্যই অ্যাকাউন্ট লাগে না।",
      sections: [
        { heading: "১. দাম যোগ করুন", body: ["পণ্যের নাম, দাম, পরিমাণ ও একক লিখুন, তারপর এলাকা বেছে নিন — তালিকা থেকে, ম্যাপে ট্যাপ করে, অথবা চাইলে বর্তমান অবস্থান দিয়ে। নাম, ছবি, ব্র্যান্ড বা বাজারের নাম ঐচ্ছিক।"] },
        { heading: "২. তুলনাযোগ্য দাম", body: ["৫০০ গ্রাম ৩০ টাকা আর ১ কেজি ৫৮ টাকা — তুলনা করতে আমরা একই মাত্রার একককে রূপান্তর করি (গ্রাম → কেজি, মিলি → লিটার, ডজন/হালি → পিস)। প্যাকেট, বস্তা, সিলিন্ডার, ভরি বা সেটের মতো এককে রূপান্তর করা হয় না; এগুলো শুধু একই সাইজ/বিবরণের রিপোর্টের সঙ্গে তুলনা হয়।", "ভিন্ন ব্র্যান্ড বা স্পেসিফিকেশন একসঙ্গে মিশিয়ে গড় করা হয় না।"] },
        { heading: "৩. তথ্য কতটা নতুন", body: ["প্রতিটি দামের পাশে দেখানো হয় এটি কবেকার — কেনার তারিখ দেওয়া থাকলে সেটি, না থাকলে জমা দেওয়ার তারিখ। ১৪ দিনের বেশি পুরোনো রিপোর্টে “তথ্যটি পুরোনো হতে পারে” লেখা থাকে।"] },
        { heading: "৪. মডারেশন", body: ["অস্বাভাবিক দাম, লিংক বা ফোন নম্বর থাকলে রিপোর্টটি স্বয়ংক্রিয়ভাবে মডারেটরের পর্যালোচনার তালিকায় যায়। ভিন্ন হলেই কোনো দাম মুছে ফেলা হয় না — বাস্তবে দামের বড় পার্থক্য থাকতেই পারে।", "যে কেউ কোনো রিপোর্ট বা মন্তব্য নিয়ে “সমস্যা জানান” বোতাম দিয়ে অভিযোগ করতে পারেন।"] },
      ],
    },
    guidelines: {
      title: "কমিউনিটি নির্দেশিকা",
      intro: "সবার উপকারে আসে এমন সৎ, ভদ্র ও নিরাপদ তথ্যই এই প্ল্যাটফর্মের শক্তি।",
      sections: [
        { heading: "যা করবেন", body: ["নিজে যে দামে কিনেছেন বা নিজের চোখে দেখেছেন, শুধু সেটিই দিন।", "পরিমাণ ও একক সঠিকভাবে লিখুন; প্যাকেট বা সিলিন্ডার হলে সাইজ উল্লেখ করুন।", "মন্তব্যে ভদ্র থাকুন; দ্বিমত থাকলে নিজের এলাকার দাম জানিয়ে সাহায্য করুন।"] },
        { heading: "যা করবেন না", body: ["বিজ্ঞাপন, দোকানের প্রচার বা বিক্রির প্রস্তাব দেবেন না।", "নিজের বা অন্যের ফোন নম্বর, বাসার ঠিকানা বা ব্যক্তিগত তথ্য প্রকাশ করবেন না।", "গালিগালাজ, ঘৃণা ছড়ানো বা কাউকে হয়রানি করবেন না।", "ইচ্ছাকৃত ভুল দাম বা একই তথ্য বারবার জমা দেবেন না।"] },
        { heading: "নিয়ম ভাঙলে", body: ["মডারেটররা রিপোর্ট বা মন্তব্য লুকিয়ে রাখতে বা সরিয়ে দিতে পারেন। প্রতিটি মডারেশন পদক্ষেপ রেকর্ড রাখা হয়।"] },
      ],
    },
    privacy: {
      title: "গোপনীয়তা নীতি",
      intro: "আমরা যত কম সম্ভব তথ্য সংগ্রহ করি। এই নীতি বর্তমানে চালু অ্যাপ্লিকেশন কীভাবে কাজ করে, ঠিক সেটাই বর্ণনা করে।",
      sections: [
        { heading: "আপনি যা দেন", body: ["দামের রিপোর্টে: পণ্যের তথ্য, দাম, এলাকা (বিভাগ/জেলা/উপজেলা, ঐচ্ছিক মহল্লা ও বাজারের নাম), এবং ঐচ্ছিকভাবে নাম, ছবি ও নোট।", "মন্তব্যে: লেখা বা স্টিকার, এবং ঐচ্ছিকভাবে নাম ও এলাকা।", "নাম দেওয়া বাধ্যতামূলক নয়। যা দেন, তা সবার জন্য প্রকাশিত হয় — তাই ব্যক্তিগত তথ্য দেবেন না।"] },
        { heading: "অবস্থান", body: ["ব্রাউজারের অবস্থান শুধু তখনই চাওয়া হয়, যখন আপনি “বর্তমান অবস্থান ব্যবহার করুন” বোতামে চাপেন। ম্যাপে বেছে নেওয়া বা জিপিএস পয়েন্ট সংরক্ষণের আগেই প্রায় ১০০ মিটার পর্যন্ত গোল করে ফেলা হয় — সঠিক স্থানাঙ্ক কখনো সংরক্ষণ বা প্রকাশ করা হয় না।", "শুধু তালিকা থেকে এলাকা বাছলে ম্যাপে জেলার কেন্দ্রবিন্দু দেখানো হয়।"] },
        { heading: "কুকি ও শনাক্তকরণ", body: ["অ্যাকাউন্ট ছাড়া জমা দেওয়া তথ্য চেনার জন্য একটি র‍্যান্ডম আইডি কুকি (dk_cid) রাখা হয়। ডাটাবেসে এই আইডির সরাসরি মান নয়, একটি গোপন চাবি দিয়ে তৈরি হ্যাশ রাখা হয়। এর মাধ্যমে আপনি নিজের রিপোর্ট সম্পাদনা/মুছতে পারেন, আর স্প্যাম ঠেকানো যায়।", "স্প্যাম ঠেকাতে আইপি ঠিকানার হ্যাশ অল্প সময়ের জন্য রেট-লিমিট কাউন্টারে ব্যবহৃত হয়; কোনো রিপোর্টের সঙ্গে আইপি সংরক্ষণ করা হয় না।", "ভাষা পছন্দ মনে রাখতে “lang” কুকি এবং ব্রাউজারের localStorage ব্যবহার হয়। স্টাফ লগইন করলে Supabase-এর সেশন কুকি ব্যবহৃত হয়।", "কোনো বিজ্ঞাপন বা থার্ড-পার্টি ট্র্যাকিং কুকি নেই।"] },
        { heading: "তৃতীয় পক্ষের সেবা", body: ["ডাটাবেস ও স্টাফ লগইন: Supabase। ছবি (যদি চালু থাকে): Cloudinary। ম্যাপ টাইল: নির্বাচিত OpenStreetMap-সামঞ্জস্যপূর্ণ টাইল সার্ভার — ম্যাপ দেখার সময় আপনার ব্রাউজার সরাসরি সেই সার্ভার থেকে ছবি আনে। হোস্টিং: নির্বাচিত হোস্টিং প্রোভাইডার (যেমন Vercel)।"] },
        { heading: "আপনার নিয়ন্ত্রণ", body: ["জমা দেওয়ার ৪৮ ঘণ্টার মধ্যে নিজের রিপোর্ট এবং ২৪ ঘণ্টার মধ্যে নিজের মন্তব্য সম্পাদনা বা মুছে ফেলতে পারেন। এর পরে মুছতে চাইলে “সমস্যা জানান” পাতায় যোগাযোগ করুন।", "আমরা কোনো আইনি সার্টিফিকেশন বা কমপ্লায়েন্স দাবি করি না।"] },
      ],
    },
    terms: {
      title: "ব্যবহারের শর্তাবলি",
      intro: "“দাম কত?” ব্যবহার করে আপনি নিচের শর্তগুলো মেনে নিচ্ছেন।",
      sections: [
        { heading: "তথ্যের প্রকৃতি", body: ["সব দাম ব্যবহারকারীদের দেওয়া এবং তথ্যগত উদ্দেশ্যে প্রকাশিত। এগুলো সরকারি, যাচাইকৃত বা নিশ্চিত দাম নয়; বর্তমান বাজারদর ভিন্ন হতে পারে। তথ্যের ভিত্তিতে নেওয়া সিদ্ধান্তের দায় ব্যবহারকারীর।"] },
        { heading: "আপনার দেওয়া তথ্য", body: ["আপনি নিশ্চিত করছেন যে আপনার দেওয়া তথ্য সৎ এবং অন্যের অধিকার লঙ্ঘন করে না। জমা দেওয়া দাম, মন্তব্য ও ছবি প্ল্যাটফর্মে প্রকাশ ও প্রদর্শনের অনুমতি আপনি দিচ্ছেন।", "কমিউনিটি নির্দেশিকা না মানলে কনটেন্ট লুকানো বা সরানো হতে পারে।"] },
        { heading: "কেনাবেচা নয়", body: ["প্ল্যাটফর্মে কোনো লেনদেন, অর্ডার বা পেমেন্ট হয় না। কোনো বিক্রেতার সঙ্গে আমাদের বাণিজ্যিক সম্পর্ক নেই।"] },
        { heading: "সেবার প্রাপ্যতা", body: ["সেবাটি বিনামূল্যের হোস্টিং ও ডাটাবেসে চলে; সাময়িক বিঘ্ন বা সীমাবদ্ধতা হতে পারে। শর্তাবলি সময়ে সময়ে হালনাগাদ হতে পারে।"] },
      ],
    },
    contact: {
      title: "সমস্যা জানান ও যোগাযোগ",
      intro: "কোনো নির্দিষ্ট দাম বা মন্তব্য নিয়ে সমস্যা থাকলে সেই রিপোর্টের পাতায় “সমস্যা জানান” বোতাম ব্যবহার করুন — এটিই সবচেয়ে দ্রুত পথ।",
      sections: [
        { heading: "অন্যান্য বিষয়ে", body: ["ওয়েবসাইটের ত্রুটি, পরামর্শ বা ৪৮ ঘণ্টা পেরিয়ে যাওয়া রিপোর্ট মুছতে চাইলে নিচের ঠিকানায় লিখুন।"] },
      ],
    },
  },
  en: {
    about: {
      title: "About",
      intro: "“Dam Koto?” is a community-driven platform where people across Bangladesh share what they paid for everyday goods, so others get a sense of prices before heading to the market.",
      sections: [
        { heading: "Why we built it", body: ["The same potatoes and eggs cost one price in Mirpur, another in Jatrabari and something else again in a district town. Knowing these differences helps people bargain and shop wisely.", "We want market price information to be open to everyone — in plain language, at no cost."] },
        { heading: "What we are not", body: ["This is not an online shop, marketplace or classifieds site. Nothing can be bought or sold here, and there is no way to contact sellers.", "Prices shown are not official market rates, and we never claim any price is “verified”."] },
        { heading: "Where the data comes from", body: ["Every price is reported by users. Each report clearly shows its date, location and how many reports stand behind a figure, so you can judge its relevance.", "Administrative areas come from bangladesh-geocode (MIT licence); map data from OpenStreetMap contributors."] },
      ],
    },
    howItWorks: {
      title: "How it works",
      intro: "Browsing, adding and comparing prices are all simple — and none of them needs an account.",
      sections: [
        { heading: "1. Add a price", body: ["Enter the product, price, quantity and unit, then choose the location — from a list, by tapping the map, or optionally with your current position. Name, photo, brand and market name are optional."] },
        { heading: "2. Comparable prices", body: ["৳30 for 500 g versus ৳58 for 1 kg: to compare, we convert units of the same dimension (g → kg, ml → l, dozen/hali → piece). Packets, sacks, cylinders, bhori and sets are never converted; they are compared only with reports of the same size/description.", "Different brands or specifications are never averaged together."] },
        { heading: "3. Freshness", body: ["Every price shows how old it is — the purchase date when given, otherwise the submission date. Reports older than 14 days are marked “may be outdated”."] },
        { heading: "4. Moderation", body: ["Reports with unusual prices, links or phone numbers are automatically queued for moderator review. A price is never deleted just because it differs — real prices can vary a lot.", "Anyone can flag a report or comment with the “Report a problem” button."] },
      ],
    },
    guidelines: {
      title: "Community guidelines",
      intro: "Honest, civil and safe information that helps everyone is what makes this platform work.",
      sections: [
        { heading: "Do", body: ["Share only prices you paid or saw yourself.", "Enter quantity and unit correctly; mention the size for packets or cylinders.", "Be polite in comments; if you disagree, help by sharing your area's price."] },
        { heading: "Don't", body: ["Post advertising, shop promotion or offers to sell.", "Share phone numbers, home addresses or personal information — yours or anyone else's.", "Use abusive language, spread hate or harass anyone.", "Submit deliberately wrong prices or the same report repeatedly."] },
        { heading: "If rules are broken", body: ["Moderators may hide or remove reports and comments. Every moderation action is logged."] },
      ],
    },
    privacy: {
      title: "Privacy policy",
      intro: "We collect as little as possible. This policy describes exactly how the application currently works.",
      sections: [
        { heading: "What you provide", body: ["In price reports: product details, price, location (division/district/upazila, optional neighbourhood and market name), and optionally a name, photo and note.", "In comments: text or a sticker, and optionally a name and area.", "A name is never required. Whatever you submit is published publicly — so please don't include personal information."] },
        { heading: "Location", body: ["Your browser location is requested only when you press “Use my current location”. Map or GPS points are rounded to roughly 100 m before storage — exact coordinates are never stored or published.", "If you only choose an area from the list, the map shows the district centre."] },
        { heading: "Cookies & identification", body: ["To recognise contributions made without an account we set a random ID cookie (dk_cid). The database stores a keyed hash of this ID, not the ID itself. It lets you edit/delete your own reports and helps prevent spam.", "To prevent abuse, a hash of your IP address is used briefly in rate-limit counters; IP addresses are never stored with reports.", "A “lang” cookie and browser localStorage remember your language. Staff logins use Supabase session cookies.", "There are no advertising or third-party tracking cookies."] },
        { heading: "Third-party services", body: ["Database and staff login: Supabase. Photos (when enabled): Cloudinary. Map tiles: the configured OpenStreetMap-compatible tile server — your browser loads map images directly from it. Hosting: the chosen hosting provider (e.g. Vercel)."] },
        { heading: "Your control", body: ["You can edit or delete your own reports within 48 hours and your comments within 24 hours. After that, contact us via “Report a problem”.", "We do not claim any legal certification or compliance."] },
      ],
    },
    terms: {
      title: "Terms of use",
      intro: "By using “Dam Koto?” you agree to the following terms.",
      sections: [
        { heading: "Nature of the information", body: ["All prices are reported by users and published for information only. They are not official, verified or guaranteed prices; current market prices may differ. Decisions based on this information are your own responsibility."] },
        { heading: "Your contributions", body: ["You confirm that what you submit is honest and does not infringe anyone's rights. You permit the platform to publish and display your prices, comments and photos.", "Content that breaks the community guidelines may be hidden or removed."] },
        { heading: "No buying or selling", body: ["No transactions, orders or payments happen on this platform. We have no commercial relationship with any seller."] },
        { heading: "Availability", body: ["The service runs on free hosting and database tiers; temporary interruptions or limits may occur. These terms may be updated from time to time."] },
      ],
    },
    contact: {
      title: "Report a problem & contact",
      intro: "For a problem with a specific price or comment, use the “Report a problem” button on that report's page — it is the fastest route.",
      sections: [{ heading: "Anything else", body: ["For website bugs, suggestions, or deleting a report after the 48-hour window, write to the address below."] }],
    },
  },
};
