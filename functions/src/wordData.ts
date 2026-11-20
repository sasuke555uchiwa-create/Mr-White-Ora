export type WordPairTuple = [string, string];

export const WORD_PAIRS: Record<string, Record<string, WordPairTuple[]>> = {
  ar: {
    standard: [
      ["تفاحة", "برتقالة"], ["سيارة", "حافلة"], ["شمس", "قمر"], ["بحر", "مسبح"], ["قطة", "كلب"],
      ["هاتف", "حاسوب"], ["طبيب", "ممرض"], ["شاي", "قهوة"], ["نهر", "بحيرة"], ["جبل", "تل"],
      ["طائرة", "مروحية"], ["سيف", "خنجر"], ["قلم", "فرشاة"], ["باب", "نافذة"], ["كتاب", "مجلة"],
      ["شتاء", "صيف"], ["ثلج", "مطر"], ["ذهب", "فضة"], ["أسد", "نمر"], ["دراجة", "دراجة نارية"],
      ["نظارات", "عدسات"], ["ساعة", "منبه"], ["مدرسة", "جامعة"], ["خبز", "كعك"], ["ماء", "عصير"],
      ["أحمر", "أزرق"], ["سماء", "أرض"], ["شجرة", "زهرة"], ["طائر", "فراشة"], ["سمكة", "قرش"],
      ["مفتاح", "قفل"], ["حقيبة", "محفظة"], ["حذاء", "جورب"], ["قميص", "سروال"], ["قبعة", "وشاح"],
      ["مكتب", "كرسي"], ["سرير", "أريكة"], ["مصباح", "شمعة"], ["تلفاز", "مذياع"], ["كاميرا", "صورة"],
      ["ملعقة", "شوكة"], ["صحن", "كوب"], ["سكين", "مقص"], ["ورقة", "دفتر"], ["لوحة", "إطار"],
      ["حديقة", "غابة"], ["شارع", "طريق"], ["مدينة", "قرية"], ["قصر", "قلعة"], ["خيمة", "كوخ"],
      ["قطار", "مترو"], ["سفينة", "قارب"], ["جسر", "نفق"], ["بركان", "زلزال"], ["صحراء", "شاطئ"],
      ["مغني", "عازف"], ["ممثل", "مخرج"], ["رسام", "نحات"], ["طباخ", "خباز"], ["شرطي", "محقق"]
    ],
    animals: [
      ["قطوس", "كلب"], ["علوش", "بركوس"], ["حنش", "وزغة"], ["جربوع", "قنفذ"], ["فار", "سنجاب"],
      ["بغل", "حمار"], ["جمل", "حصان"], ["أسد", "فهد"], ["ذئب", "ثعلب"], ["حمامة", "عصفور"],
      ["ديك", "دجاجة"], ["سمكة", "قرش"], ["أخطبوط", "حبار"], ["دلفين", "حوت"], ["عقاب", "صقر"],
      ["ذبابة", "بعوضة"], ["فيل", "وحيد القرن"], ["زرافة", "غزالة"], ["نمر", "ضبع"], ["سلحفاة", "حلزون"],
      ["بطريق", "فقمة"], ["كنغر", "كوالا"], ["تمساح", "سحلية"], ["ضفدع", "علجوم"], ["نحلة", "دبور"],
      ["طاووس", "فلامنغو"], ["ببغاء", "كناري"], ["بومة", "خفاش"], ["دب", "باندا"], ["بقرة", "ثور"]
    ],
    food: [
      ["كسكسي بالعلوش", "كسكسي بالحوت"], ["بريك بالتن", "بريك بالدجاج"], ["سلاطة مشوية", "تسطيرة"],
      ["كفتاجي", "لبلابي"], ["فريكاسي", "بمبالوني"], ["ملاوي", "طابونة"], ["مقروض", "كعك ورقة"],
      ["بقلاوة", "غريبة"], ["شاورما", "برغر"], ["بيتزا", "كالزوني"], ["معكرونة", "لازانيا"],
      ["كبسة", "مندي"], ["طاجين", "أومليت"], ["فلافل", "حمص"], ["تاي بالنعناع", "قهوة عربي"],
      ["كريب", "بان كيك"], ["دونات", "كرواسون"], ["بوظة", "ميلك شيك"], ["فراولة", "كرز"],
      ["موز", "أناناس"], ["بطيخ", "شمام"], ["شوكولاتة", "فانيليا"], ["عسل", "مربى"],
      ["جبن", "زبدة"], ["سمك مشوي", "جمبري"], ["سوشي", "رامن"], ["عدس", "فاصوليا"], ["بطاطا مقلية", "رقائق"]
    ],
    places: [
      ["مطار", "محطة قطار"], ["مستشفى", "عيادة"], ["متحف", "مكتبة"], ["مطعم", "مقهى"],
      ["شاطئ", "جزيرة"], ["فندق", "منتجع"], ["ملعب", "صالة رياضية"], ["مسرح", "سينما"],
      ["سوق شعبي", "مركز تجاري"], ["مرفأ", "منارة"], ["صحراء", "واحة"], ["مدرسة", "معهد"],
      ["حديقة حيوان", "سيرك"], ["مخبز", "محل حلويات"], ["بنك", "مكتب بريد"], ["مزرعة", "غابة"],
      ["محطة وقود", "مرآب"], ["برج", "ناطحة سحاب"], ["شلال", "نهر"], ["كهف", "وادي"],
      ["صيدلية", "مختبر"], ["جامعة", "كلية"], ["محكمة", "مركز شرطة"], ["سفينة سياحية", "ميناء"]
    ],
    objects: [
      ["ساعة يد", "ساعة حائط"], ["مصباح يدوي", "فانوس"], ["بوصلة", "خريطة"], ["نظارة شمسية", "نظارة طبية"],
      ["كاميرا", "منظار"], ["حقيبة سفر", "حقيبة ظهر"], ["مفتاح", "بطاقة دخول"], ["قلم حبر", "قلم رصاص"],
      ["مظلة", "معطف مطر"], ["مرآة", "زجاج"], ["مقص", "سكين"], ["وسادة", "بطانية"],
      ["سماعات", "مكبر صوت"], ["شاحن", "بطارية متنقلة"], ["لوحة مفاتيح", "فأرة حاسوب"], ["مقلاة", "قدر طبخ"],
      ["مكنسة", "ممسحة"], ["فرشاة أسنان", "مشط شعر"], ["منشفة", "رداء حمام"], ["جرس", "صافرة"],
      ["مغناطيس", "بطارية"], ["حبل", "سلسلة"], ["صندوق", "خزنة"], ["تذكرة", "جواز سفر"]
    ]
  },
  en: {
    standard: [
      ["Apple", "Orange"], ["Car", "Bus"], ["Sun", "Moon"], ["Sea", "Pool"], ["Cat", "Dog"],
      ["Phone", "Computer"], ["Doctor", "Nurse"], ["Tea", "Coffee"], ["River", "Lake"], ["Mountain", "Hill"],
      ["Airplane", "Helicopter"], ["Sword", "Dagger"], ["Pen", "Brush"], ["Door", "Window"], ["Book", "Magazine"],
      ["Winter", "Summer"], ["Snow", "Rain"], ["Gold", "Silver"], ["Lion", "Tiger"], ["Bicycle", "Motorcycle"],
      ["Glasses", "Contacts"], ["Watch", "Clock"], ["School", "University"], ["Bread", "Cake"], ["Water", "Juice"],
      ["Red", "Blue"], ["Sky", "Earth"], ["Tree", "Flower"], ["Bird", "Butterfly"], ["Fish", "Shark"],
      ["Key", "Lock"], ["Bag", "Wallet"], ["Shoe", "Sock"], ["Shirt", "Pants"], ["Hat", "Scarf"],
      ["Desk", "Chair"], ["Bed", "Sofa"], ["Lamp", "Candle"], ["TV", "Radio"], ["Camera", "Photo"],
      ["Spoon", "Fork"], ["Plate", "Cup"], ["Knife", "Scissors"], ["Paper", "Notebook"], ["Painting", "Frame"],
      ["Park", "Forest"], ["Street", "Road"], ["City", "Village"], ["Palace", "Castle"], ["Tent", "Hut"],
      ["Train", "Subway"], ["Ship", "Boat"], ["Bridge", "Tunnel"], ["Volcano", "Earthquake"], ["Chef", "Baker"]
    ],
    animals: [
      ["Cat", "Dog"], ["Wolf", "Fox"], ["Lion", "Tiger"], ["Camel", "Horse"], ["Sheep", "Goat"],
      ["Hen", "Rooster"], ["Octopus", "Squid"], ["Snake", "Lizard"], ["Eagle", "Hawk"], ["Elephant", "Rhino"],
      ["Giraffe", "Deer"], ["Mouse", "Rat"], ["Cow", "Bull"], ["Bee", "Wasp"], ["Dolphin", "Whale"],
      ["Penguin", "Seal"], ["Kangaroo", "Koala"], ["Crocodile", "Alligator"], ["Frog", "Toad"], ["Peacock", "Flamingo"],
      ["Parrot", "Canary"], ["Owl", "Bat"], ["Bear", "Panda"], ["Turtle", "Snail"], ["Cheetah", "Leopard"]
    ],
    food: [
      ["Couscous", "Pasta"], ["Brik", "Samosa"], ["Mint Tea", "Coffee"], ["Shawarma", "Burger"],
      ["Pizza", "Calzone"], ["Baklava", "Donut"], ["Kafteji", "Omelette"], ["Tajine", "Quiche"],
      ["Apple Pie", "Croissant"], ["Chocolate", "Vanilla"], ["Sushi", "Sashimi"], ["Steak", "Kebab"],
      ["Pancake", "Waffle"], ["Ice Cream", "Milkshake"], ["Strawberry", "Cherry"], ["Watermelon", "Melon"],
      ["Honey", "Jam"], ["Cheese", "Butter"], ["Fries", "Chips"], ["Falafel", "Hummus"], ["Ramen", "Noodles"]
    ],
    places: [
      ["Airport", "Train Station"], ["Hospital", "Clinic"], ["Museum", "Library"], ["Restaurant", "Cafe"],
      ["Beach", "Island"], ["Hotel", "Hostel"], ["Stadium", "Gym"], ["Theater", "Cinema"],
      ["Market", "Mall"], ["Harbor", "Lighthouse"], ["Desert", "Oasis"], ["School", "College"],
      ["Zoo", "Circus"], ["Bakery", "Pastry Shop"], ["Bank", "Post Office"], ["Farm", "Forest"],
      ["Waterfall", "River"], ["Cave", "Canyon"], ["Pharmacy", "Lab"], ["Courthouse", "Police Station"]
    ],
    objects: [
      ["Wristwatch", "Wall Clock"], ["Flashlight", "Lantern"], ["Compass", "Map"], ["Sunglasses", "Reading Glasses"],
      ["Camera", "Binoculars"], ["Suitcase", "Backpack"], ["Key", "Keycard"], ["Fountain Pen", "Pencil"],
      ["Umbrella", "Raincoat"], ["Mirror", "Window"], ["Scissors", "Knife"], ["Pillow", "Blanket"],
      ["Headphones", "Speaker"], ["Charger", "Power Bank"], ["Keyboard", "Mouse"], ["Frying Pan", "Saucepan"],
      ["Broom", "Mop"], ["Toothbrush", "Hairbrush"], ["Towel", "Bathrobe"], ["Ticket", "Passport"]
    ]
  },
  fr: {
    standard: [
      ["Pomme", "Orange"], ["Voiture", "Bus"], ["Soleil", "Lune"], ["Mer", "Piscine"], ["Chat", "Chien"],
      ["Téléphone", "Ordinateur"], ["Médecin", "Infirmier"], ["Thé", "Café"], ["Rivière", "Lac"], ["Montagne", "Colline"],
      ["Avion", "Hélicoptère"], ["Épée", "Poignard"], ["Stylo", "Pinceau"], ["Porte", "Fenêtre"], ["Livre", "Magazine"],
      ["Hiver", "Été"], ["Neige", "Pluie"], ["Or", "Argent"], ["Lion", "Tigre"], ["Vélo", "Moto"],
      ["Lunettes", "Lentilles"], ["Montre", "Horloge"], ["École", "Université"], ["Pain", "Gâteau"], ["Eau", "Jus"],
      ["Rouge", "Bleu"], ["Ciel", "Terre"], ["Arbre", "Fleur"], ["Oiseau", "Papillon"], ["Poisson", "Requin"],
      ["Clé", "Serrure"], ["Sac", "Portefeuille"], ["Chaussure", "Chaussette"], ["Chemise", "Pantalon"], ["Chapeau", "Écharpe"],
      ["Bureau", "Chaise"], ["Lit", "Canapé"], ["Lampe", "Bougie"], ["Télévision", "Radio"], ["Caméra", "Photo"],
      ["Cuillère", "Fourchette"], ["Assiette", "Tasse"], ["Couteau", "Ciseaux"], ["Papier", "Cahier"], ["Peinture", "Cadre"],
      ["Parc", "Forêt"], ["Rue", "Route"], ["Ville", "Village"], ["Palais", "Château"], ["Tente", "Cabane"],
      ["Train", "Métro"], ["Bateau", "Navire"], ["Pont", "Tunnel"], ["Volcan", "Séisme"], ["Chef", "Boulanger"]
    ],
    animals: [
      ["Chat", "Chien"], ["Loup", "Renard"], ["Lion", "Tigre"], ["Chameau", "Cheval"], ["Mouton", "Chèvre"],
      ["Poule", "Coq"], ["Poulpe", "Calamar"], ["Serpent", "Lézard"], ["Aigle", "Faucon"], ["Éléphant", "Rhinocéros"],
      ["Girafe", "Gazelle"], ["Souris", "Rat"], ["Vache", "Taureau"], ["Abeille", "Guêpe"], ["Dauphin", "Baleine"],
      ["Pingouin", "Phoque"], ["Kangourou", "Koala"], ["Crocodile", "Alligator"], ["Grenouille", "Crapaud"], ["Hibou", "Chauve-souris"]
    ],
    food: [
      ["Couscous", "Pâtes"], ["Brik", "Samoussa"], ["Thé à la menthe", "Café"], ["Chawarma", "Burger"],
      ["Pizza", "Calzone"], ["Baklava", "Beignet"], ["Kafteji", "Omelette"], ["Tajine", "Quiche"],
      ["Tarte", "Croissant"], ["Chocolat", "Vanille"], ["Sushi", "Sashimi"], ["Steak", "Kebab"],
      ["Crêpe", "Gaufre"], ["Glace", "Milkshake"], ["Fraise", "Cerise"], ["Miel", "Confiture"],
      ["Fromage", "Beurre"], ["Frites", "Chips"], ["Falafel", "Houmous"], ["Lasagne", "Ravioli"]
    ],
    places: [
      ["Aéroport", "Gare"], ["Hôpital", "Clinique"], ["Musée", "Bibliothèque"], ["Restaurant", "Café"],
      ["Plage", "Île"], ["Hôtel", "Auberge"], ["Stade", "Salle de sport"], ["Théâtre", "Cinéma"],
      ["Marché", "Centre commercial"], ["Port", "Phare"], ["Désert", "Oasis"], ["École", "Lycée"],
      ["Zoo", "Cirque"], ["Boulangerie", "Pâtisserie"], ["Banque", "Poste"], ["Ferme", "Forêt"],
      ["Cascade", "Rivière"], ["Grotte", "Canyon"], ["Pharmacie", "Laboratoire"], ["Tribunal", "Commissariat"]
    ],
    objects: [
      ["Montre", "Horloge"], ["Lampe torche", "Lanterne"], ["Boussole", "Carte"], ["Lunettes de soleil", "Lunettes de vue"],
      ["Appareil photo", "Jumelles"], ["Valise", "Sac à dos"], ["Clé", "Badge"], ["Stylo plume", "Crayon"],
      ["Parapluie", "Imperméable"], ["Miroir", "Vitre"], ["Ciseaux", "Couteau"], ["Oreiller", "Couverture"],
      ["Casque audio", "Enceinte"], ["Chargeur", "Batterie"], ["Clavier", "Souris"], ["Poêle", "Casserole"],
      ["Balai", "Serpillière"], ["Brosse à dents", "Peigne"], ["Serviette", "Peignoir"], ["Billet", "Passeport"]
    ]
  },
  es: {
    standard: [
      ["Manzana", "Naranja"], ["Coche", "Autobús"], ["Sol", "Luna"], ["Mar", "Piscina"], ["Gato", "Perro"],
      ["Teléfono", "Ordenador"], ["Doctor", "Enfermero"], ["Té", "Café"], ["Río", "Lago"], ["Montaña", "Colina"],
      ["Avión", "Helicóptero"], ["Espada", "Daga"], ["Pluma", "Pincel"], ["Puerta", "Ventana"], ["Libro", "Revista"],
      ["Invierno", "Verano"], ["Nieve", "Lluvia"], ["Oro", "Plata"], ["León", "Tigre"], ["Bicicleta", "Motocicleta"],
      ["Gafas", "Lentes"], ["Reloj", "Cronómetro"], ["Escuela", "Universidad"], ["Pan", "Pastel"], ["Agua", "Zumo"],
      ["Rojo", "Azul"], ["Cielo", "Tierra"], ["Árbol", "Flor"], ["Pájaro", "Mariposa"], ["Pez", "Tiburón"],
      ["Llave", "Cerradura"], ["Bolsa", "Cartera"], ["Zapato", "Calcetín"], ["Camisa", "Pantalón"], ["Sombrero", "Bufanda"],
      ["Escritorio", "Silla"], ["Cama", "Sofá"], ["Lámpara", "Vela"], ["TV", "Radio"], ["Cámara", "Foto"],
      ["Cuchara", "Tenedor"], ["Plato", "Taza"], ["Cuchillo", "Tijeras"], ["Papel", "Cuaderno"], ["Cuadro", "Marco"],
      ["Parque", "Bosque"], ["Calle", "Carretera"], ["Ciudad", "Pueblo"], ["Palacio", "Castillo"], ["Tienda", "Cabaña"]
    ],
    animals: [
      ["Gato", "Perro"], ["Lobo", "Zorro"], ["León", "Tigre"], ["Camello", "Caballo"], ["Oveja", "Cabra"],
      ["Gallina", "Gallo"], ["Pulpo", "Calamar"], ["Serpiente", "Lagarto"], ["Águila", "Halcón"], ["Elefante", "Rinoceronte"],
      ["Jirafa", "Ciervo"], ["Ratón", "Rata"], ["Vaca", "Toro"], ["Abeja", "Avispa"], ["Delfín", "Ballena"],
      ["Pingüino", "Foca"], ["Canguro", "Koala"], ["Cocodrilo", "Caimán"], ["Rana", "Sapo"], ["Búho", "Murciélago"]
    ],
    food: [
      ["Cuscús", "Pasta"], ["Té de menta", "Café"], ["Shawarma", "Hamburguesa"], ["Pizza", "Calzone"],
      ["Tarta de manzana", "Cruasán"], ["Chocolate", "Vainilla"], ["Filete", "Kebab"], ["Panqueque", "Gofre"],
      ["Helado", "Batido"], ["Fresa", "Cereza"], ["Miel", "Mermelada"], ["Queso", "Mantequilla"],
      ["Papas fritas", "Nachos"], ["Sushi", "Ramen"], ["Paella", "Risotto"], ["Empanada", "Taco"]
    ],
    places: [
      ["Aeropuerto", "Estación"], ["Hospital", "Clínica"], ["Museo", "Biblioteca"], ["Restaurante", "Cafetería"],
      ["Playa", "Isla"], ["Hotel", "Hostal"], ["Estadio", "Gimnasio"], ["Teatro", "Cine"],
      ["Mercado", "Centro comercial"], ["Puerto", "Faro"], ["Desierto", "Oasis"], ["Zoológico", "Circo"],
      ["Panadería", "Pastelería"], ["Banco", "Correos"], ["Granja", "Bosque"], ["Farmacia", "Laboratorio"]
    ],
    objects: [
      ["Reloj", "Despertador"], ["Linterna", "Farol"], ["Brújula", "Mapa"], ["Gafas de sol", "Gafas"],
      ["Cámara", "Binoculares"], ["Maleta", "Mochila"], ["Llave", "Tarjeta"], ["Paraguas", "Impermeable"],
      ["Auriculares", "Altavoz"], ["Cargador", "Batería"], ["Teclado", "Ratón"], ["Sartén", "Olla"],
      ["Escoba", "Fregona"], ["Cepillo", "Peine"], ["Toalla", "Bata"], ["Billete", "Pasaporte"]
    ]
  }
};

export function normalizeGuessWord(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/^ال/, '')
    .replace(/\s+/g, ' ');
}

export function isMrWhiteGuessMatch(guess: string, secretWord: string): boolean {
  const trimmedGuess = String(guess || '').trim();
  const trimmedSecret = String(secretWord || '').trim();
  if (!trimmedGuess || !trimmedSecret) return false;
  if (trimmedGuess.toLowerCase() === trimmedSecret.toLowerCase()) return true;
  const normGuess = normalizeGuessWord(trimmedGuess);
  const normSecret = normalizeGuessWord(trimmedSecret);
  return normGuess.length > 0 && normGuess === normSecret;
}

export function pickServerWordPair(language: string, category: string): {
  civilianWord: string;
  undercoverWord: string;
  decoys: string[];
} {
  const langPairs = WORD_PAIRS[language] || WORD_PAIRS['ar'];
  const pairs = langPairs[category] || langPairs['standard'];
  const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
  const swap = Math.random() > 0.5;
  const civilianWord = swap ? randomPair[1] : randomPair[0];
  const undercoverWord = swap ? randomPair[0] : randomPair[1];
  const decoys = pairs
    .flat()
    .filter((w) => w !== civilianWord && w !== undercoverWord)
    .sort(() => 0.5 - Math.random())
    .slice(0, 9);

  return { civilianWord, undercoverWord, decoys };
}
