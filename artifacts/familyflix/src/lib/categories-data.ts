export interface SubgenreItem {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  contentType: "movies" | "series" | "both";
  iconName: string;
  section: "popular" | "movies" | "series" | "cultural" | "lifestyle" | "family";
  subgenres: string[];
}

export const MAIN_CATEGORIES: CategoryItem[] = [
  // 1. Action
  {
    id: "action",
    name: "Action",
    slug: "action",
    description: "Adrenaline-fueled blockbusters, explosive firefights, martial arts, and high-speed chases.",
    contentType: "both",
    iconName: "Zap",
    section: "popular",
    subgenres: ["Action Thrillers", "Action Comedies", "Martial Arts Action"],
  },
  // 2. Adult Animation
  {
    id: "adult-animation",
    name: "Adult Animation",
    slug: "adult-animation",
    description: "Unfiltered, subversive animated comedy, dark satire, and bold adult storytelling.",
    contentType: "both",
    iconName: "Flame",
    section: "movies",
    subgenres: ["Animated Movies", "Animated Series"],
  },
  // 3. Adult Comedy
  {
    id: "adult-comedy",
    name: "Adult Comedy",
    slug: "adult-comedy",
    description: "Raunchy romps, irreverent parodies, outrageous party misadventures, and R-rated laughs.",
    contentType: "both",
    iconName: "SmilePlus",
    section: "popular",
    subgenres: ["Action Comedies", "Romantic Comedies"],
  },
  // 4. Anime
  {
    id: "anime",
    name: "Anime",
    slug: "anime",
    description: "Japanese animation masterpieces, shonen epics, mecha battles, and fantasy sagas.",
    contentType: "both",
    iconName: "Sparkles",
    section: "cultural",
    subgenres: ["Animated Movies", "Fantasy Adventures"],
  },
  // 5. Arthouse Films
  {
    id: "arthouse-films",
    name: "Arthouse Films",
    slug: "arthouse-films",
    description: "Provocative cinema, auteur visions, film festival standouts, and bold experimental storytelling.",
    contentType: "movies",
    iconName: "Eye",
    section: "movies",
    subgenres: ["Psychological Thrillers", "Historical Dramas", "Foreign-Language Movies"],
  },
  // 6. Based on True Events
  {
    id: "based-on-true-events",
    name: "Based on True Events",
    slug: "based-on-true-events",
    description: "Riveting historical events, real-life figures, monumental triumphs, and true stories that shaped our world.",
    contentType: "both",
    iconName: "FileText",
    section: "lifestyle",
    subgenres: ["True Crime", "Historical Dramas", "Sports Documentaries"],
  },
  // 7. Classics
  {
    id: "classics",
    name: "Classics",
    slug: "classics",
    description: "Timeless golden age gems, silver-screen legends, and iconic cinema from the 1930s through 1980.",
    contentType: "both",
    iconName: "Clock",
    section: "movies",
    subgenres: ["Historical Dramas", "Western Adventures"],
  },
  // 8. Comedy
  {
    id: "comedy",
    name: "Comedy",
    slug: "comedy",
    description: "Feel-good chuckles, screwball satires, witty stand-up specials, and comedic crowd-pleasers.",
    contentType: "both",
    iconName: "Smile",
    section: "popular",
    subgenres: ["Action Comedies", "Romantic Comedies"],
  },
  // 9. Crime TV
  {
    id: "crime-tv",
    name: "Crime TV",
    slug: "crime-tv",
    description: "Addictive detective procedurals, federal manhunts, forensic squads, and gritty underworld TV series.",
    contentType: "series",
    iconName: "ShieldAlert",
    section: "series",
    subgenres: ["Crime Thrillers", "True Crime"],
  },
  // 10. Documentary
  {
    id: "documentary",
    name: "Documentary",
    slug: "documentary",
    description: "Eye-opening investigative journalism, environmental marvels, scientific journeys, and cultural portraits.",
    contentType: "both",
    iconName: "Video",
    section: "lifestyle",
    subgenres: ["True Crime", "Nature Documentaries", "Sports Documentaries"],
  },
  // 11. Docuseries
  {
    id: "docuseries",
    name: "Docuseries",
    slug: "docuseries",
    description: "Deep-dive episodic investigative chronicles, multi-part real-crime sagas, and global history tours.",
    contentType: "series",
    iconName: "Layers",
    section: "series",
    subgenres: ["True Crime", "Nature Documentaries"],
  },
  // 12. Drama
  {
    id: "drama",
    name: "Drama",
    slug: "drama",
    description: "Emotionally resonant narratives, high-stakes human dilemmas, gripping family sagas, and prestige performances.",
    contentType: "both",
    iconName: "HeartCrack",
    section: "popular",
    subgenres: ["Romantic Dramas", "Historical Dramas", "Psychological Thrillers"],
  },
  // 13. Faith
  {
    id: "faith",
    name: "Faith",
    slug: "faith",
    description: "Uplifting messages of hope, spiritual journeys, biblically inspired cinema, and stories of redemption.",
    contentType: "both",
    iconName: "Cross",
    section: "cultural",
    subgenres: ["Historical Dramas", "Romantic Dramas"],
  },
  // 14. Family Movies
  {
    id: "family-movies",
    name: "Family Movies",
    slug: "family-movies",
    description: "Wholesome, heartwarming cinematic delights safe and entertaining for kids, parents, and grandparents alike.",
    contentType: "movies",
    iconName: "Users",
    section: "family",
    subgenres: ["Animated Movies", "Fantasy Adventures"],
  },
  // 15. Family Series
  {
    id: "family-series",
    name: "Family Series",
    slug: "family-series",
    description: "Binge-worthy wholesome shows, youth adventures, and animated episodic series built for family movie nights.",
    contentType: "series",
    iconName: "Home",
    section: "family",
    subgenres: ["Animated Series"],
  },
  // 16. Film Noir
  {
    id: "film-noir",
    name: "Film Noir",
    slug: "film-noir",
    description: "Shadow-drenched alleys, cigarette smoke, cynical gumshoes, and double-crossing sirens of fate.",
    contentType: "movies",
    iconName: "Moon",
    section: "movies",
    subgenres: ["Crime Thrillers", "Psychological Thrillers"],
  },
  // 17. Foreign Films
  {
    id: "foreign-films",
    name: "Foreign Films",
    slug: "foreign-films",
    description: "Acclaimed international cinema with authentic cultural perspectives, subtitled across major world languages.",
    contentType: "movies",
    iconName: "Globe",
    section: "cultural",
    subgenres: ["Foreign-Language Movies", "Historical Dramas"],
  },
  // 18. Foreign TV
  {
    id: "foreign-tv",
    name: "Foreign TV",
    slug: "foreign-tv",
    description: "Top-tier international television, British mysteries, European thrillers, and acclaimed global drama series.",
    contentType: "series",
    iconName: "Tv",
    section: "series",
    subgenres: ["Crime Thrillers", "Historical Dramas"],
  },
  // 19. Heist Films
  {
    id: "heist-films",
    name: "Heist Films",
    slug: "heist-films",
    description: "Elaborate vault break-ins, master con artists, high-stakes capers, and unforgettable getaway races.",
    contentType: "movies",
    iconName: "KeyRound",
    section: "movies",
    subgenres: ["Crime Thrillers", "Action Thrillers"],
  },
  // 20. Home & Garden
  {
    id: "home-garden",
    name: "Home & Garden",
    slug: "home-garden",
    description: "Dream home transformations, architectural tours, landscape designing, and home improvement inspirations.",
    contentType: "both",
    iconName: "Trees",
    section: "lifestyle",
    subgenres: ["Reality Competitions"],
  },
  // 21. Horror
  {
    id: "horror",
    name: "Horror",
    slug: "horror",
    description: "Hair-raising jump scares, midnight terrors, psychological torment, and iconic monster encounters.",
    contentType: "both",
    iconName: "Ghost",
    section: "popular",
    subgenres: ["Supernatural Horror", "Slasher Horror", "Psychological Thrillers"],
  },
  // 22. Indie Films
  {
    id: "indie-films",
    name: "Indie Films",
    slug: "indie-films",
    description: "Fresh independent voices, Sundance darlings, boundary-pushing scripts, and authentic character studies.",
    contentType: "movies",
    iconName: "Clapperboard",
    section: "movies",
    subgenres: ["Romantic Dramas", "Psychological Thrillers"],
  },
  // 23. Italian Horror & Giallo
  {
    id: "italian-horror-giallo",
    name: "Italian Horror & Giallo",
    slug: "italian-horror-giallo",
    description: "Stylized murder mysteries, vibrant technicolor blood, black-gloved slashers, and gothic Italian suspense.",
    contentType: "movies",
    iconName: "Skull",
    section: "movies",
    subgenres: ["Slasher Horror", "Psychological Thrillers"],
  },
  // 24. Killer Thrillers
  {
    id: "killer-thrillers",
    name: "Killer Thrillers",
    slug: "killer-thrillers",
    description: "Ruthless predators on the loose, FBI profiler races, and chilling cat-and-mouse deadly games.",
    contentType: "both",
    iconName: "Radio",
    section: "popular",
    subgenres: ["Psychological Thrillers", "Slasher Horror", "Crime Thrillers"],
  },
  // 25. LGBTQIA+
  {
    id: "lgbtqia",
    name: "LGBTQIA+",
    slug: "lgbtqia",
    description: "Authentic queer storytelling, groundbreaking romances, inspiring historical icons, and community celebration.",
    contentType: "both",
    iconName: "Rainbow",
    section: "cultural",
    subgenres: ["Romantic Dramas", "Romantic Comedies"],
  },
  // 26. Lifestyle
  {
    id: "lifestyle",
    name: "Lifestyle",
    slug: "lifestyle",
    description: "Culinary cook-offs, fashion showcases, wellness masterclasses, and vibrant cultural explorations.",
    contentType: "both",
    iconName: "Coffee",
    section: "lifestyle",
    subgenres: ["Reality Competitions"],
  },
  // 27. Martial Arts
  {
    id: "martial-arts",
    name: "Martial Arts",
    slug: "martial-arts",
    description: "Precision kung fu masters, samurai blade clashes, tournament brawls, and martial arts legends.",
    contentType: "movies",
    iconName: "Swords",
    section: "cultural",
    subgenres: ["Martial Arts Action", "Action Thrillers"],
  },
  // 28. Music & Concerts
  {
    id: "music-concerts",
    name: "Music & Concerts",
    slug: "music-concerts",
    description: "Electrifying stadium rock shows, jazz archives, classical symphonies, and music icon biographies.",
    contentType: "both",
    iconName: "Music",
    section: "lifestyle",
    subgenres: ["Sports Documentaries"],
  },
  // 29. Mystery
  {
    id: "mystery",
    name: "Mystery",
    slug: "mystery",
    description: "Whodunit puzzle boxes, enigmatic disappearances, locked-room riddles, and shocking twists.",
    contentType: "both",
    iconName: "Search",
    section: "popular",
    subgenres: ["Psychological Thrillers", "Crime Thrillers"],
  },
  // 30. Myths & Legends
  {
    id: "myths-legends",
    name: "Myths & Legends",
    slug: "myths-legends",
    description: "Olympian deities, mythical beasts, King Arthur's roundtable, and ancient epic folklore adventures.",
    contentType: "both",
    iconName: "Crown",
    section: "cultural",
    subgenres: ["Fantasy Adventures"],
  },
  // 31. Películas En Español
  {
    id: "peliculas-en-espanol",
    name: "Películas En Español",
    slug: "peliculas-en-espanol",
    description: "Lo mejor del cine en español: comedias, dramas intensos, acción y clásicos inolvidables de Iberoamérica.",
    contentType: "movies",
    iconName: "Film",
    section: "cultural",
    subgenres: ["Foreign-Language Movies", "Romantic Comedies"],
  },
  // 32. Reality TV
  {
    id: "reality-tv",
    name: "Reality TV",
    slug: "reality-tv",
    description: "Real-life relationship drama, competitive bake-offs, high-stakes game shows, and unscripted fireworks.",
    contentType: "series",
    iconName: "Tv2",
    section: "series",
    subgenres: ["Reality Competitions"],
  },
  // 33. Romance
  {
    id: "romance",
    name: "Romance",
    slug: "romance",
    description: "Sweep-you-off-your-feet love stories, serendipitous encounters, and deeply passionate bonds.",
    contentType: "both",
    iconName: "Heart",
    section: "popular",
    subgenres: ["Romantic Comedies", "Romantic Dramas"],
  },
  // 34. Sci-fi & Fantasy
  {
    id: "sci-fi-fantasy",
    name: "Sci-fi & Fantasy",
    slug: "sci-fi-fantasy",
    description: "Intergalactic starships, futuristic dystopias, enchanted kingdoms, and legendary sorcery.",
    contentType: "both",
    iconName: "Rocket",
    section: "popular",
    subgenres: ["Science Fiction", "Fantasy Adventures"],
  },
  // 35. Slashers
  {
    id: "slashers",
    name: "Slashers",
    slug: "slashers",
    description: "Classic slasher tropes: masked maniacs, haunted cabins, final survivors, and high-tension dread.",
    contentType: "movies",
    iconName: "Scissors",
    section: "movies",
    subgenres: ["Slasher Horror", "Psychological Thrillers"],
  },
  // 36. Sports Movies & Shows
  {
    id: "sports-movies-shows",
    name: "Sports Movies & Shows",
    slug: "sports-movies-shows",
    description: "Underdog championship miracles, locker room grit, boxing rivalries, and the ecstasy of victory.",
    contentType: "both",
    iconName: "Trophy",
    section: "lifestyle",
    subgenres: ["Sports Documentaries"],
  },
  // 37. Spy Movies
  {
    id: "spy-movies",
    name: "Spy Movies",
    slug: "spy-movies",
    description: "International intrigue, covert espionage gadgets, rogue agents, and globe-trotting undercover missions.",
    contentType: "movies",
    iconName: "Glasses",
    section: "movies",
    subgenres: ["Action Thrillers", "Crime Thrillers"],
  },
  // 38. Stand-Up Comedy
  {
    id: "stand-up-comedy",
    name: "Stand-Up Comedy",
    slug: "stand-up-comedy",
    description: "Spotlight on comedic masters, live comedy club sets, unfiltered observational humor, and hilarious roasts.",
    contentType: "both",
    iconName: "Mic",
    section: "lifestyle",
    subgenres: ["Action Comedies"],
  },
  // 39. Sword & Sorcery
  {
    id: "sword-sorcery",
    name: "Sword & Sorcery",
    slug: "sword-sorcery",
    description: "Barbaric warrior epics, dark necromancy, enchanted artifacts, and battle-tested medieval heroes.",
    contentType: "movies",
    iconName: "Shield",
    section: "movies",
    subgenres: ["Fantasy Adventures"],
  },
  // 40. Thrillers
  {
    id: "thrillers",
    name: "Thrillers",
    slug: "thrillers",
    description: "Nail-biting suspense, unexpected plot twists, conspiracy webs, and high-tension pacing from start to finish.",
    contentType: "both",
    iconName: "AlertTriangle",
    section: "popular",
    subgenres: ["Action Thrillers", "Psychological Thrillers", "Crime Thrillers"],
  },
  // 41. Travel
  {
    id: "travel",
    name: "Travel",
    slug: "travel",
    description: "Scenic world wanderlust, exotic expeditions, remote culture treks, and breathtaking globetrotting guides.",
    contentType: "both",
    iconName: "Compass",
    section: "lifestyle",
    subgenres: ["Nature Documentaries"],
  },
  // 42. TV Comedies
  {
    id: "tv-comedies",
    name: "TV Comedies",
    slug: "tv-comedies",
    description: "Comfort-food sitcoms, office mockumentaries, eccentric family ensembles, and easy-laugh comedy series.",
    contentType: "series",
    iconName: "Tv",
    section: "series",
    subgenres: ["Action Comedies", "Romantic Comedies"],
  },
  // 43. TV Dramas
  {
    id: "tv-dramas",
    name: "TV Dramas",
    slug: "tv-dramas",
    description: "Prestige episodic dramas, intense serialized character arcs, power struggles, and emotional family sagas.",
    contentType: "series",
    iconName: "Film",
    section: "series",
    subgenres: ["Historical Dramas", "Romantic Dramas"],
  },
  // 44. Westerns
  {
    id: "westerns",
    name: "Westerns",
    slug: "westerns",
    description: "Dusty saloons, quick-draw shootouts, rugged frontier lawmen, and legendary desert outlaws.",
    contentType: "both",
    iconName: "Compass",
    section: "movies",
    subgenres: ["Western Adventures"],
  },
];

export const SUBGENRES_LIST = [
  "Action Thrillers",
  "Action Comedies",
  "Martial Arts Action",
  "Romantic Comedies",
  "Romantic Dramas",
  "Crime Thrillers",
  "True Crime",
  "Psychological Thrillers",
  "Supernatural Horror",
  "Slasher Horror",
  "Historical Dramas",
  "Science Fiction",
  "Fantasy Adventures",
  "Animated Movies",
  "Animated Series",
  "Reality Competitions",
  "Nature Documentaries",
  "Sports Documentaries",
  "Western Adventures",
  "Foreign-Language Movies",
];

export const CATEGORY_SECTIONS = [
  { id: "all", label: "All Categories" },
  { id: "popular", label: "Most Popular" },
  { id: "movies", label: "Feature Films" },
  { id: "series", label: "TV & Shows" },
  { id: "cultural", label: "International & Culture" },
  { id: "lifestyle", label: "Lifestyle & Real Life" },
  { id: "family", label: "Kids & Family" },
];
