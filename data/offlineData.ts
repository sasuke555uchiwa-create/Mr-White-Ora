export const WORD_PAIRS: Record<string, Record<string, [string, string][]>> = {
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
  },
  de: {
    standard: [
      ["Apfel", "Orange"], ["Auto", "Bus"], ["Sonne", "Mond"], ["Meer", "Pool"], ["Katze", "Hund"],
      ["Telefon", "Computer"], ["Arzt", "Pfleger"], ["Tee", "Kaffee"], ["Fluss", "See"], ["Berg", "Hügel"],
      ["Flugzeug", "Hubschrauber"], ["Schwert", "Dolch"], ["Stift", "Pinsel"], ["Tür", "Fenster"], ["Buch", "Magazin"],
      ["Winter", "Sommer"], ["Schnee", "Regen"], ["Gold", "Silber"], ["Löwe", "Tiger"], ["Fahrrad", "Motorrad"],
      ["Brille", "Linsen"], ["Uhr", "Wecker"], ["Schule", "Universität"], ["Brot", "Kuchen"], ["Wasser", "Saft"],
      ["Rot", "Blau"], ["Himmel", "Erde"], ["Baum", "Blume"], ["Vogel", "Schmetterling"], ["Fisch", "Hai"],
      ["Schlüssel", "Schloss"], ["Tasche", "Brieftasche"], ["Schuh", "Socke"], ["Hemd", "Hose"], ["Hut", "Schal"],
      ["Schreibtisch", "Stuhl"], ["Bett", "Sofa"], ["Lampe", "Kerze"], ["Fernseher", "Radio"], ["Kamera", "Foto"],
      ["Löffel", "Gabel"], ["Teller", "Tasse"], ["Messer", "Schere"], ["Papier", "Notizbuch"], ["Gemälde", "Rahmen"],
      ["Park", "Wald"], ["Straße", "Weg"], ["Stadt", "Dorf"], ["Palast", "Schloss"], ["Zelt", "Hütte"]
    ],
    animals: [
      ["Katze", "Hund"], ["Wolf", "Fuchs"], ["Löwe", "Tiger"], ["Kamel", "Pferd"], ["Schaf", "Ziege"],
      ["Henne", "Hahn"], ["Krake", "Tintenfisch"], ["Schlange", "Eidechse"], ["Adler", "Falke"], ["Elefant", "Nashorn"],
      ["Giraffe", "Hirsch"], ["Maus", "Ratte"], ["Kuh", "Stier"], ["Biene", "Wespe"], ["Delfin", "Wal"],
      ["Pinguin", "Robbe"], ["Känguru", "Koala"], ["Krokodil", "Alligator"], ["Frosch", "Kröte"], ["Eule", "Fledermaus"]
    ],
    food: [
      ["Couscous", "Nudeln"], ["Minztee", "Kaffee"], ["Döner", "Burger"], ["Pizza", "Calzone"],
      ["Apfelkuchen", "Croissant"], ["Schokolade", "Vanille"], ["Steak", "Kebab"], ["Pfannkuchen", "Waffel"],
      ["Eis", "Milchshake"], ["Erdbeere", "Kirsche"], ["Honig", "Marmelade"], ["Käse", "Butter"],
      ["Pommes", "Chips"], ["Sushi", "Ramen"], ["Bratwurst", "Schnitzel"], ["Brezel", "Brötchen"]
    ],
    places: [
      ["Flughafen", "Bahnhof"], ["Krankenhaus", "Klinik"], ["Museum", "Bibliothek"], ["Restaurant", "Café"],
      ["Strand", "Insel"], ["Hotel", "Herberge"], ["Stadion", "Fitnessstudio"], ["Theater", "Kino"],
      ["Markt", "Einkaufszentrum"], ["Hafen", "Leuchtturm"], ["Wüste", "Oase"], ["Zoo", "Zirkus"],
      ["Bäckerei", "Konditorei"], ["Bank", "Post"], ["Bauernhof", "Wald"], ["Apotheke", "Labor"]
    ],
    objects: [
      ["Armbanduhr", "Wanduhr"], ["Taschenlampe", "Laterne"], ["Kompass", "Karte"], ["Sonnenbrille", "Brille"],
      ["Kamera", "Fernglas"], ["Koffer", "Rucksack"], ["Schlüssel", "Schlüsselkarte"], ["Regenschirm", "Regenmantel"],
      ["Kopfhörer", "Lautsprecher"], ["Ladegerät", "Powerbank"], ["Tastatur", "Maus"], ["Pfanne", "Topf"],
      ["Besen", "Mopp"], ["Zahnbürste", "Kamm"], ["Handtuch", "Bademantel"], ["Ticket", "Reisepass"]
    ]
  },
  tr: {
    standard: [
      ["Elma", "Portakal"], ["Araba", "Otobüs"], ["Güneş", "Ay"], ["Deniz", "Havuz"], ["Kedi", "Köpek"],
      ["Telefon", "Bilgisayar"], ["Doktor", "Hemşire"], ["Çay", "Kahve"], ["Nehir", "Göl"], ["Dağ", "Tepe"],
      ["Uçak", "Helikopter"], ["Kılıç", "Hançer"], ["Kalem", "Fırça"], ["Kapı", "Pencere"], ["Kitap", "Dergi"],
      ["Kış", "Yaz"], ["Kar", "Yağmur"], ["Altın", "Gümüş"], ["Aslan", "Kaplan"], ["Bisiklet", "Motosiklet"],
      ["Gözlük", "Lens"], ["Saat", "Çalar Saat"], ["Okul", "Üniversite"], ["Ekmek", "Pasta"], ["Su", "Meyve Suyu"],
      ["Kırmızı", "Mavi"], ["Gökyüzü", "Yeryüzü"], ["Ağaç", "Çiçek"], ["Kuş", "Kelebek"], ["Balık", "Köpekbalığı"],
      ["Anahtar", "Kilit"], ["Çanta", "Cüzdan"], ["Ayakkabı", "Çorap"], ["Gömlek", "Pantolon"], ["Şapka", "Atkı"],
      ["Masa", "Sandalye"], ["Yatak", "Kanepe"], ["Lamba", "Mum"], ["Televizyon", "Radyo"], ["Kamera", "Fotoğraf"],
      ["Kaşık", "Çatal"], ["Tabak", "Fincan"], ["Bıçak", "Makas"], ["Kağıt", "Defter"], ["Tablo", "Çerçeve"],
      ["Park", "Orman"], ["Cadde", "Yol"], ["Şehir", "Köy"], ["Saray", "Kale"], ["Çadır", "Kulübe"]
    ],
    animals: [
      ["Kedi", "Köpek"], ["Kurt", "Tilki"], ["Aslan", "Kaplan"], ["Deve", "At"], ["Koyun", "Keçi"],
      ["Tavuk", "Horoz"], ["Ahtapot", "Mürekkep Balığı"], ["Yılan", "Kertenkele"], ["Kartal", "Şahin"], ["Fil", "Gergedan"],
      ["Zürafa", "Geyik"], ["Fare", "Sıçan"], ["İnek", "Boğa"], ["Arı", "Eşek Arısı"], ["Yunus", "Balina"],
      ["Penguen", "Fok"], ["Kanguru", "Koala"], ["Timsah", "İguana"], ["Kurbağa", "Kaplumbağa"], ["Baykuş", "Yarasa"]
    ],
    food: [
      ["Kuskus", "Makarna"], ["Nane Çayı", "Kahve"], ["Döner", "Burger"], ["Pizza", "Calzone"],
      ["Elmalı Turta", "Kruvasan"], ["Çikolata", "Vanilya"], ["Bonfile", "Kebap"], ["Baklava", "Künefe"],
      ["Dondurma", "Milkshake"], ["Çilek", "Kiraz"], ["Bal", "Reçel"], ["Peynir", "Tereyağı"],
      ["Patates Kızartması", "Cips"], ["Suşi", "Ramen"], ["Lahmacun", "Pide"], ["Börek", "Simit"]
    ],
    places: [
      ["Havalimanı", "Tren İstasyonu"], ["Hastane", "Klinik"], ["Müze", "Kütüphane"], ["Restoran", "Kafe"],
      ["Plaj", "Ada"], ["Otel", "Pansiyon"], ["Stadyum", "Spor Salonu"], ["Tiyatro", "Sinema"],
      ["Pazar", "Alışveriş Merkezi"], ["Liman", "Deniz Feneri"], ["Çöl", "Vaha"], ["Hayvanat Bahçesi", "Sirk"],
      ["Fırın", "Pastane"], ["Banka", "Postane"], ["Çiftlik", "Orman"], ["Eczane", "Laboratuvar"]
    ],
    objects: [
      ["Kol Saati", "Duvar Saati"], ["El Feneri", "Fener"], ["Pusula", "Harita"], ["Güneş Gözlüğü", "Gözlük"],
      ["Kamera", "Dürbün"], ["Bavul", "Sırt Çantası"], ["Anahtar", "Kart"], ["Şemsiye", "Yağmurluk"],
      ["Kulaklık", "Hoparlör"], ["Şarj Aleti", "Powerbank"], ["Klavye", "Fare"], ["Tava", "Tencere"],
      ["Süpürge", "Paspas"], ["Diş Fırçası", "Tarak"], ["Havlu", "Bornoz"], ["Bilet", "Pasaport"]
    ]
  },
  pt: {
    standard: [
      ["Maçã", "Laranja"], ["Carro", "Ônibus"], ["Sol", "Lua"], ["Mar", "Piscina"], ["Gato", "Cachorro"],
      ["Telefone", "Computador"], ["Médico", "Enfermeiro"], ["Chá", "Café"], ["Rio", "Lago"], ["Montanha", "Colina"],
      ["Avião", "Helicóptero"], ["Espada", "Adaga"], ["Caneta", "Pincel"], ["Porta", "Janela"], ["Livro", "Revista"],
      ["Inverno", "Verão"], ["Neve", "Chuva"], ["Ouro", "Prata"], ["Leão", "Tigre"], ["Bicicleta", "Motocicleta"],
      ["Óculos", "Lentes"], ["Relógio", "Despertador"], ["Escola", "Universidade"], ["Pão", "Bolo"], ["Água", "Suco"],
      ["Vermelho", "Azul"], ["Céu", "Terra"], ["Árvore", "Flor"], ["Pássaro", "Borboleta"], ["Peixe", "Tubarão"],
      ["Chave", "Fechadura"], ["Bolsa", "Carteira"], ["Sapato", "Meia"], ["Camisa", "Calça"], ["Chapéu", "Cachecol"],
      ["Mesa", "Cadeira"], ["Cama", "Sofá"], ["Lâmpada", "Vela"], ["TV", "Rádio"], ["Câmera", "Foto"],
      ["Colher", "Garfo"], ["Prato", "Copo"], ["Faca", "Tesoura"], ["Papel", "Caderno"], ["Pintura", "Moldura"],
      ["Parque", "Floresta"], ["Rua", "Estrada"], ["Cidade", "Vila"], ["Palácio", "Castelo"], ["Tenda", "Cabana"]
    ],
    animals: [
      ["Gato", "Cachorro"], ["Lobo", "Raposa"], ["Leão", "Tigre"], ["Camelo", "Cavalo"], ["Ovelha", "Cabra"],
      ["Galinha", "Galo"], ["Polvo", "Lula"], ["Cobra", "Lagarto"], ["Águia", "Falcão"], ["Elefante", "Rinoceronte"],
      ["Girafa", "Veado"], ["Rato", "Ratazana"], ["Vaca", "Touro"], ["Abelha", "Vespa"], ["Golfinho", "Baleia"],
      ["Pinguim", "Foca"], ["Canguru", "Coala"], ["Crocodilo", "Jacaré"], ["Sapo", "Rã"], ["Coruja", "Morcego"]
    ],
    food: [
      ["Cuscuz", "Massa"], ["Chá de Hortelã", "Café"], ["Shawarma", "Hambúrguer"], ["Pizza", "Calzone"],
      ["Torta de Maçã", "Croissant"], ["Chocolate", "Baunilha"], ["Bife", "Kebab"], ["Panqueca", "Waffle"],
      ["Sorvete", "Milkshake"], ["Morango", "Cereja"], ["Mel", "Geleia"], ["Queijo", "Manteiga"],
      ["Batata Frita", "Salgadinho"], ["Sushi", "Ramen"], ["Pastel", "Coxinha"], ["Lasanha", "Nhoque"]
    ],
    places: [
      ["Aeroporto", "Estação"], ["Hospital", "Clínica"], ["Museu", "Biblioteca"], ["Restaurante", "Café"],
      ["Praia", "Ilha"], ["Hotel", "Pousada"], ["Estádio", "Academia"], ["Teatro", "Cinema"],
      ["Mercado", "Shopping"], ["Porto", "Farol"], ["Deserto", "Oásis"], ["Zoológico", "Circo"],
      ["Padaria", "Confeitaria"], ["Banco", "Correios"], ["Fazenda", "Floresta"], ["Farmácia", "Laboratório"]
    ],
    objects: [
      ["Relógio", "Despertador"], ["Lanterna", "Lampião"], ["Bússola", "Mapa"], ["Óculos de sol", "Óculos"],
      ["Câmera", "Binóculos"], ["Mala", "Mochila"], ["Chave", "Cartão"], ["Guarda-chuva", "Capa de chuva"],
      ["Fones", "Caixa de som"], ["Carregador", "Bateria"], ["Teclado", "Mouse"], ["Frigideira", "Panela"],
      ["Vassoura", "Esfregão"], ["Escova", "Pente"], ["Toalha", "Roupão"], ["Ingresso", "Passaporte"]
    ]
  }
};

