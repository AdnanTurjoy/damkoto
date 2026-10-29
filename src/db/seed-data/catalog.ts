import type { UnitCode } from "@/features/prices/units";

export interface SeedCategory {
  slug: string;
  nameBn: string;
  nameEn: string;
  icon: string;
  units?: UnitCode[];
  children?: Omit<SeedCategory, "children" | "icon">[];
}

/** Top-level categories match the homepage tiles; vegetables and essentials first. */
export const SEED_CATEGORIES: SeedCategory[] = [
  { slug: "vegetables", nameBn: "শাকসবজি", nameEn: "Vegetables", icon: "carrot", units: ["kg", "g", "piece", "other"] },
  {
    slug: "rice-lentils",
    nameBn: "চাল ও ডাল",
    nameEn: "Rice & lentils",
    icon: "wheat",
    units: ["kg", "sack", "packet"],
    children: [
      { slug: "rice", nameBn: "চাল", nameEn: "Rice" },
      { slug: "flour", nameBn: "আটা ও ময়দা", nameEn: "Flour" },
      { slug: "lentils", nameBn: "ডাল ও ছোলা", nameEn: "Lentils & chickpeas" },
    ],
  },
  {
    slug: "oil-spices",
    nameBn: "তেল ও মসলা",
    nameEn: "Oil & spices",
    icon: "droplet",
    units: ["l", "ml", "kg", "g", "packet"],
    children: [
      { slug: "edible-oil", nameBn: "ভোজ্যতেল", nameEn: "Edible oil" },
      { slug: "spices", nameBn: "মসলা", nameEn: "Spices" },
      { slug: "salt-sugar", nameBn: "লবণ ও চিনি", nameEn: "Salt & sugar" },
    ],
  },
  {
    slug: "fish-meat",
    nameBn: "মাছ ও মাংস",
    nameEn: "Fish & meat",
    icon: "fish",
    units: ["kg", "piece"],
    children: [
      { slug: "fish", nameBn: "মাছ", nameEn: "Fish" },
      { slug: "chicken", nameBn: "মুরগি", nameEn: "Chicken" },
      { slug: "beef-mutton", nameBn: "গরু ও খাসির মাংস", nameEn: "Beef & mutton" },
    ],
  },
  { slug: "eggs-dairy", nameBn: "ডিম ও দুধ", nameEn: "Eggs & dairy", icon: "egg", units: ["dozen", "hali", "piece", "l", "packet"] },
  {
    slug: "gas-fuel",
    nameBn: "গ্যাস ও জ্বালানি",
    nameEn: "Gas & fuel",
    icon: "flame",
    units: ["cylinder", "l", "other"],
    children: [
      { slug: "lpg-cylinder", nameBn: "LPG সিলিন্ডার (নতুন)", nameEn: "LPG cylinder (new)" },
      { slug: "lpg-refill", nameBn: "LPG রিফিল", nameEn: "LPG refill" },
      { slug: "cng", nameBn: "CNG-সংক্রান্ত খরচ", nameEn: "CNG-related costs" },
      { slug: "other-fuel", nameBn: "অন্যান্য জ্বালানি", nameEn: "Other fuel" },
    ],
  },
  {
    slug: "clothing",
    nameBn: "পোশাক",
    nameEn: "Clothing & lifestyle",
    icon: "shirt",
    units: ["piece", "set", "m", "bhori"],
    children: [
      { slug: "clothes", nameBn: "জামাকাপড়", nameEn: "Clothes" },
      { slug: "footwear", nameBn: "জুতা", nameEn: "Footwear" },
      { slug: "bags-watches", nameBn: "ব্যাগ ও ঘড়ি", nameEn: "Bags & watches" },
      { slug: "jewellery", nameBn: "গয়না", nameEn: "Jewellery" },
      { slug: "cosmetics", nameBn: "প্রসাধনী", nameEn: "Cosmetics & personal care" },
    ],
  },
  {
    slug: "electronics",
    nameBn: "ইলেকট্রনিকস",
    nameEn: "Electronics",
    icon: "smartphone",
    units: ["piece", "set"],
    children: [
      { slug: "mobile", nameBn: "মোবাইল", nameEn: "Mobile phones" },
      { slug: "computers", nameBn: "ল্যাপটপ ও কম্পিউটার", nameEn: "Laptops & computers" },
      { slug: "appliances", nameBn: "টিভি, ফ্রিজ ও ফ্যান", nameEn: "TV, fridge & fan" },
    ],
  },
  {
    slug: "household",
    nameBn: "গৃহস্থালি",
    nameEn: "Household",
    icon: "sofa",
    units: ["piece", "set", "packet"],
    children: [
      { slug: "kitchenware", nameBn: "রান্নাঘরের সরঞ্জাম", nameEn: "Kitchenware" },
      { slug: "furniture", nameBn: "আসবাবপত্র", nameEn: "Furniture" },
      { slug: "cleaning", nameBn: "পরিষ্কারের সামগ্রী", nameEn: "Cleaning supplies" },
    ],
  },
  {
    slug: "others",
    nameBn: "অন্যান্য",
    nameEn: "Others",
    icon: "package",
    children: [
      { slug: "agriculture", nameBn: "কৃষিপণ্য ও উপকরণ", nameEn: "Agricultural goods" },
      { slug: "other-products", nameBn: "অন্যান্য পণ্য", nameEn: "Other products" },
    ],
  },
];

export interface SeedProduct {
  slug: string;
  category: string;
  nameBn: string;
  nameEn: string;
  aliases?: string[];
  unit?: UnitCode;
}

/** Common products; aliases cover alternate spellings so reports group correctly. */
export const SEED_PRODUCTS: SeedProduct[] = [
  { slug: "potato", category: "vegetables", nameBn: "আলু", nameEn: "Potato", aliases: ["alu", "aloo", "potatoes"], unit: "kg" },
  { slug: "onion", category: "vegetables", nameBn: "পেঁয়াজ", nameEn: "Onion", aliases: ["পিয়াজ", "পেয়াজ", "piyaj", "peyaj", "onions"], unit: "kg" },
  { slug: "garlic", category: "vegetables", nameBn: "রসুন", nameEn: "Garlic", aliases: ["roshun", "rosun"], unit: "kg" },
  { slug: "ginger", category: "vegetables", nameBn: "আদা", nameEn: "Ginger", aliases: ["ada"], unit: "kg" },
  { slug: "tomato", category: "vegetables", nameBn: "টমেটো", nameEn: "Tomato", aliases: ["tometo", "tomatoes"], unit: "kg" },
  { slug: "brinjal", category: "vegetables", nameBn: "বেগুন", nameEn: "Brinjal", aliases: ["eggplant", "begun"], unit: "kg" },
  { slug: "cauliflower", category: "vegetables", nameBn: "ফুলকপি", nameEn: "Cauliflower", aliases: ["fulkopi"], unit: "piece" },
  { slug: "cabbage", category: "vegetables", nameBn: "বাঁধাকপি", nameEn: "Cabbage", aliases: ["বাধাকপি", "badhakopi"], unit: "piece" },
  { slug: "green-chilli", category: "vegetables", nameBn: "কাঁচামরিচ", nameEn: "Green chilli", aliases: ["কাঁচা মরিচ", "কাচামরিচ", "kacha morich"], unit: "kg" },
  { slug: "cucumber", category: "vegetables", nameBn: "শসা", nameEn: "Cucumber", aliases: ["shosha"], unit: "kg" },
  { slug: "carrot", category: "vegetables", nameBn: "গাজর", nameEn: "Carrot", aliases: ["gajor"], unit: "kg" },
  { slug: "bottle-gourd", category: "vegetables", nameBn: "লাউ", nameEn: "Bottle gourd", aliases: ["lau"], unit: "piece" },
  { slug: "pumpkin", category: "vegetables", nameBn: "মিষ্টিকুমড়া", nameEn: "Pumpkin", aliases: ["মিষ্টি কুমড়া", "kumra"], unit: "kg" },
  { slug: "pointed-gourd", category: "vegetables", nameBn: "পটল", nameEn: "Pointed gourd", aliases: ["potol"], unit: "kg" },
  { slug: "okra", category: "vegetables", nameBn: "ঢেঁড়স", nameEn: "Okra", aliases: ["ঢেড়স", "lady finger", "dheros"], unit: "kg" },
  { slug: "beans", category: "vegetables", nameBn: "শিম", nameEn: "Flat beans", aliases: ["sheem", "shim"], unit: "kg" },
  { slug: "bitter-gourd", category: "vegetables", nameBn: "করলা", nameEn: "Bitter gourd", aliases: ["korola"], unit: "kg" },
  { slug: "papaya", category: "vegetables", nameBn: "পেঁপে", nameEn: "Papaya (green)", aliases: ["পেপে", "pepe"], unit: "kg" },
  { slug: "coriander", category: "vegetables", nameBn: "ধনেপাতা", nameEn: "Coriander leaves", aliases: ["ধনে পাতা", "dhonepata"], unit: "kg" },
  { slug: "spinach", category: "vegetables", nameBn: "পালংশাক", nameEn: "Spinach", aliases: ["পালং শাক", "palong"], unit: "other" },
  { slug: "rice-coarse", category: "rice", nameBn: "মোটা চাল", nameEn: "Coarse rice", aliases: ["চাল মোটা", "mota chal"], unit: "kg" },
  { slug: "rice-miniket", category: "rice", nameBn: "মিনিকেট চাল", nameEn: "Miniket rice", aliases: ["মিনিকেট", "miniket"], unit: "kg" },
  { slug: "rice-nazirshail", category: "rice", nameBn: "নাজিরশাইল চাল", nameEn: "Nazirshail rice", aliases: ["নাজিরশাইল", "nazirshail"], unit: "kg" },
  { slug: "atta", category: "flour", nameBn: "আটা", nameEn: "Atta (wheat flour)", aliases: ["atta", "আটা খোলা"], unit: "kg" },
  { slug: "maida", category: "flour", nameBn: "ময়দা", nameEn: "Maida (refined flour)", aliases: ["moyda", "maida"], unit: "kg" },
  { slug: "lentil-masoor", category: "lentils", nameBn: "মসুর ডাল", nameEn: "Red lentils (masoor)", aliases: ["মসুরের ডাল", "masoor dal", "musur dal"], unit: "kg" },
  { slug: "lentil-mung", category: "lentils", nameBn: "মুগ ডাল", nameEn: "Mung lentils", aliases: ["mug dal", "moong dal"], unit: "kg" },
  { slug: "chickpea", category: "lentils", nameBn: "ছোলা", nameEn: "Chickpeas", aliases: ["chola"], unit: "kg" },
  { slug: "soybean-oil", category: "edible-oil", nameBn: "সয়াবিন তেল", nameEn: "Soybean oil", aliases: ["সোয়াবিন তেল", "soyabean oil", "soybean"], unit: "l" },
  { slug: "mustard-oil", category: "edible-oil", nameBn: "সরিষার তেল", nameEn: "Mustard oil", aliases: ["সরিষা তেল", "sorisha tel"], unit: "l" },
  { slug: "palm-oil", category: "edible-oil", nameBn: "পাম অয়েল", nameEn: "Palm oil", aliases: ["পাম তেল"], unit: "l" },
  { slug: "salt", category: "salt-sugar", nameBn: "লবণ", nameEn: "Salt", aliases: ["লবন", "lobon"], unit: "kg" },
  { slug: "sugar", category: "salt-sugar", nameBn: "চিনি", nameEn: "Sugar", aliases: ["chini"], unit: "kg" },
  { slug: "turmeric", category: "spices", nameBn: "হলুদ", nameEn: "Turmeric", aliases: ["holud"], unit: "kg" },
  { slug: "dry-chilli", category: "spices", nameBn: "শুকনা মরিচ", nameEn: "Dried chilli", aliases: ["মরিচ গুঁড়া", "morich"], unit: "kg" },
  { slug: "chicken-broiler", category: "chicken", nameBn: "ব্রয়লার মুরগি", nameEn: "Broiler chicken", aliases: ["ব্রয়লার", "broiler", "মুরগি"], unit: "kg" },
  { slug: "chicken-sonali", category: "chicken", nameBn: "সোনালি মুরগি", nameEn: "Sonali chicken", aliases: ["সোনালী মুরগি", "sonali"], unit: "kg" },
  { slug: "chicken-deshi", category: "chicken", nameBn: "দেশি মুরগি", nameEn: "Deshi chicken", aliases: ["দেশী মুরগি", "deshi murgi"], unit: "kg" },
  { slug: "beef", category: "beef-mutton", nameBn: "গরুর মাংস", nameEn: "Beef", aliases: ["gorur mangsho"], unit: "kg" },
  { slug: "mutton", category: "beef-mutton", nameBn: "খাসির মাংস", nameEn: "Mutton (goat)", aliases: ["khasir mangsho"], unit: "kg" },
  { slug: "fish-rui", category: "fish", nameBn: "রুই মাছ", nameEn: "Rui fish", aliases: ["রুই", "rohu"], unit: "kg" },
  { slug: "fish-hilsa", category: "fish", nameBn: "ইলিশ মাছ", nameEn: "Hilsa", aliases: ["ইলিশ", "ilish"], unit: "kg" },
  { slug: "fish-pangas", category: "fish", nameBn: "পাঙ্গাস মাছ", nameEn: "Pangas fish", aliases: ["পাঙাস", "pangash"], unit: "kg" },
  { slug: "fish-tilapia", category: "fish", nameBn: "তেলাপিয়া মাছ", nameEn: "Tilapia", aliases: ["তেলাপিয়া"], unit: "kg" },
  { slug: "egg-farm", category: "eggs-dairy", nameBn: "ফার্মের ডিম", nameEn: "Farm eggs", aliases: ["ডিম", "egg", "eggs", "লাল ডিম"], unit: "dozen" },
  { slug: "egg-duck", category: "eggs-dairy", nameBn: "হাঁসের ডিম", nameEn: "Duck eggs", aliases: ["haser dim"], unit: "hali" },
  { slug: "milk", category: "eggs-dairy", nameBn: "তরল দুধ", nameEn: "Milk", aliases: ["দুধ", "dudh"], unit: "l" },
  { slug: "lpg-12kg-refill", category: "lpg-refill", nameBn: "LPG সিলিন্ডার রিফিল (১২ কেজি)", nameEn: "LPG refill (12 kg)", aliases: ["এলপিজি গ্যাস", "lpg", "গ্যাস সিলিন্ডার", "lpg gas"], unit: "cylinder" },
  { slug: "lpg-cylinder-new", category: "lpg-cylinder", nameBn: "নতুন LPG সিলিন্ডার", nameEn: "New LPG cylinder", aliases: ["এলপিজি সিলিন্ডার"], unit: "cylinder" },
  { slug: "cng-refill", category: "cng", nameBn: "CNG রিফিল (প্রতি ঘনমিটার)", nameEn: "CNG refill (per cubic metre)", aliases: ["সিএনজি", "cng"], unit: "other" },
  { slug: "octane", category: "other-fuel", nameBn: "অকটেন", nameEn: "Octane", aliases: ["octane"], unit: "l" },
  { slug: "kerosene", category: "other-fuel", nameBn: "কেরোসিন", nameEn: "Kerosene", aliases: ["kerosin"], unit: "l" },
  { slug: "lungi", category: "clothes", nameBn: "লুঙ্গি", nameEn: "Lungi", unit: "piece" },
  { slug: "saree", category: "clothes", nameBn: "শাড়ি", nameEn: "Saree", aliases: ["শাড়ী"], unit: "piece" },
  { slug: "gold-22k", category: "jewellery", nameBn: "সোনা (২২ ক্যারেট)", nameEn: "Gold (22 karat)", aliases: ["সোনা", "gold"], unit: "bhori" },
  { slug: "smartphone", category: "mobile", nameBn: "স্মার্টফোন", nameEn: "Smartphone", aliases: ["মোবাইল", "mobile"], unit: "piece" },
  { slug: "ceiling-fan", category: "appliances", nameBn: "সিলিং ফ্যান", nameEn: "Ceiling fan", aliases: ["ফ্যান", "fan"], unit: "piece" },
  { slug: "rice-cooker", category: "kitchenware", nameBn: "রাইস কুকার", nameEn: "Rice cooker", unit: "piece" },
  { slug: "urea", category: "agriculture", nameBn: "ইউরিয়া সার", nameEn: "Urea fertiliser", aliases: ["ইউরিয়া", "urea"], unit: "kg" },
];
