export type MoodId = "nature" | "food" | "heritage" | "coast" | "adventure" | "slow";
export type Province = "Gilgit-Baltistan" | "Khyber Pakhtunkhwa" | "Punjab" | "Sindh" | "Balochistan" | "Azad Kashmir";
export type Coordinates = [number, number];

export type City = {
  id: string;
  name: string;
  province: string;
  coordinates: Coordinates;
  airportCode?: string;
};

export type FlightEstimate = {
  airport: string;
  code: string;
  roundTripLow: number;
  roundTripHigh: number;
  transferKm?: number;
  transferPerPerson?: number;
  note?: string;
};

export type Destination = {
  id: string;
  name: string;
  province: Province;
  subregion: string;
  category: string;
  moods: MoodId[];
  coordinates: Coordinates;
  image: string;
  imageAlt: string;
  imageCredit: string;
  intro: string;
  localTip: string;
  bestTime: string;
  stayPerNight: number;
  foodPerDay: number;
  activityBudget: number;
  localRidePerDay: number;
  flight?: FlightEstimate;
  featured?: boolean;
};

export const moods: { id: MoodId; label: string; icon: string; description: string }[] = [
  { id: "nature", label: "Green & quiet", icon: "🌿", description: "Lakes, valleys & fresh air" },
  { id: "food", label: "Here for the food", icon: "🍲", description: "Stalls, tea & local favourites" },
  { id: "heritage", label: "A little history", icon: "🏛", description: "Old streets, forts & stories" },
  { id: "coast", label: "Sea-air mood", icon: "🌊", description: "Beaches & the Makran coast" },
  { id: "adventure", label: "A bit of a thrill", icon: "⛰", description: "Trails, passes & big views" },
  { id: "slow", label: "Easy does it", icon: "☕", description: "One good place, no rush" },
];

export const origins: City[] = [
  { id: "islamabad", name: "Islamabad", province: "Islamabad Capital Territory", coordinates: [33.6844, 73.0479], airportCode: "ISB" },
  { id: "lahore", name: "Lahore", province: "Punjab", coordinates: [31.5204, 74.3587], airportCode: "LHE" },
  { id: "karachi", name: "Karachi", province: "Sindh", coordinates: [24.8607, 67.0011], airportCode: "KHI" },
  { id: "peshawar", name: "Peshawar", province: "Khyber Pakhtunkhwa", coordinates: [34.0151, 71.5249], airportCode: "PEW" },
  { id: "quetta", name: "Quetta", province: "Balochistan", coordinates: [30.1798, 66.975], airportCode: "UET" },
  { id: "multan", name: "Multan", province: "Punjab", coordinates: [30.1575, 71.5249], airportCode: "MUX" },
  { id: "gilgit", name: "Gilgit", province: "Gilgit-Baltistan", coordinates: [35.9208, 74.3144], airportCode: "GIL" },
  { id: "skardu", name: "Skardu", province: "Gilgit-Baltistan", coordinates: [35.2971, 75.6333], airportCode: "KDU" },
  { id: "muzaffarabad", name: "Muzaffarabad", province: "Azad Kashmir", coordinates: [34.3704, 73.4712] },
];

export const regions: { id: string; label: string }[] = [
  { id: "all", label: "All Pakistan" },
  { id: "Gilgit-Baltistan", label: "Gilgit-Baltistan" },
  { id: "Khyber Pakhtunkhwa", label: "Khyber Pakhtunkhwa" },
  { id: "Punjab", label: "Punjab" },
  { id: "Sindh", label: "Sindh" },
  { id: "Balochistan", label: "Balochistan" },
  { id: "Azad Kashmir", label: "Azad Kashmir" },
];

export const destinations: Destination[] = [
  {
    id: "hunza", name: "Hunza Valley", province: "Gilgit-Baltistan", subregion: "North · Gilgit-Baltistan", category: "Mountain escape", moods: ["nature", "adventure", "slow"], coordinates: [36.3167, 74.65],
    image: "/images/hunza-hero.jpg", imageAlt: "Karakoram Highway curling through Hunza towards dramatic mountain peaks", imageCredit: "Rāh original artwork",
    intro: "Glacier-blue rivers, apricot orchards and the sort of mountain morning that slows everything down.", localTip: "Start early for the Karakoram Highway viewpoints; ask your guesthouse about local jeep shares for upper villages.", bestTime: "Apr–Oct · check mountain road conditions", stayPerNight: 7200, foodPerDay: 2200, activityBudget: 7000, localRidePerDay: 1500,
    flight: { airport: "Gilgit Airport", code: "GIL", roundTripLow: 32000, roundTripHigh: 68000, transferKm: 100, transferPerPerson: 10000, note: "The last leg to Hunza is by road." }, featured: true,
  },
  {
    id: "skardu", name: "Skardu & Shangrila", province: "Gilgit-Baltistan", subregion: "North · Gilgit-Baltistan", category: "Lake & mountain", moods: ["nature", "adventure", "slow"], coordinates: [35.2971, 75.6333],
    image: "https://images.pexels.com/photos/35302567/pexels-photo-35302567.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "Shangrila Resort beside a lake with mountains around Skardu", imageCredit: "Arif Esapzai / Pexels",
    intro: "A quieter world of turquoise lakes, high passes and wide-open Baltistan skies.", localTip: "Keep a weather buffer day for flights; compare driving and flying before you lock in dates.", bestTime: "May–Oct · flights and passes are weather-sensitive", stayPerNight: 8200, foodPerDay: 2400, activityBudget: 9500, localRidePerDay: 2300,
    flight: { airport: "Skardu Airport", code: "KDU", roundTripLow: 38000, roundTripHigh: 82000, transferKm: 18, transferPerPerson: 1000, note: "Airfares are a planning range, not live quotes." }, featured: true,
  },
  {
    id: "swat", name: "Swat Valley", province: "Khyber Pakhtunkhwa", subregion: "North-west · Khyber Pakhtunkhwa", category: "River & forest", moods: ["nature", "food", "adventure", "slow"], coordinates: [35.2000, 72.4258],
    image: "https://images.pexels.com/photos/36388101/pexels-photo-36388101.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "Jarogo Waterfall surrounded by green forest in Swat Valley", imageCredit: "Amjad Ali / Pexels",
    intro: "River air, pine shade, trout lunches and a very good excuse to take the scenic road.", localTip: "Mingora is a handy base; confirm local access and travel advisories before heading into the valley.", bestTime: "Apr–Oct · check local travel advice", stayPerNight: 4800, foodPerDay: 1800, activityBudget: 4000, localRidePerDay: 1100,
    flight: { airport: "Saidu Sharif Airport", code: "SDT", roundTripLow: 32000, roundTripHigh: 64000, transferKm: 20, transferPerPerson: 1200, note: "Scheduled service can vary; check airline availability." }, featured: true,
  },
  {
    id: "naran", name: "Naran & Kaghan", province: "Khyber Pakhtunkhwa", subregion: "North · Khyber Pakhtunkhwa", category: "River & lake", moods: ["nature", "adventure", "slow"], coordinates: [34.9098, 73.6515],
    image: "https://images.pexels.com/photos/39639380/pexels-photo-39639380.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "A river winding through a green mountain valley in northern Pakistan", imageCredit: "Amjad Ali / Pexels · illustrative",
    intro: "Follow the Kunhar upstream for crisp mornings, roadside chai and a big blue lake at the end of the road.", localTip: "The Babusar Pass is seasonal; verify access and weather locally before planning a crossing.", bestTime: "Jun–Sep · seasonal road access", stayPerNight: 4300, foodPerDay: 1700, activityBudget: 4200, localRidePerDay: 1300, featured: true,
  },
  {
    id: "chitral", name: "Chitral & Kalash", province: "Khyber Pakhtunkhwa", subregion: "Hindu Kush · Khyber Pakhtunkhwa", category: "Mountain culture", moods: ["nature", "heritage", "adventure", "slow"], coordinates: [35.8510, 71.7864],
    image: "https://images.pexels.com/photos/12540840/pexels-photo-12540840.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "A winding road in a forested mountain landscape", imageCredit: "Tauseef Khaliq / Pexels · illustrative",
    intro: "A far-northwest detour for high passes, Chitrali hospitality and a culture all its own.", localTip: "Kalash villages are living communities: travel with a local guide and follow local photography customs.", bestTime: "May–Oct · pass status can change", stayPerNight: 5400, foodPerDay: 1800, activityBudget: 6000, localRidePerDay: 1600,
    flight: { airport: "Chitral Airport", code: "CJL", roundTripLow: 30000, roundTripHigh: 72000, transferKm: 12, transferPerPerson: 700, note: "Limited flights: confirm operating days." },
  },
  {
    id: "fairy-meadows", name: "Fairy Meadows", province: "Gilgit-Baltistan", subregion: "Diamer · Gilgit-Baltistan", category: "Trek & stargaze", moods: ["nature", "adventure", "slow"], coordinates: [35.3801, 74.5988],
    image: "/images/hunza-hero.jpg", imageAlt: "Alpine meadows beneath the high Karakoram", imageCredit: "Rāh original artwork · illustrative",
    intro: "An unforgettable, properly off-grid meadow beneath Nanga Parbat—with a serious last mile.", localTip: "There is a 4×4 jeep leg and a hike. Check access, local operators, weather and fitness before you go.", bestTime: "May–Sep · local access is essential", stayPerNight: 7600, foodPerDay: 2000, activityBudget: 10500, localRidePerDay: 3400,
    flight: { airport: "Gilgit Airport", code: "GIL", roundTripLow: 32000, roundTripHigh: 68000, transferKm: 75, transferPerPerson: 13000, note: "The jeep road and final trek cannot be replaced by a flight." }, featured: true,
  },
  {
    id: "murree", name: "Murree & Galiyat", province: "Punjab", subregion: "Potohar · Punjab", category: "Hill-country reset", moods: ["nature", "food", "slow"], coordinates: [33.9062, 73.3903],
    image: "https://images.pexels.com/photos/1303469/pexels-photo-1303469.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "A winding road through cloud-covered mountains in Pakistan", imageCredit: "mhtoori / Pexels",
    intro: "A cool-air classic: trail time, chai stops and pine-covered ridgelines close to the capital.", localTip: "Try a weekday or a smaller Galiyat base; check the Expressway traffic before leaving Islamabad.", bestTime: "Mar–Oct · weekend traffic can be heavy", stayPerNight: 5900, foodPerDay: 2000, activityBudget: 3200, localRidePerDay: 900, featured: true,
  },
  {
    id: "neelum", name: "Neelum Valley", province: "Azad Kashmir", subregion: "Azad Kashmir", category: "River valley", moods: ["nature", "adventure", "slow"], coordinates: [34.5850, 73.9070],
    image: "https://images.pexels.com/photos/38395710/pexels-photo-38395710.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "A river and green mountain forest in Kashmir", imageCredit: "Mysara Hassan / Pexels · illustrative",
    intro: "A long, beautiful river-road through deep-green Kashmir, best done with time to spare.", localTip: "Roads and mobile coverage vary in the valley. Check current local guidance and keep your route flexible.", bestTime: "Apr–Oct · verify road and regional advisories", stayPerNight: 4700, foodPerDay: 1700, activityBudget: 3500, localRidePerDay: 1400,
  },
  {
    id: "lahore", name: "Lahore", province: "Punjab", subregion: "Punjab · the old city", category: "Food & old city", moods: ["food", "heritage", "slow"], coordinates: [31.5204, 74.3587],
    image: "https://images.pexels.com/photos/14926132/pexels-photo-14926132.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "Lahore Fort with a minaret under a warm sunset sky", imageCredit: "Mian Rizwan / Pexels",
    intro: "Sunset at the Fort, early walks in the old city and a very ambitious food itinerary.", localTip: "Go early to the old city with a local; order one thing from the counter that has a queue.", bestTime: "Oct–Mar · early starts beat the heat", stayPerNight: 6500, foodPerDay: 2900, activityBudget: 4500, localRidePerDay: 1000,
    flight: { airport: "Allama Iqbal International", code: "LHE", roundTripLow: 18000, roundTripHigh: 46000, transferKm: 20, transferPerPerson: 1200, note: "Round-trip planning range from another major city." }, featured: true,
  },
  {
    id: "karachi", name: "Karachi", province: "Sindh", subregion: "Sindh · the coast", category: "Coast & street food", moods: ["food", "coast", "heritage", "slow"], coordinates: [24.8607, 67.0011],
    image: "https://images.pexels.com/photos/18470153/pexels-photo-18470153.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "A Karachi beach at golden hour", imageCredit: "Ashiq Ali / Pexels",
    intro: "Late-night bites, sea-breeze evenings and a city that always has one more neighbourhood to show you.", localTip: "Choose a stay close to what you plan to do and check local transport and beach advisories.", bestTime: "Nov–Feb · coastal evenings", stayPerNight: 6800, foodPerDay: 2800, activityBudget: 4000, localRidePerDay: 1600,
    flight: { airport: "Jinnah International", code: "KHI", roundTripLow: 22000, roundTripHigh: 56000, transferKm: 20, transferPerPerson: 1600, note: "Round-trip planning range from another major city." }, featured: true,
  },
  {
    id: "gwadar", name: "Gwadar & Makran Coast", province: "Balochistan", subregion: "Makran · Balochistan", category: "Coastal escape", moods: ["coast", "adventure", "slow"], coordinates: [25.1216, 62.3225],
    image: "https://images.pexels.com/photos/6844834/pexels-photo-6844834.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "Rock formations at the edge of the blue Arabian Sea", imageCredit: "PhotoPoet / Pexels · illustrative",
    intro: "Open sea, the Makran Coastal Highway and a huge, quiet horizon at the edge of the country.", localTip: "Plan fuel and daylight carefully. Check security advice, road conditions and permitted stops before travel.", bestTime: "Oct–Mar · check local security and road advice", stayPerNight: 5900, foodPerDay: 1900, activityBudget: 6500, localRidePerDay: 2200,
    flight: { airport: "Gwadar Airport", code: "GWD", roundTripLow: 31000, roundTripHigh: 72000, transferKm: 15, transferPerPerson: 900, note: "Schedules are limited; verify the airline timetable." }, featured: true,
  },
  {
    id: "hingol", name: "Hingol National Park", province: "Balochistan", subregion: "Makran · Balochistan", category: "Coastal wilderness", moods: ["nature", "coast", "adventure"], coordinates: [25.5144, 65.5036],
    image: "https://images.pexels.com/photos/12180798/pexels-photo-12180798.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "Sculpted red rock formations in Hingol National Park, Balochistan", imageCredit: "Hanif Ali Baluch / Pexels",
    intro: "Otherworldly desert rock, a coastal highway and one of Pakistan's wildest open spaces.", localTip: "This is remote country: use a knowledgeable local operator and check official travel advice first.", bestTime: "Nov–Feb · avoid peak heat", stayPerNight: 5400, foodPerDay: 1800, activityBudget: 8500, localRidePerDay: 2900,
  },
  {
    id: "cholistan", name: "Cholistan & Derawar", province: "Punjab", subregion: "South Punjab", category: "Desert & fort", moods: ["nature", "heritage", "adventure", "slow"], coordinates: [28.7760, 71.3350],
    image: "https://images.pexels.com/photos/29147674/pexels-photo-29147674.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "Golden desert dunes beneath a low sun", imageCredit: "Engin Akyurt / Pexels · illustrative",
    intro: "A monumental desert fort, big still skies and the kind of quiet you can hear.", localTip: "Go with a local guide, carry water and check access before crossing into the desert.", bestTime: "Nov–Feb · avoid midday heat", stayPerNight: 4600, foodPerDay: 1700, activityBudget: 6000, localRidePerDay: 1500,
    flight: { airport: "Bahawalpur Airport", code: "BHV", roundTripLow: 23000, roundTripHigh: 56000, transferKm: 95, transferPerPerson: 4500, note: "Derawar Fort needs a road transfer from Bahawalpur." },
  },
  {
    id: "multan", name: "Multan", province: "Punjab", subregion: "South Punjab", category: "Sufi & old city", moods: ["food", "heritage", "slow"], coordinates: [30.1575, 71.5249],
    image: "https://images.pexels.com/photos/36483412/pexels-photo-36483412.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "The historic tiled shrine architecture of Multan", imageCredit: "Quiet Pixels / Pexels",
    intro: "Mango-sweet afternoons, glowing blue tilework and a deeply layered old city.", localTip: "Cover the shrines early or near sunset; dress respectfully and ask before taking photographs.", bestTime: "Oct–Mar · mango season is a bonus", stayPerNight: 4200, foodPerDay: 1900, activityBudget: 3200, localRidePerDay: 800,
    flight: { airport: "Multan International", code: "MUX", roundTripLow: 19000, roundTripHigh: 48000, transferKm: 10, transferPerPerson: 700, note: "Round-trip planning range from another major city." },
  },
  {
    id: "mohenjo-daro", name: "Mohenjo-daro", province: "Sindh", subregion: "Larkana · Sindh", category: "Ancient civilisation", moods: ["heritage", "slow"], coordinates: [27.3290, 68.1380],
    image: "https://images.pexels.com/photos/39524576/pexels-photo-39524576.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "Ancient archaeological remains along the Indus River", imageCredit: "Shamshir Lall / Pexels · illustrative",
    intro: "Walk the streets of a 4,500-year-old city and let the quiet do most of the talking.",
    localTip: "Arrive early to beat the heat; confirm site opening hours and museum access before travelling.", bestTime: "Nov–Feb · early starts recommended", stayPerNight: 4300, foodPerDay: 1400, activityBudget: 1800, localRidePerDay: 900,
  },
  {
    id: "quetta-ziarat", name: "Quetta & Ziarat", province: "Balochistan", subregion: "Balochistan highlands", category: "Highland culture", moods: ["nature", "food", "heritage", "slow"], coordinates: [30.3753, 67.7250],
    image: "https://images.pexels.com/photos/13474303/pexels-photo-13474303.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "An evening landscape under the warm colours of the setting sun", imageCredit: "Antonio Di Giacomo / Pexels · illustrative",
    intro: "Dry mountain air, an ancient juniper forest and a slower side of Balochistan.", localTip: "Ziarat is a road trip from Quetta; check advisories, daylight driving and local access first.", bestTime: "Apr–Oct · check local travel guidance", stayPerNight: 5200, foodPerDay: 1800, activityBudget: 4500, localRidePerDay: 1300,
    flight: { airport: "Quetta International", code: "UET", roundTripLow: 23000, roundTripHigh: 57000, transferKm: 10, transferPerPerson: 900, note: "Ziarat needs a separate road transfer." },
  },
  {
    id: "islamabad", name: "Islamabad & Margalla", province: "Punjab", subregion: "The capital", category: "City & easy trails", moods: ["nature", "food", "heritage", "slow"], coordinates: [33.6844, 73.0479],
    image: "https://images.pexels.com/photos/1303469/pexels-photo-1303469.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "Soft afternoon cloud over a forested landscape", imageCredit: "mhtoori / Pexels · illustrative",
    intro: "A gentle city break with Margalla trails, a generous brunch scene and room to breathe.", localTip: "Pick a trail that suits the day and check Margalla Hills National Park notices before setting off.", bestTime: "Oct–Apr · comfortable trail weather", stayPerNight: 6500, foodPerDay: 2300, activityBudget: 2500, localRidePerDay: 900,
    flight: { airport: "Islamabad International", code: "ISB", roundTripLow: 18000, roundTripHigh: 46000, transferKm: 30, transferPerPerson: 1300, note: "Round-trip planning range from another major city." },
  },
  {
    id: "taxila", name: "Taxila & Kallar Kahar", province: "Punjab", subregion: "Potohar · Punjab", category: "Ancient trails", moods: ["heritage", "nature", "slow"], coordinates: [33.7460, 72.7980],
    image: "https://images.pexels.com/photos/34619221/pexels-photo-34619221.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "A historic sandstone minaret catching the afternoon sun", imageCredit: "Abdullah Malik / Pexels · illustrative",
    intro: "Gandharan history and a breezy salt-range stop, both easy to fold into a longer escape.",
    localTip: "Check museum and site hours before you go; take water and a hat for the outdoor ruins.", bestTime: "Oct–Mar · cool, clear days", stayPerNight: 3500, foodPerDay: 1500, activityBudget: 2400, localRidePerDay: 650,
  },
  {
    id: "deosai", name: "Deosai National Park", province: "Gilgit-Baltistan", subregion: "Baltistan · Gilgit-Baltistan", category: "High-altitude wilderness", moods: ["nature", "adventure", "slow"], coordinates: [35.0260, 75.4080],
    image: "https://images.pexels.com/photos/19442077/pexels-photo-19442077.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "An open high mountain lake and wide alpine landscape in Pakistan", imageCredit: "Wasif Mehmood / Pexels · illustrative",
    intro: "Wildflowers, open sky and an immense high-altitude plateau above Skardu.", localTip: "Deosai is high, exposed and seasonal. Use a local driver, check park access and allow time to acclimatise.", bestTime: "Jul–Sep · weather and road access vary", stayPerNight: 8200, foodPerDay: 2300, activityBudget: 9000, localRidePerDay: 3300,
    flight: { airport: "Skardu Airport", code: "KDU", roundTripLow: 38000, roundTripHigh: 82000, transferKm: 55, transferPerPerson: 13500, note: "The plateau needs a 4×4 road transfer from Skardu." },
  },
  {
    id: "astore", name: "Astore & Rama Meadows", province: "Gilgit-Baltistan", subregion: "Diamer · Gilgit-Baltistan", category: "Alpine meadow", moods: ["nature", "adventure", "slow"], coordinates: [35.3450, 74.8200],
    image: "https://images.pexels.com/photos/15793176/pexels-photo-15793176.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200", imageAlt: "A broad northern valley with river and mountains beneath shifting clouds", imageCredit: "Wasif Mehmood / Pexels · illustrative",
    intro: "An unhurried alpine alternative: pine forest, Rama Lake and big mountain mornings.", localTip: "The final roads are best discussed with a local driver; ask about weather and road status before departure.", bestTime: "May–Oct · mountain roads are seasonal", stayPerNight: 6200, foodPerDay: 2000, activityBudget: 6000, localRidePerDay: 2500,
    flight: { airport: "Gilgit Airport", code: "GIL", roundTripLow: 32000, roundTripHigh: 68000, transferKm: 100, transferPerPerson: 9500, note: "Local road transfer from Gilgit is required." },
  },
];

export function getDestination(id: string): Destination | undefined {
  return destinations.find((destination) => destination.id === id);
}

export function getOrigin(id: string): City | undefined {
  return origins.find((origin) => origin.id === id);
}
