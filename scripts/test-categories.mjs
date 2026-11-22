import pg from "../node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js";

const c = new pg.Client({ connectionString: process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/familyflix" });
await c.connect();

// Fetch all public titles with their genres
const query = `
  SELECT m.id, m.slug, m.name, m.kind, m.synopsis, m.year, m.rating, m.score,
         COALESCE(array_agg(g.name) FILTER (WHERE g.name IS NOT NULL), '{}') as genres
  FROM movies m
  LEFT JOIN movie_genres mg ON m.id = mg.movie_id
  LEFT JOIN genres g ON mg.genre_id = g.id
  WHERE m.status = 'published'
  GROUP BY m.id, m.slug, m.name, m.kind, m.synopsis, m.year, m.rating, m.score
`;

console.log("Querying published titles...");
const res = await c.query(query);
console.log(`Loaded ${res.rows.length} published titles.`);

const titles = res.rows;

// Define category matchers
const CATEGORIES = [
  { id: "action", name: "Action", match: (t) => t.genres.includes("Action") },
  { id: "adult-animation", name: "Adult Animation", match: (t) => t.genres.includes("Animation") && (["R", "TV-MA", "NC-17", "18+"].includes(t.rating) || /adult|mature|parody|dark/i.test(t.synopsis)) },
  { id: "adult-comedy", name: "Adult Comedy", match: (t) => t.genres.includes("Comedy") && (["R", "TV-MA", "NC-17", "18+"].includes(t.rating) || /adult|raunchy|party|satire/i.test(t.synopsis)) },
  { id: "anime", name: "Anime", match: (t) => t.genres.includes("Animation") && /anime|manga|japan|tokyo|mecha|ninja|samurai/i.test(t.name + " " + t.synopsis) },
  { id: "arthouse-films", name: "Arthouse Films", match: (t) => (t.genres.includes("Drama") || t.genres.includes("Mystery")) && (t.score >= 68 || /cannes|festival|director|indie|experimental|critically/i.test(t.synopsis)) },
  { id: "based-on-true-events", name: "Based on True Events", match: (t) => t.genres.includes("Biography") || t.genres.includes("History") || /true story|true events|real life|biographical|inspired by/i.test(t.synopsis) },
  { id: "classics", name: "Classics", match: (t) => t.year && t.year <= 1980 },
  { id: "comedy", name: "Comedy", match: (t) => t.genres.includes("Comedy") },
  { id: "crime-tv", name: "Crime TV", match: (t) => t.kind === "series" && (t.genres.includes("Crime") || t.genres.includes("Mystery") || /detective|police|investigation/i.test(t.synopsis)) },
  { id: "documentary", name: "Documentary", match: (t) => t.genres.includes("Documentary") },
  { id: "docuseries", name: "Docuseries", match: (t) => t.kind === "series" && (t.genres.includes("Documentary") || /docuseries|documentary series/i.test(t.synopsis)) },
  { id: "drama", name: "Drama", match: (t) => t.genres.includes("Drama") },
  { id: "faith", name: "Faith", match: (t) => /faith|god|jesus|bible|church|pastor|gospel|christian|spiritual|miracle|prayer/i.test(t.name + " " + t.synopsis) },
  { id: "family-movies", name: "Family Movies", match: (t) => t.kind === "movie" && (t.genres.includes("Family") || t.genres.includes("Animation") || /family|children|kids/i.test(t.synopsis)) },
  { id: "family-series", name: "Family Series", match: (t) => t.kind === "series" && (t.genres.includes("Family") || t.genres.includes("Animation") || /family|kids|youth/i.test(t.synopsis)) },
  { id: "film-noir", name: "Film Noir", match: (t) => t.genres.includes("Film-Noir") || /film noir|noir|femme fatale|hardboiled|detective|private eye/i.test(t.synopsis) },
  { id: "foreign-films", name: "Foreign Films", match: (t) => t.kind === "movie" && /subtitled|foreign|french|spanish|german|italian|japanese|korean|chinese|russian|swedish|danish|mexican/i.test(t.synopsis) },
  { id: "foreign-tv", name: "Foreign TV", match: (t) => t.kind === "series" && /foreign|subtitled|british|uk|korean|japan|spanish|french|international/i.test(t.synopsis) },
  { id: "heist-films", name: "Heist Films", match: (t) => (t.genres.includes("Crime") || t.genres.includes("Action") || t.genres.includes("Thriller")) && /heist|robbery|bank robbery|caper|vault|safecracker|steal/i.test(t.synopsis) },
  { id: "home-garden", name: "Home & Garden", match: (t) => /home|house|garden|dream home|renovation|remodel|decorating|architecture|landscape/i.test(t.name + " " + t.synopsis) },
  { id: "horror", name: "Horror", match: (t) => t.genres.includes("Horror") },
  { id: "indie-films", name: "Indie Films", match: (t) => /indie|independent|sundance|tribeca|low-budget|filmmaker|auteur/i.test(t.synopsis) || (t.score >= 60 && t.genres.includes("Drama")) },
  { id: "italian-horror-giallo", name: "Italian Horror & Giallo", match: (t) => (t.genres.includes("Horror") || t.genres.includes("Mystery") || t.genres.includes("Thriller")) && /italian|italy|giallo|rome|milan|florence|dario/i.test(t.synopsis + " " + t.name) },
  { id: "killer-thrillers", name: "Killer Thrillers", match: (t) => (t.genres.includes("Thriller") || t.genres.includes("Crime") || t.genres.includes("Horror")) && /serial killer|killer|murderer|stalker|massacre|psychopath/i.test(t.synopsis) },
  { id: "lgbtqia", name: "LGBTQIA+", match: (t) => /lgbt|gay|lesbian|queer|transgender|homosexual|pride|cross-dressing/i.test(t.name + " " + t.synopsis) },
  { id: "lifestyle", name: "Lifestyle", match: (t) => t.genres.includes("Reality-TV") || /lifestyle|cooking|culinary|chef|travel|design|fashion|wellness/i.test(t.name + " " + t.synopsis) },
  { id: "martial-arts", name: "Martial Arts", match: (t) => (t.genres.includes("Action") || t.genres.includes("Adventure")) && /martial arts|kung fu|karate|ninja|samurai|judo|taekwondo|shaolin|fighter/i.test(t.synopsis) },
  { id: "music-concerts", name: "Music & Concerts", match: (t) => t.genres.includes("Music") || t.genres.includes("Musical") || /concert|orchestra|band|singer|rock|jazz|musician/i.test(t.synopsis) },
  { id: "mystery", name: "Mystery", match: (t) => t.genres.includes("Mystery") },
  { id: "myths-legends", name: "Myths & Legends", match: (t) => (t.genres.includes("Fantasy") || t.genres.includes("Adventure") || t.genres.includes("History")) && /myth|legend|gods|dragon|ancient|folklore|fable|atlantis|king arthur/i.test(t.synopsis) },
  { id: "peliculas-en-espanol", name: "Películas En Español", match: (t) => /español|spanish|mexico|colombia|argentina|latino|hispanic|madrid/i.test(t.name + " " + t.synopsis) },
  { id: "reality-tv", name: "Reality TV", match: (t) => t.genres.includes("Reality-TV") || t.genres.includes("Game-Show") || t.genres.includes("Talk-Show") },
  { id: "romance", name: "Romance", match: (t) => t.genres.includes("Romance") },
  { id: "sci-fi-fantasy", name: "Sci-fi & Fantasy", match: (t) => t.genres.includes("Sci-Fi") || t.genres.includes("Science fiction") || t.genres.includes("Fantasy") },
  { id: "slashers", name: "Slashers", match: (t) => t.genres.includes("Horror") && /slasher|chainsaw|machete|halloween|camp|massacre|axe|knife|mask/i.test(t.synopsis) },
  { id: "sports-movies-shows", name: "Sports Movies & Shows", match: (t) => t.genres.includes("Sport") || /football|basketball|baseball|soccer|boxing|olympics|racing|hockey|wrestling|coach/i.test(t.synopsis) },
  { id: "spy-movies", name: "Spy Movies", match: (t) => (t.genres.includes("Action") || t.genres.includes("Thriller")) && /spy|spies|cia|mi6|secret agent|espionage|cold war|kgb|undercover/i.test(t.synopsis) },
  { id: "stand-up-comedy", name: "Stand-Up Comedy", match: (t) => t.genres.includes("Comedy") && /stand-up|stand up|comedian|live on stage|special|routines/i.test(t.synopsis) },
  { id: "sword-sorcery", name: "Sword & Sorcery", match: (t) => (t.genres.includes("Fantasy") || t.genres.includes("Adventure")) && /sword|sorcery|wizard|witchcraft|sorcerer|magic|dungeon|kingdom|knights/i.test(t.synopsis) },
  { id: "thrillers", name: "Thrillers", match: (t) => t.genres.includes("Thriller") },
  { id: "travel", name: "Travel", match: (t) => /travel|journey|explore|expedition|safari|destination|globe|backpacking/i.test(t.name + " " + t.synopsis) },
  { id: "tv-comedies", name: "TV Comedies", match: (t) => t.kind === "series" && t.genres.includes("Comedy") },
  { id: "tv-dramas", name: "TV Dramas", match: (t) => t.kind === "series" && t.genres.includes("Drama") },
  { id: "westerns", name: "Westerns", match: (t) => t.genres.includes("Western") || /cowboy|sheriff|outlaw|frontier|gunslinger|saloon/i.test(t.synopsis) },
];

console.log("\n=== 44 MAIN CATEGORIES MATCH REPORT ===");
let totalMatched = 0;
for (const cat of CATEGORIES) {
  const matched = titles.filter(cat.match);
  const moviesCount = matched.filter(t => t.kind === "movie").length;
  const seriesCount = matched.filter(t => t.kind === "series").length;
  console.log(`[${cat.id}] ${cat.name}: Total = ${matched.length} (Movies: ${moviesCount}, Series: ${seriesCount})`);
  totalMatched += matched.length;
}

const SUBGENRES = [
  { id: "action-thrillers", name: "Action Thrillers", match: (t) => t.genres.includes("Action") && t.genres.includes("Thriller") },
  { id: "action-comedies", name: "Action Comedies", match: (t) => t.genres.includes("Action") && t.genres.includes("Comedy") },
  { id: "martial-arts-action", name: "Martial Arts Action", match: (t) => t.genres.includes("Action") && /martial arts|kung fu|karate|ninja|samurai|fighter/i.test(t.synopsis) },
  { id: "romantic-comedies", name: "Romantic Comedies", match: (t) => t.genres.includes("Romance") && t.genres.includes("Comedy") },
  { id: "romantic-dramas", name: "Romantic Dramas", match: (t) => t.genres.includes("Romance") && t.genres.includes("Drama") },
  { id: "crime-thrillers", name: "Crime Thrillers", match: (t) => t.genres.includes("Crime") && t.genres.includes("Thriller") },
  { id: "true-crime", name: "True Crime", match: (t) => (t.genres.includes("Crime") || t.genres.includes("Documentary")) && /true crime|murder investigation|serial killer|real life/i.test(t.synopsis) },
  { id: "psychological-thrillers", name: "Psychological Thrillers", match: (t) => t.genres.includes("Thriller") && /mind|psychological|paranoia|obsession|illusion|memory/i.test(t.synopsis) },
  { id: "supernatural-horror", name: "Supernatural Horror", match: (t) => t.genres.includes("Horror") && /ghost|demon|possession|haunted|spirit|curse|witch/i.test(t.synopsis) },
  { id: "slasher-horror", name: "Slasher Horror", match: (t) => t.genres.includes("Horror") && /slasher|chainsaw|machete|killer|massacre|stalker/i.test(t.synopsis) },
  { id: "historical-dramas", name: "Historical Dramas", match: (t) => t.genres.includes("Drama") && (t.genres.includes("History") || /century|historical|war|empire|period/i.test(t.synopsis)) },
  { id: "science-fiction", name: "Science Fiction", match: (t) => t.genres.includes("Sci-Fi") || t.genres.includes("Science fiction") },
  { id: "fantasy-adventures", name: "Fantasy Adventures", match: (t) => (t.genres.includes("Fantasy") || t.genres.includes("Adventure")) && /magic|quest|journey|kingdom|myth/i.test(t.synopsis) },
  { id: "animated-movies", name: "Animated Movies", match: (t) => t.kind === "movie" && t.genres.includes("Animation") },
  { id: "animated-series", name: "Animated Series", match: (t) => t.kind === "series" && t.genres.includes("Animation") },
  { id: "reality-competitions", name: "Reality Competitions", match: (t) => (t.genres.includes("Reality-TV") || t.genres.includes("Game-Show")) && /competition|compete|contest|winner|challenge/i.test(t.synopsis) },
  { id: "nature-documentaries", name: "Nature Documentaries", match: (t) => t.genres.includes("Documentary") && /nature|wildlife|planet|earth|ocean|animal|forest|species/i.test(t.synopsis) },
  { id: "sports-documentaries", name: "Sports Documentaries", match: (t) => t.genres.includes("Documentary") && (t.genres.includes("Sport") || /athlete|championship|olympic|football|boxing|soccer/i.test(t.synopsis)) },
  { id: "western-adventures", name: "Western Adventures", match: (t) => t.genres.includes("Western") && (t.genres.includes("Adventure") || /frontier|gold rush|trail|journey/i.test(t.synopsis)) },
  { id: "foreign-language-movies", name: "Foreign-Language Movies", match: (t) => t.kind === "movie" && /subtitled|foreign|french|spanish|german|italian|japanese|korean|chinese|russian|swedish/i.test(t.synopsis) },
];

console.log("\n=== 20 SUBGENRES MATCH REPORT ===");
for (const sub of SUBGENRES) {
  const matched = titles.filter(sub.match);
  console.log(`[${sub.id}] ${sub.name}: Total = ${matched.length}`);
}

await c.end();
