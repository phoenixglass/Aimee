const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── USERS ──────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const salesHash = await bcrypt.hash('sales123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@aimee.com' },
    update: {},
    create: { email: 'admin@aimee.com', passwordHash: adminHash, firstName: 'Admin', lastName: 'User', role: 'admin' },
  });

  const salesperson1 = await prisma.user.upsert({
    where: { email: 'marco@aimee.com' },
    update: {},
    create: { email: 'marco@aimee.com', passwordHash: salesHash, firstName: 'Marco', lastName: 'Ricci', phone: '555-0101', role: 'salesperson' },
  });

  const salesperson2 = await prisma.user.upsert({
    where: { email: 'sophie@aimee.com' },
    update: {},
    create: { email: 'sophie@aimee.com', passwordHash: salesHash, firstName: 'Sophie', lastName: 'Dubois', phone: '555-0102', role: 'salesperson' },
  });

  // ─── REGIONS ────────────────────────────────────────────
  const regions = await Promise.all([
    prisma.region.create({ data: {
      name: 'Bordeaux', country: 'France', languageOrigin: 'fr',
      phoneticIpa: '/bɔʁˈdo/', phoneticSimple: 'bor-DOH',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="bɔːrˈdoʊ">Bordeaux</phoneme>',
      alternateHearings: JSON.stringify(['bordo', 'bore dough', 'bore doe', 'bor doh']),
    }}),
    prisma.region.create({ data: {
      name: 'Bourgogne', country: 'France', languageOrigin: 'fr',
      phoneticIpa: '/buʁˈɡɔɲ/', phoneticSimple: 'boor-GON-yuh',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="bʊrˈɡɒnjə">Bourgogne</phoneme>',
      alternateHearings: JSON.stringify(['burgundy', 'boor gone yuh', 'bourgone', 'borgone', 'bor gonya']),
    }}),
    prisma.region.create({ data: {
      name: 'Champagne', country: 'France', languageOrigin: 'fr',
      phoneticIpa: '/ʃɑ̃ˈpaɲ/', phoneticSimple: 'sham-PAN-yuh',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="ʃæmˈpeɪn">Champagne</phoneme>',
      alternateHearings: JSON.stringify(['shampane', 'sham pain', 'champain']),
    }}),
    prisma.region.create({ data: {
      name: 'Toscana', country: 'Italy', languageOrigin: 'it',
      phoneticIpa: '/tosˈkaːna/', phoneticSimple: 'tohs-KAH-nah',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="tɒsˈkɑːnə">Toscana</phoneme>',
      alternateHearings: JSON.stringify(['tuscany', 'toscana', 'tos kana', 'toskana']),
    }}),
    prisma.region.create({ data: {
      name: 'Piemonte', country: 'Italy', languageOrigin: 'it',
      phoneticIpa: '/pjeˈmonte/', phoneticSimple: 'pyeh-MON-teh',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="piːəˈmɒnteɪ">Piemonte</phoneme>',
      alternateHearings: JSON.stringify(['piedmont', 'pee a montay', 'piamonte', 'pee ah mon tay']),
    }}),
    prisma.region.create({ data: {
      name: 'Rioja', country: 'Spain', languageOrigin: 'es',
      phoneticIpa: '/riˈoxa/', phoneticSimple: 'ree-OH-hah',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="riːˈoʊhɑː">Rioja</phoneme>',
      alternateHearings: JSON.stringify(['ree oh ha', 'ree oha', 'rio ha', 'rioja']),
    }}),
    prisma.region.create({ data: {
      name: 'Mosel', country: 'Germany', languageOrigin: 'de',
      phoneticIpa: '/ˈmoːzl̩/', phoneticSimple: 'MOH-zul',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="ˈmoʊzəl">Mosel</phoneme>',
      alternateHearings: JSON.stringify(['moselle', 'mosel', 'mo zul', 'mozelle']),
    }}),
    prisma.region.create({ data: {
      name: 'Châteauneuf-du-Pape', country: 'France', languageOrigin: 'fr',
      phoneticIpa: '/ʃɑtonœf dy pap/', phoneticSimple: 'shah-toh-NUFF doo PAHP',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="ʃætoʊˈnʌf duː pɑːp">Châteauneuf-du-Pape</phoneme>',
      alternateHearings: JSON.stringify(['chateau neuf du pop', 'shato nuf du pap', 'chateau neuf du pape', 'shot o nuff do pop', 'chateauneuf du pape']),
    }}),
    prisma.region.create({ data: {
      name: 'Willamette Valley', country: 'United States', languageOrigin: 'en',
      phoneticIpa: '/wɪˈlæmɪt/', phoneticSimple: 'wih-LAM-it',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="wɪˈlæmɪt">Willamette</phoneme> Valley',
      alternateHearings: JSON.stringify(['will a met', 'willamette', 'will am it', 'will a met valley']),
    }}),
    prisma.region.create({ data: {
      name: 'Napa Valley', country: 'United States', languageOrigin: 'en',
      phoneticSimple: 'NAH-puh', alternateHearings: JSON.stringify(['napa', 'nappa']),
    }}),
  ]);

  // ─── GRAPE VARIETIES ────────────────────────────────────
  const grapes = await Promise.all([
    prisma.grapeVariety.create({ data: {
      name: 'Pinot Noir', languageOrigin: 'fr',
      phoneticIpa: '/pino nwaʁ/', phoneticSimple: 'PEE-noh NWAHR',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="piːnoʊ nwɑːr">Pinot Noir</phoneme>',
      alternateHearings: JSON.stringify(['pee no nwar', 'peanut noir', 'pee no noir', 'pinot nwar', 'pinno noir']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Cabernet Sauvignon', languageOrigin: 'fr',
      phoneticIpa: '/kabɛʁnɛ soviɲɔ̃/', phoneticSimple: 'kab-er-NAY soh-veen-YOHN',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="kæbərˈneɪ soʊvɪnˈjoʊn">Cabernet Sauvignon</phoneme>',
      alternateHearings: JSON.stringify(['cab er nay so vin yon', 'cabernet so vin yon', 'cab sav', 'cabernet sauvignon']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Chardonnay', languageOrigin: 'fr',
      phoneticIpa: '/ʃaʁdɔnɛ/', phoneticSimple: 'shar-doh-NAY',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="ʃɑːrdəˈneɪ">Chardonnay</phoneme>',
      alternateHearings: JSON.stringify(['shar doh nay', 'shar done ay', 'chardon ay', 'char doe nay']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Syrah', languageOrigin: 'fr',
      phoneticIpa: '/siʁa/', phoneticSimple: 'sih-RAH',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="sɪˈrɑː">Syrah</phoneme>',
      alternateHearings: JSON.stringify(['see rah', 'shiraz', 'sih ra', 'syra', 'si rah']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Sangiovese', languageOrigin: 'it',
      phoneticIpa: '/sandʒoˈveːze/', phoneticSimple: 'san-joh-VAY-zeh',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="sændʒioʊˈveɪzeɪ">Sangiovese</phoneme>',
      alternateHearings: JSON.stringify(['san joe vay zay', 'sangio vay zay', 'san geo vay see', 'sandjo vay zeh']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Nebbiolo', languageOrigin: 'it',
      phoneticIpa: '/nebˈbjɔːlo/', phoneticSimple: 'neb-bee-OH-loh',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="nɛbˈbioʊloʊ">Nebbiolo</phoneme>',
      alternateHearings: JSON.stringify(['neb ee oh lo', 'nebby oh lo', 'nebiolo', 'neh bee oh low']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Tempranillo', languageOrigin: 'es',
      phoneticIpa: '/tempɾaˈniʎo/', phoneticSimple: 'tem-prah-NEE-yoh',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="tɛmprəˈniːjoʊ">Tempranillo</phoneme>',
      alternateHearings: JSON.stringify(['tem pra nee yo', 'tempra nee yo', 'tempranio', 'temp ra nillo']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Riesling', languageOrigin: 'de',
      phoneticIpa: '/ˈʁiːslɪŋ/', phoneticSimple: 'REEZ-ling',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="ˈriːzlɪŋ">Riesling</phoneme>',
      alternateHearings: JSON.stringify(['reez ling', 'rees ling', 'rize ling', 'rieseling']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Gewürztraminer', languageOrigin: 'de',
      phoneticIpa: '/ɡəˈvʏʁtsˌtʁaːmiːnɐ/', phoneticSimple: 'geh-VURTS-trah-mee-ner',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="ɡəˈwɜːrtstræmiːnər">Gewürztraminer</phoneme>',
      alternateHearings: JSON.stringify(['geh vurts tra meaner', 'gewurtz traminer', 'ga worts traminer', 'ge vurts tra mee ner', 'gewurztraminer']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Grüner Veltliner', languageOrigin: 'de',
      phoneticIpa: '/ˈɡʁyːnɐ ˈfɛltliːnɐ/', phoneticSimple: 'GREW-ner FELT-lee-ner',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="ˈɡruːnər ˈfɛltliːnər">Grüner Veltliner</phoneme>',
      alternateHearings: JSON.stringify(['grew ner felt liner', 'gruner veltliner', 'groo ner felt lee ner', 'gruner felt liner']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Sauvignon Blanc', languageOrigin: 'fr',
      phoneticIpa: '/soviɲɔ̃ blɑ̃/', phoneticSimple: 'soh-veen-YOHN BLAHN',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="soʊvɪnˈjoʊn blɑːŋk">Sauvignon Blanc</phoneme>',
      alternateHearings: JSON.stringify(['so vin yon blank', 'sauvignon blank', 'sav blanc', 'sauv blanc']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Merlot', languageOrigin: 'fr',
      phoneticIpa: '/mɛʁˈlo/', phoneticSimple: 'mer-LOH',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="mɛrˈloʊ">Merlot</phoneme>',
      alternateHearings: JSON.stringify(['mer low', 'mur low', 'mer lot', 'merlot']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Malbec', languageOrigin: 'fr',
      phoneticIpa: '/malˈbɛk/', phoneticSimple: 'mal-BEK',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="mælˈbɛk">Malbec</phoneme>',
      alternateHearings: JSON.stringify(['mal beck', 'malbeck', 'mal bec']),
    }}),
    prisma.grapeVariety.create({ data: {
      name: 'Viognier', languageOrigin: 'fr',
      phoneticIpa: '/vjɔɲˈje/', phoneticSimple: 'vee-oh-NYAY',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="viːoʊnˈjeɪ">Viognier</phoneme>',
      alternateHearings: JSON.stringify(['vee oh nyay', 'vee on yay', 'viognier', 'vee og nee ay']),
    }}),
  ]);

  // ─── PRODUCERS ──────────────────────────────────────────
  const producers = await Promise.all([
    prisma.producer.create({ data: {
      name: 'Domaine de la Romanée-Conti', regionId: regions[1].id, languageOrigin: 'fr',
      phoneticSimple: 'doh-MEN duh lah roh-mah-NAY KOHN-tee',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="doʊˈmeɪn də lɑː roʊmɑːˈneɪ kɒnˈtiː">Domaine de la Romanée-Conti</phoneme>',
      alternateHearings: JSON.stringify(['drc', 'domain de la romanee conti', 'romanee conti', 'doe main de la roman ay con tee']),
    }}),
    prisma.producer.create({ data: {
      name: 'Château Margaux', regionId: regions[0].id, languageOrigin: 'fr',
      phoneticSimple: 'shah-TOH mar-GOH',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="ʃæˈtoʊ mɑːrˈɡoʊ">Château Margaux</phoneme>',
      alternateHearings: JSON.stringify(['chateau margo', 'shato margo', 'chateau margaux', 'shato mar go']),
    }}),
    prisma.producer.create({ data: {
      name: 'Antinori', regionId: regions[3].id, languageOrigin: 'it',
      phoneticSimple: 'ahn-tee-NOH-ree',
      alternateHearings: JSON.stringify(['anti nori', 'antinori', 'an tee nori']),
    }}),
    prisma.producer.create({ data: {
      name: 'Marchesi di Barolo', regionId: regions[4].id, languageOrigin: 'it',
      phoneticSimple: 'mar-KAY-zee dee bah-ROH-loh',
      alternateHearings: JSON.stringify(['marchesi di barolo', 'mar casey dee barolo', 'mar kay zee dee ba ro lo']),
    }}),
    prisma.producer.create({ data: {
      name: 'Bodegas Muga', regionId: regions[5].id, languageOrigin: 'es',
      phoneticSimple: 'boh-DAY-gahs MOO-gah',
      alternateHearings: JSON.stringify(['bodegas muga', 'bo day gas moo ga']),
    }}),
    prisma.producer.create({ data: {
      name: 'Dr. Loosen', regionId: regions[6].id, languageOrigin: 'de',
      phoneticSimple: 'doctor LOH-zen',
      alternateHearings: JSON.stringify(['doctor loosen', 'dr loosen', 'dr loh zen']),
    }}),
    prisma.producer.create({ data: {
      name: 'Domaine Drouhin', regionId: regions[8].id, languageOrigin: 'fr',
      phoneticSimple: 'doh-MEN drew-AHN',
      alternateHearings: JSON.stringify(['domain drew an', 'doe main drew in', 'domaine drouhin', 'drew in']),
    }}),
    prisma.producer.create({ data: {
      name: 'Opus One', regionId: regions[9].id, languageOrigin: 'en',
      phoneticSimple: 'OH-pus WUN',
      alternateHearings: JSON.stringify(['opus one', 'opus 1']),
    }}),
  ]);

  // ─── WINES + INVENTORY ──────────────────────────────────
  const winesData = [
    {
      name: 'Bourgogne Pinot Noir', vintage: 2021, grapeVarietyId: grapes[0].id, regionId: regions[1].id,
      producerId: producers[0].id, appellation: 'AOC Bourgogne', sku: 'DRC-BPN-2021',
      priceWholesale: 85.00, priceRetail: 120.00, languageOrigin: 'fr',
      phoneticSimple: 'boor-GON-yuh PEE-noh NWAHR',
      alternateHearings: JSON.stringify(['burgundy pinot noir', 'bourgogne pee no nwar']),
      stock: 48,
    },
    {
      name: 'Château Margaux Grand Vin', vintage: 2018, grapeVarietyId: grapes[1].id, regionId: regions[0].id,
      producerId: producers[1].id, appellation: 'AOC Margaux Premier Grand Cru Classé', sku: 'CM-GV-2018',
      priceWholesale: 450.00, priceRetail: 650.00, languageOrigin: 'fr',
      phoneticSimple: 'shah-TOH mar-GOH grahn VAN',
      alternateHearings: JSON.stringify(['chateau margo grand van', 'shato margo', 'chateau margaux grand vin']),
      stock: 6,
    },
    {
      name: 'Tignanello', vintage: 2020, grapeVarietyId: grapes[4].id, regionId: regions[3].id,
      producerId: producers[2].id, appellation: 'IGT Toscana', sku: 'ANT-TIG-2020',
      priceWholesale: 75.00, priceRetail: 110.00, languageOrigin: 'it',
      phoneticIpa: '/tiɲaˈnɛllo/',
      phoneticSimple: 'teen-yah-NEL-loh',
      ssmlPronunciation: '<phoneme alphabet="ipa" ph="tiːnjəˈnɛloʊ">Tignanello</phoneme>',
      alternateHearings: JSON.stringify(['tin ya nello', 'tig na nello', 'teen ya nello', 'tignanello']),
      stock: 24,
    },
    {
      name: 'Barolo Riserva', vintage: 2017, grapeVarietyId: grapes[5].id, regionId: regions[4].id,
      producerId: producers[3].id, appellation: 'DOCG Barolo', sku: 'MDB-BR-2017',
      priceWholesale: 55.00, priceRetail: 85.00, languageOrigin: 'it',
      phoneticSimple: 'bah-ROH-loh ree-ZEHR-vah',
      alternateHearings: JSON.stringify(['barolo ree sir va', 'barolo riserva', 'ba ro lo riserva']),
      stock: 36,
    },
    {
      name: 'Muga Reserva', vintage: 2019, grapeVarietyId: grapes[6].id, regionId: regions[5].id,
      producerId: producers[4].id, appellation: 'DOCa Rioja', sku: 'MUG-RES-2019',
      priceWholesale: 18.00, priceRetail: 28.00, languageOrigin: 'es',
      phoneticSimple: 'MOO-gah reh-SEHR-vah',
      alternateHearings: JSON.stringify(['muga reserva', 'moo ga reserva', 'muga re sir va']),
      stock: 120,
    },
    {
      name: 'Erdener Treppchen Riesling Spätlese', vintage: 2022, grapeVarietyId: grapes[7].id, regionId: regions[6].id,
      producerId: producers[5].id, appellation: 'Mosel', sku: 'DL-ETRS-2022',
      priceWholesale: 28.00, priceRetail: 42.00, languageOrigin: 'de',
      phoneticSimple: 'AIR-den-er TREP-shen REEZ-ling SHPAYT-lay-zuh',
      alternateHearings: JSON.stringify(['erdener treppchen riesling spatlese', 'air dinner trep chen reezling shpat laze uh', 'erdener trep chen']),
      stock: 60,
    },
    {
      name: 'Domaine Drouhin Pinot Noir', vintage: 2021, grapeVarietyId: grapes[0].id, regionId: regions[8].id,
      producerId: producers[6].id, appellation: 'Willamette Valley', sku: 'DD-PN-2021',
      priceWholesale: 32.00, priceRetail: 45.00, languageOrigin: 'fr',
      phoneticSimple: 'doh-MEN drew-AHN PEE-noh NWAHR',
      alternateHearings: JSON.stringify(['domain drew in pinot noir', 'domaine drouhin pee no nwar']),
      stock: 72,
    },
    {
      name: 'Opus One', vintage: 2019, grapeVarietyId: grapes[1].id, regionId: regions[9].id,
      producerId: producers[7].id, appellation: 'Napa Valley', sku: 'OO-2019',
      priceWholesale: 280.00, priceRetail: 400.00, languageOrigin: 'en',
      phoneticSimple: 'OH-pus WUN',
      alternateHearings: JSON.stringify(['opus one', 'opus 1']),
      stock: 12,
    },
    {
      name: 'Châteauneuf-du-Pape Rouge', vintage: 2020, grapeVarietyId: grapes[3].id, regionId: regions[7].id,
      producerId: null, appellation: 'AOC Châteauneuf-du-Pape', sku: 'CNDP-R-2020',
      priceWholesale: 38.00, priceRetail: 55.00, languageOrigin: 'fr',
      phoneticSimple: 'shah-toh-NUFF doo PAHP ROOZH',
      alternateHearings: JSON.stringify(['chateau neuf du pop rouge', 'shato nuf du pap rooj', 'chateauneuf du pape rouge', 'chateauneuf du pape red']),
      stock: 42,
    },
    {
      name: 'Gewürztraminer Grand Cru', vintage: 2021, grapeVarietyId: grapes[8].id, regionId: null,
      producerId: null, appellation: 'Alsace Grand Cru', sku: 'GWT-GC-2021',
      priceWholesale: 35.00, priceRetail: 52.00, languageOrigin: 'de',
      phoneticSimple: 'geh-VURTS-trah-mee-ner GRAHN CREW',
      alternateHearings: JSON.stringify(['gewurtz traminer grand crew', 'ga worts traminer', 'gewurztraminer grand cru']),
      stock: 30,
    },
  ];

  for (const w of winesData) {
    const stock = w.stock;
    delete w.stock;

    const wine = await prisma.wine.create({
      data: {
        name: w.name,
        vintage: w.vintage,
        grapeVarietyId: w.grapeVarietyId,
        regionId: w.regionId,
        producerId: w.producerId,
        appellation: w.appellation,
        sku: w.sku,
        priceWholesale: w.priceWholesale,
        priceRetail: w.priceRetail,
        languageOrigin: w.languageOrigin,
        phoneticIpa: w.phoneticIpa || null,
        phoneticSimple: w.phoneticSimple || null,
        ssmlPronunciation: w.ssmlPronunciation || null,
        alternateHearings: w.alternateHearings || null,
      },
    });

    await prisma.inventory.create({
      data: { wineId: wine.id, quantityAvailable: stock, reorderPoint: Math.max(6, Math.floor(stock * 0.1)) },
    });
  }

  // ─── ACCOUNTS ───────────────────────────────────────────
  const accounts = await Promise.all([
    prisma.account.create({ data: {
      name: 'Thompson Restaurant', contactName: 'James Thompson', email: 'james@thompson.com',
      phone: '555-1001', address: '123 Main St', city: 'Portland', state: 'OR', zip: '97201',
      accountType: 'restaurant', salespersonId: salesperson1.id,
    }}),
    prisma.account.create({ data: {
      name: 'Westport Spirits', contactName: 'Linda Chen', email: 'linda@westportspirits.com',
      phone: '555-1002', address: '456 Harbor Blvd', city: 'Westport', state: 'CT', zip: '06880',
      accountType: 'retail', salespersonId: salesperson1.id,
    }}),
    prisma.account.create({ data: {
      name: 'Le Petit Bistro', contactName: 'Marie Laurent', email: 'marie@lepetitbistro.com',
      phone: '555-1003', address: '789 Oak Ave', city: 'San Francisco', state: 'CA', zip: '94102',
      accountType: 'restaurant', salespersonId: salesperson2.id,
    }}),
    prisma.account.create({ data: {
      name: 'Grand Hotel & Spa', contactName: 'Robert Kim', email: 'rkim@grandhotel.com',
      phone: '555-1004', address: '1000 Park Ave', city: 'New York', state: 'NY', zip: '10022',
      accountType: 'hotel', salespersonId: salesperson2.id,
    }}),
  ]);

  // ─── SAMPLE ORDERS ─────────────────────────────────────
  const allWines = await prisma.wine.findMany();

  await prisma.order.create({
    data: {
      accountId: accounts[0].id, salespersonId: salesperson1.id,
      status: 'delivered', total: 384.00,
      notes: 'Monthly restock', voiceTranscript: 'Order 12 bottles of Muga Reserva for Thompson Restaurant',
      items: { create: [
        { wineId: allWines[4].id, quantity: 12, unitType: 'bottle', unitPrice: 18.00, lineTotal: 216.00 },
        { wineId: allWines[6].id, quantity: 6, unitType: 'bottle', unitPrice: 28.00, lineTotal: 168.00 },
      ]},
    },
  });

  await prisma.order.create({
    data: {
      accountId: accounts[2].id, salespersonId: salesperson2.id,
      status: 'pending_confirmation', total: 675.00,
      voiceTranscript: 'Put in an order for Le Petit Bistro, 3 cases of the Tignanello 2020',
      items: { create: [
        { wineId: allWines[2].id, quantity: 3, unitType: 'case', unitPrice: 75.00 * 12, lineTotal: 2700.00 },
      ]},
    },
  });

  // ─── SAMPLE APPOINTMENTS ────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      salespersonId: salesperson1.id, accountId: accounts[0].id,
      title: 'Wine tasting at Thompson Restaurant',
      notes: 'Bring samples of new Barolo and the Châteauneuf-du-Pape',
      scheduledAt: tomorrow,
      reminderAt: new Date(tomorrow.getTime() - 60 * 60 * 1000),
    },
  });

  await prisma.appointment.create({
    data: {
      salespersonId: salesperson2.id, accountId: accounts[3].id,
      title: 'Quarterly review with Grand Hotel',
      notes: 'Discuss expanding wine list, bring Opus One samples',
      scheduledAt: nextWeek,
      reminderAt: new Date(nextWeek.getTime() - 2 * 60 * 60 * 1000),
    },
  });

  // ─── PRONUNCIATION DICTIONARY ───────────────────────────
  // Extra entries beyond what's embedded in grapes/regions/wines
  const pronEntries = [
    { term: 'Cuvée', category: 'general', language: 'fr', phoneticSimple: 'koo-VAY', alternateHearings: JSON.stringify(['koo vay', 'cuvee', 'kyu vee']) },
    { term: 'Brut', category: 'general', language: 'fr', phoneticSimple: 'BROOT', alternateHearings: JSON.stringify(['broot', 'brut', 'brute']) },
    { term: 'Terroir', category: 'general', language: 'fr', phoneticSimple: 'teh-RWAHR', alternateHearings: JSON.stringify(['teh war', 'terr wah', 'terwar', 'terroir']) },
    { term: 'Sommelier', category: 'general', language: 'fr', phoneticSimple: 'suh-mel-YAY', alternateHearings: JSON.stringify(['some mel yay', 'somali yay', 'somm', 'sommelier']) },
    { term: 'Mise en bouteille', category: 'general', language: 'fr', phoneticSimple: 'meez on boo-TAY', alternateHearings: JSON.stringify(['meez on boo tay', 'mise en bouteille', 'mis on boutay']) },
    { term: 'Denominazione di Origine Controllata', category: 'general', language: 'it', phoneticSimple: 'deh-noh-mee-nah-tsee-OH-neh dee oh-REE-jee-neh kohn-troh-LAH-tah', alternateHearings: JSON.stringify(['doc', 'denominazione', 'denomination di origine']) },
    { term: 'Spätlese', category: 'general', language: 'de', phoneticSimple: 'SHPAYT-lay-zuh', alternateHearings: JSON.stringify(['shpat lay zuh', 'spatlese', 'spat laze uh', 'spat lay zay']) },
    { term: 'Trockenbeerenauslese', category: 'general', language: 'de', phoneticSimple: 'TROK-en-BEER-en-OWS-lay-zuh', alternateHearings: JSON.stringify(['trocken beer en ows lay zuh', 'tba', 'trocken beer and ows laze uh']) },
    { term: 'Appellation', category: 'general', language: 'fr', phoneticSimple: 'ah-peh-lah-SYOHN', alternateHearings: JSON.stringify(['appellation', 'appel a sion', 'ah pell a see own']) },
    { term: 'Crianza', category: 'general', language: 'es', phoneticSimple: 'kree-AHN-thah', alternateHearings: JSON.stringify(['cree on za', 'crianza', 'cree ahn tha']) },
    { term: 'Reserva', category: 'general', language: 'es', phoneticSimple: 'reh-SEHR-vah', alternateHearings: JSON.stringify(['re sir va', 'reserva', 'reh ser va']) },
    { term: 'Gran Reserva', category: 'general', language: 'es', phoneticSimple: 'GRAHN reh-SEHR-vah', alternateHearings: JSON.stringify(['gran re sir va', 'grand reserva', 'gran reserva']) },
    { term: 'Vendemmia', category: 'general', language: 'it', phoneticSimple: 'ven-DEM-mee-ah', alternateHearings: JSON.stringify(['ven dem me ah', 'vendemia', 'vendemmia']) },
    { term: 'Blanc de Blancs', category: 'general', language: 'fr', phoneticSimple: 'BLAHN duh BLAHN', alternateHearings: JSON.stringify(['blank de blank', 'blon de blon', 'blanc de blancs']) },
    { term: 'Rosé', category: 'general', language: 'fr', phoneticSimple: 'roh-ZAY', alternateHearings: JSON.stringify(['ro zay', 'rose', 'rosay', 'rose ay']) },
  ];

  for (const entry of pronEntries) {
    await prisma.pronunciationEntry.create({ data: entry });
  }

  console.log('Seed complete!');
  console.log(`  Users: 3 (admin@aimee.com / admin123, marco@aimee.com / sales123, sophie@aimee.com / sales123)`);
  console.log(`  Regions: ${regions.length}`);
  console.log(`  Grape varieties: ${grapes.length}`);
  console.log(`  Producers: ${producers.length}`);
  console.log(`  Wines: ${winesData.length}`);
  console.log(`  Accounts: ${accounts.length}`);
  console.log(`  Pronunciation entries: ${pronEntries.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
