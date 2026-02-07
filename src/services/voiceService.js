const { PrismaClient } = require('@prisma/client');
const sttService = require('./sttService');
const ttsService = require('./ttsService');
const pronunciationService = require('./pronunciationService');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

/**
 * Full voice conversation turn:
 *  1. Transcribe audio (STT)
 *  2. Resolve wine terminology from the transcription
 *  3. Parse intent (what does the salesperson want?)
 *  4. Execute the intent and build a response
 *  5. Convert response to audio (TTS) with correct pronunciation
 *
 * @param {Buffer} audioBuffer - Raw audio from the client
 * @param {string} mimeType - Audio MIME type
 * @param {object} user - Authenticated user from JWT
 * @returns {object} - { transcript, intent, responseText, audio (Buffer), resolvedTerms }
 */
async function processVoiceInput(audioBuffer, mimeType, user) {
  // Step 1: Speech to Text
  const sttResult = await sttService.transcribe(audioBuffer, mimeType);
  const transcript = sttResult.transcript;

  if (!transcript || transcript.trim() === '') {
    const silenceResponse = "I didn't catch that. Could you say that again?";
    const audio = await ttsService.synthesize(silenceResponse);
    return { transcript: '', intent: null, responseText: silenceResponse, audio, resolvedTerms: [] };
  }

  // Step 2: Resolve wine terminology
  const resolvedTerms = await resolveWineTerms(transcript);

  // Step 3: Parse intent
  const intent = parseIntent(transcript, resolvedTerms);

  // Step 4: Execute intent and build response
  const responseText = await executeIntent(intent, user, resolvedTerms);

  // Step 5: TTS with pronunciation-correct output
  const audio = await ttsService.speakWithPronunciation(responseText, resolvedTerms);

  // Log the query
  await prisma.queryLog.create({
    data: {
      userId: user.id,
      queryText: transcript,
      queryType: 'voice',
      intentParsed: JSON.stringify(intent),
      responseText,
      successful: true,
    },
  });

  return { transcript, intent, responseText, audio, resolvedTerms };
}

/**
 * Process a text command (same pipeline without STT).
 * Useful for testing and for text-based fallback.
 */
async function processTextInput(text, user) {
  const resolvedTerms = await resolveWineTerms(text);
  const intent = parseIntent(text, resolvedTerms);
  const responseText = await executeIntent(intent, user, resolvedTerms);

  let audio = null;
  try {
    audio = await ttsService.speakWithPronunciation(responseText, resolvedTerms);
  } catch {
    // TTS might not be configured yet — return text-only response
  }

  await prisma.queryLog.create({
    data: {
      userId: user.id,
      queryText: text,
      queryType: 'text',
      intentParsed: JSON.stringify(intent),
      responseText,
      successful: true,
    },
  });

  return { transcript: text, intent, responseText, audio, resolvedTerms };
}

// ─── WINE TERM RESOLUTION ────────────────────────────────────
// Take a raw transcript and identify any wine names, regions,
// grapes, or producers mentioned — including STT misheard versions.

async function resolveWineTerms(transcript) {
  const resolved = [];
  const words = transcript.toLowerCase();

  // Check against all entities with alternateHearings
  const [wines, grapes, regions, producers, dictEntries] = await Promise.all([
    prisma.wine.findMany({ where: { active: true } }),
    prisma.grapeVariety.findMany(),
    prisma.region.findMany(),
    prisma.producer.findMany(),
    prisma.pronunciationEntry.findMany(),
  ]);

  for (const wine of wines) {
    const match = matchTerm(words, wine.name, wine.alternateHearings);
    if (match) {
      resolved.push({ entity: 'wine', id: wine.id, canonical: wine.name, spoken: match.matched, confidence: match.confidence });
    }
  }

  for (const grape of grapes) {
    const match = matchTerm(words, grape.name, grape.alternateHearings);
    if (match) {
      resolved.push({ entity: 'grape', id: grape.id, canonical: grape.name, spoken: match.matched, confidence: match.confidence });
    }
  }

  for (const region of regions) {
    const match = matchTerm(words, region.name, region.alternateHearings);
    if (match) {
      resolved.push({ entity: 'region', id: region.id, canonical: region.name, spoken: match.matched, confidence: match.confidence });
    }
  }

  for (const producer of producers) {
    const match = matchTerm(words, producer.name, producer.alternateHearings);
    if (match) {
      resolved.push({ entity: 'producer', id: producer.id, canonical: producer.name, spoken: match.matched, confidence: match.confidence });
    }
  }

  for (const entry of dictEntries) {
    const match = matchTerm(words, entry.term, entry.alternateHearings);
    if (match && !resolved.find((r) => r.canonical === entry.term)) {
      resolved.push({ entity: entry.category, canonical: entry.term, spoken: match.matched, confidence: match.confidence });
    }
  }

  return resolved.sort((a, b) => b.confidence - a.confidence);
}

function matchTerm(text, canonicalName, alternateHearingsJson) {
  const canonical = canonicalName.toLowerCase();

  // Exact canonical name in text
  if (text.includes(canonical)) {
    return { matched: canonicalName, confidence: 1.0 };
  }

  // Check alternate hearings
  if (alternateHearingsJson) {
    try {
      const alternates = JSON.parse(alternateHearingsJson);
      for (const alt of alternates) {
        if (text.includes(alt.toLowerCase())) {
          return { matched: alt, confidence: 0.9 };
        }
      }
    } catch { /* skip malformed JSON */ }
  }

  return null;
}

// ─── INTENT PARSING ──────────────────────────────────────────
// Determine what the salesperson wants to do from their spoken command.

function parseIntent(transcript, resolvedTerms) {
  const lower = transcript.toLowerCase();

  // Send text / SMS
  if (matchesAny(lower, ['text ', 'send a text', 'send a message', 'sms '])) {
    const accountMention = extractAccountMention(lower);
    const message = extractMessageContent(lower);
    return { type: 'send_text', account: accountMention, message, raw: transcript };
  }

  // Send email
  if (matchesAny(lower, ['email ', 'send an email', 'send email'])) {
    const accountMention = extractAccountMention(lower);
    const message = extractMessageContent(lower);
    return { type: 'send_email', account: accountMention, message, raw: transcript };
  }

  // Order-related intents
  if (matchesAny(lower, ['order', 'put in an order', 'place an order', 'i need to order', 'send'])) {
    const quantity = extractQuantity(lower);
    const unit = lower.includes('case') ? 'case' : 'bottle';
    const wineTerms = resolvedTerms.filter((t) => t.entity === 'wine' || t.entity === 'grape');
    const accountMention = extractAccountMention(lower);

    return {
      type: 'create_order',
      quantity,
      unit,
      wines: wineTerms,
      account: accountMention,
      raw: transcript,
    };
  }

  // Confirm order
  if (matchesAny(lower, ['confirm', 'yes confirm', 'confirm that order', 'go ahead', 'that looks right', 'confirm it', 'yes'])) {
    return { type: 'confirm_order', raw: transcript };
  }

  // Cancel order
  if (matchesAny(lower, ['cancel the order', 'cancel that', 'never mind', 'scratch that'])) {
    return { type: 'cancel_order', raw: transcript };
  }

  // Check inventory / availability
  if (matchesAny(lower, ['how much', 'how many', 'do we have', 'in stock', 'inventory', 'available', 'availability'])) {
    const wineTerms = resolvedTerms.filter((t) => t.entity === 'wine' || t.entity === 'grape');
    return { type: 'check_inventory', wines: wineTerms, raw: transcript };
  }

  // Wine info / search
  if (matchesAny(lower, ['tell me about', 'what is', 'info on', 'information about', 'describe', 'what do we have'])) {
    const wineTerms = resolvedTerms.filter((t) => ['wine', 'grape', 'region', 'producer'].includes(t.entity));
    return { type: 'wine_info', terms: wineTerms, raw: transcript };
  }

  // Price check
  if (matchesAny(lower, ['how much is', 'what\'s the price', 'price on', 'price of', 'how much does', 'cost'])) {
    const wineTerms = resolvedTerms.filter((t) => t.entity === 'wine');
    return { type: 'price_check', wines: wineTerms, raw: transcript };
  }

  // Appointment / schedule
  if (matchesAny(lower, ['schedule', 'appointment', 'meeting', 'set up a', 'remind me', 'reminder'])) {
    const accountMention = extractAccountMention(lower);
    return { type: 'schedule_appointment', account: accountMention, raw: transcript };
  }

  // Check appointments / schedule
  if (matchesAny(lower, ['what\'s my schedule', 'my appointments', 'what do i have today', 'what\'s next', 'upcoming'])) {
    return { type: 'check_schedule', raw: transcript };
  }

  // Account info
  if (matchesAny(lower, ['account', 'customer', 'client'])) {
    const accountMention = extractAccountMention(lower);
    return { type: 'account_info', account: accountMention, raw: transcript };
  }

  // Order status / shipment
  if (matchesAny(lower, ['where is', 'shipment', 'tracking', 'delivery', 'shipped', 'status of'])) {
    return { type: 'shipment_status', raw: transcript };
  }

  // Pronunciation help
  if (matchesAny(lower, ['how do you say', 'how do you pronounce', 'how to say', 'pronounce'])) {
    return { type: 'pronunciation_help', terms: resolvedTerms, raw: transcript };
  }

  // Fallback
  return { type: 'unknown', raw: transcript, resolvedTerms };
}

function matchesAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function extractQuantity(text) {
  // Match numbers (digits or words)
  const digitMatch = text.match(/(\d+)/);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  const wordNumbers = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    dozen: 12, twenty: 20, fifty: 50, hundred: 100,
    'half a dozen': 6, 'a dozen': 12,
  };

  for (const [word, num] of Object.entries(wordNumbers)) {
    if (text.includes(word)) return num;
  }

  return null;
}

function extractAccountMention(text) {
  // Look for "for <account name>" or "at <account name>" patterns
  const patterns = [
    /(?:for|at|to)\s+(.+?)(?:\s*,|\s*$|\s+and\s)/i,
    /(?:for|at|to)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function extractMessageContent(text) {
  // "text Thompson Restaurant that their order shipped"
  // "email Le Petit Bistro saying the Barolo is back in stock"
  const patterns = [
    /(?:that|saying|to say|to tell them|message)\s+(.+)/i,
    /(?:text|email|sms)\s+\S+.*?(?:that|saying)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return null;
}

// ─── INTENT EXECUTION ────────────────────────────────────────

async function executeIntent(intent, user, resolvedTerms) {
  switch (intent.type) {
    case 'create_order':
      return handleCreateOrder(intent, user);

    case 'confirm_order':
      return handleConfirmOrder(user);

    case 'cancel_order':
      return handleCancelOrder(user);

    case 'check_inventory':
      return handleCheckInventory(intent);

    case 'wine_info':
      return handleWineInfo(intent);

    case 'price_check':
      return handlePriceCheck(intent);

    case 'schedule_appointment':
      return `I'd be happy to schedule that for you. When would you like the appointment, and which account is it for?`;

    case 'check_schedule':
      return handleCheckSchedule(user);

    case 'account_info':
      return handleAccountInfo(intent, user);

    case 'shipment_status':
      return `Let me look up the latest shipment status. Which order or account are you asking about?`;

    case 'pronunciation_help':
      return handlePronunciationHelp(intent, resolvedTerms);

    case 'send_text':
      return handleSendText(intent, user);

    case 'send_email':
      return handleSendEmail(intent, user);

    default:
      return `I'm not sure what you'd like to do. You can ask me to place an order, check inventory, look up account info, check your schedule, or get info about a wine. What would you like?`;
  }
}

async function handleCreateOrder(intent, user) {
  const { quantity, unit, wines, account } = intent;

  if (!wines || wines.length === 0) {
    return `I'd like to help you place an order, but I didn't catch which wine. Could you tell me the wine name?`;
  }

  if (!quantity) {
    const wineName = wines[0].canonical;
    return `How many ${unit}s of ${wineName} would you like to order?`;
  }

  // Find the wine
  const wineTerm = wines[0];
  let wine;
  if (wineTerm.entity === 'wine' && wineTerm.id) {
    wine = await prisma.wine.findUnique({
      where: { id: wineTerm.id },
      include: { inventory: true, producer: true },
    });
  } else {
    // Search by name
    wine = await prisma.wine.findFirst({
      where: { name: { contains: wineTerm.canonical }, active: true },
      include: { inventory: true, producer: true },
    });
  }

  if (!wine) {
    return `I couldn't find ${wineTerm.canonical} in our catalog. Would you like me to search for something similar?`;
  }

  // Find account if mentioned
  let accountRecord = null;
  if (account) {
    accountRecord = await prisma.account.findFirst({
      where: {
        OR: [
          { name: { contains: account } },
          { contactName: { contains: account } },
        ],
        active: true,
      },
    });
  }

  // Check inventory
  const available = wine.inventory?.quantityAvailable || 0;
  const effectiveQty = unit === 'case' ? quantity * wine.caseSize : quantity;

  if (available < effectiveQty) {
    return `We only have ${available} bottles of ${wine.name} in stock. That's not enough for ${quantity} ${unit}${quantity > 1 ? 's' : ''}. Would you like to order what we have?`;
  }

  const unitPrice = unit === 'case' ? wine.priceWholesale * wine.caseSize : wine.priceWholesale;
  const total = unitPrice * quantity;

  // Create the draft order if we have an account
  if (accountRecord) {
    const order = await prisma.order.create({
      data: {
        accountId: accountRecord.id,
        salespersonId: user.id,
        status: 'pending_confirmation',
        total,
        voiceTranscript: intent.raw,
        items: {
          create: [{
            wineId: wine.id,
            quantity,
            unitType: unit,
            unitPrice,
            lineTotal: total,
          }],
        },
      },
    });

    return `Got it. I've prepared an order of ${quantity} ${unit}${quantity > 1 ? 's' : ''} of ${wine.name} for ${accountRecord.name}. ` +
      `That's $${total.toFixed(2)} wholesale. Would you like to confirm this order?`;
  }

  return `I can order ${quantity} ${unit}${quantity > 1 ? 's' : ''} of ${wine.name} at $${unitPrice.toFixed(2)} per ${unit}, ` +
    `totaling $${total.toFixed(2)}. Which account should I put this on?`;
}

async function handleConfirmOrder(user) {
  // Find the most recent pending order for this salesperson
  const pendingOrder = await prisma.order.findFirst({
    where: { salespersonId: user.id, status: 'pending_confirmation' },
    orderBy: { createdAt: 'desc' },
    include: { account: true, items: { include: { wine: true } } },
  });

  if (!pendingOrder) {
    return `I don't have any pending orders to confirm. Would you like to place a new order?`;
  }

  // Confirm and reserve inventory
  for (const item of pendingOrder.items) {
    const effectiveQty = item.unitType === 'case'
      ? item.quantity * (item.wine.caseSize || 12)
      : item.quantity;

    const inv = await prisma.inventory.findUnique({ where: { wineId: item.wineId } });
    if (inv) {
      await prisma.inventory.update({
        where: { wineId: item.wineId },
        data: {
          quantityAvailable: { decrement: effectiveQty },
          quantityReserved: { increment: effectiveQty },
        },
      });
    }
  }

  await prisma.order.update({
    where: { id: pendingOrder.id },
    data: { status: 'confirmed', confirmedDate: new Date() },
  });

  const itemSummary = pendingOrder.items
    .map((i) => `${i.quantity} ${i.unitType}${i.quantity > 1 ? 's' : ''} of ${i.wine.name}`)
    .join(', ');

  return `Order confirmed! ${itemSummary} for ${pendingOrder.account.name}. ` +
    `Total: $${pendingOrder.total.toFixed(2)}. It's now being processed.`;
}

async function handleCancelOrder(user) {
  const pendingOrder = await prisma.order.findFirst({
    where: { salespersonId: user.id, status: 'pending_confirmation' },
    orderBy: { createdAt: 'desc' },
    include: { account: true },
  });

  if (!pendingOrder) {
    return `There's no pending order to cancel.`;
  }

  await prisma.order.update({
    where: { id: pendingOrder.id },
    data: { status: 'cancelled' },
  });

  return `Done, I've cancelled the order for ${pendingOrder.account.name}.`;
}

async function handleCheckInventory(intent) {
  if (!intent.wines || intent.wines.length === 0) {
    // General inventory summary
    const wines = await prisma.wine.findMany({
      where: { active: true },
      include: { inventory: true },
      orderBy: { name: 'asc' },
    });

    const lowStock = wines.filter((w) =>
      w.inventory && w.inventory.quantityAvailable <= w.inventory.reorderPoint
    );

    if (lowStock.length > 0) {
      const names = lowStock.map((w) => `${w.name} (${w.inventory.quantityAvailable} bottles)`).join(', ');
      return `We have ${wines.length} wines in the catalog. Low stock alert: ${names}.`;
    }

    return `We have ${wines.length} wines in the catalog and inventory is looking good across the board. Any specific wine you'd like to check?`;
  }

  const wineTerm = intent.wines[0];
  let wine;
  if (wineTerm.entity === 'wine' && wineTerm.id) {
    wine = await prisma.wine.findUnique({ where: { id: wineTerm.id }, include: { inventory: true } });
  } else {
    wine = await prisma.wine.findFirst({
      where: { OR: [{ name: { contains: wineTerm.canonical } }, { grapeVariety: { name: { contains: wineTerm.canonical } } }], active: true },
      include: { inventory: true },
    });
  }

  if (!wine) {
    return `I couldn't find ${wineTerm.canonical} in our catalog.`;
  }

  const qty = wine.inventory?.quantityAvailable || 0;
  const cases = Math.floor(qty / wine.caseSize);
  const remainder = qty % wine.caseSize;

  if (qty === 0) {
    return `We're currently out of ${wine.name}. Would you like me to note this for reorder?`;
  }

  return `We have ${qty} bottles of ${wine.name} in stock. That's ${cases} full case${cases !== 1 ? 's' : ''}${remainder > 0 ? ` and ${remainder} bottle${remainder !== 1 ? 's' : ''}` : ''}.`;
}

async function handleWineInfo(intent) {
  if (!intent.terms || intent.terms.length === 0) {
    return `Which wine would you like to know about?`;
  }

  const term = intent.terms[0];
  if (term.entity === 'wine' && term.id) {
    const wine = await prisma.wine.findUnique({
      where: { id: term.id },
      include: { grapeVariety: true, region: true, producer: true, inventory: true },
    });
    if (wine) {
      let info = `${wine.name}`;
      if (wine.vintage) info += `, ${wine.vintage} vintage`;
      if (wine.producer) info += `, from ${wine.producer.name}`;
      if (wine.region) info += ` in ${wine.region.name}, ${wine.region.country}`;
      if (wine.grapeVariety) info += `. Made from ${wine.grapeVariety.name}`;
      if (wine.appellation) info += `. Appellation: ${wine.appellation}`;
      info += `. Wholesale price: $${wine.priceWholesale.toFixed(2)} per bottle`;
      if (wine.inventory) info += `. ${wine.inventory.quantityAvailable} bottles in stock`;
      info += '.';
      return info;
    }
  }

  return `I found a match for ${term.canonical}, but I couldn't pull up the full details. Could you be more specific?`;
}

async function handlePriceCheck(intent) {
  if (!intent.wines || intent.wines.length === 0) {
    return `Which wine would you like the price for?`;
  }

  const wineTerm = intent.wines[0];
  let wine;
  if (wineTerm.id) {
    wine = await prisma.wine.findUnique({ where: { id: wineTerm.id } });
  }
  if (!wine) {
    wine = await prisma.wine.findFirst({ where: { name: { contains: wineTerm.canonical }, active: true } });
  }

  if (!wine) {
    return `I couldn't find ${wineTerm.canonical} in our catalog.`;
  }

  let response = `${wine.name}: $${wine.priceWholesale.toFixed(2)} wholesale per bottle`;
  if (wine.priceRetail) {
    response += `, $${wine.priceRetail.toFixed(2)} retail`;
  }
  const casePrice = wine.priceWholesale * wine.caseSize;
  response += `. A case of ${wine.caseSize} is $${casePrice.toFixed(2)} wholesale.`;

  return response;
}

async function handleCheckSchedule(user) {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const todayAppts = await prisma.appointment.findMany({
    where: {
      salespersonId: user.id,
      scheduledAt: { gte: now, lte: endOfDay },
      cancelled: false,
    },
    include: { account: { select: { name: true, address: true, city: true } } },
    orderBy: { scheduledAt: 'asc' },
  });

  if (todayAppts.length === 0) {
    // Check upcoming
    const nextAppt = await prisma.appointment.findFirst({
      where: { salespersonId: user.id, scheduledAt: { gt: now }, cancelled: false, completed: false },
      include: { account: { select: { name: true } } },
      orderBy: { scheduledAt: 'asc' },
    });

    if (nextAppt) {
      const dateStr = nextAppt.scheduledAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const timeStr = nextAppt.scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `Nothing more today. Your next appointment is ${dateStr} at ${timeStr}: ${nextAppt.title}${nextAppt.account ? ` at ${nextAppt.account.name}` : ''}.`;
    }
    return `Your schedule is clear! No upcoming appointments.`;
  }

  const items = todayAppts.map((a) => {
    const time = a.scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${time}: ${a.title}${a.account ? ` at ${a.account.name}` : ''}`;
  });

  return `You have ${todayAppts.length} appointment${todayAppts.length > 1 ? 's' : ''} remaining today: ${items.join('. ')}.`;
}

async function handleAccountInfo(intent, user) {
  if (!intent.account) {
    return `Which account would you like info on?`;
  }

  const account = await prisma.account.findFirst({
    where: {
      OR: [
        { name: { contains: intent.account } },
        { contactName: { contains: intent.account } },
      ],
      active: true,
    },
    include: {
      orders: { orderBy: { orderDate: 'desc' }, take: 3, include: { items: { include: { wine: true } } } },
    },
  });

  if (!account) {
    return `I couldn't find an account matching "${intent.account}". Could you try the full name?`;
  }

  let info = `${account.name}`;
  if (account.contactName) info += `, contact: ${account.contactName}`;
  if (account.city && account.state) info += `, located in ${account.city}, ${account.state}`;
  info += `. Account type: ${account.accountType}`;

  if (account.orders.length > 0) {
    const lastOrder = account.orders[0];
    const wines = lastOrder.items.map((i) => i.wine.name).join(', ');
    const dateStr = lastOrder.orderDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    info += `. Last order on ${dateStr}: ${wines}. Status: ${lastOrder.status}`;
  }

  info += '.';
  return info;
}

async function handlePronunciationHelp(intent, resolvedTerms) {
  if (resolvedTerms.length === 0) {
    return `I'm not sure which term you'd like help pronouncing. Could you say it again?`;
  }

  const term = resolvedTerms[0];

  // Look up pronunciation data
  const dictEntry = await prisma.pronunciationEntry.findFirst({
    where: { term: term.canonical },
  });

  if (dictEntry && dictEntry.phoneticSimple) {
    return `${term.canonical} is pronounced "${dictEntry.phoneticSimple}".`;
  }

  // Check entity-level pronunciation
  if (term.entity === 'wine' && term.id) {
    const wine = await prisma.wine.findUnique({ where: { id: term.id } });
    if (wine?.phoneticSimple) return `${wine.name} is pronounced "${wine.phoneticSimple}".`;
  } else if (term.entity === 'grape' && term.id) {
    const grape = await prisma.grapeVariety.findUnique({ where: { id: term.id } });
    if (grape?.phoneticSimple) return `${grape.name} is pronounced "${grape.phoneticSimple}".`;
  } else if (term.entity === 'region' && term.id) {
    const region = await prisma.region.findUnique({ where: { id: term.id } });
    if (region?.phoneticSimple) return `${region.name} is pronounced "${region.phoneticSimple}".`;
  }

  return `${term.canonical}. I don't have a specific pronunciation guide for that one.`;
}

// ─── MESSAGING HANDLERS ──────────────────────────────────────

async function handleSendText(intent, user) {
  if (!intent.account) {
    return `Who would you like me to text?`;
  }
  if (!intent.message) {
    return `What would you like the message to say to ${intent.account}?`;
  }

  try {
    const result = await notificationService.sendQuickMessage({
      channel: 'sms',
      accountName: intent.account,
      message: intent.message,
      userId: user.id,
    });

    if (result.success) {
      return `Done, I've sent a text to ${intent.account}: "${intent.message}"`;
    }
    return `I couldn't send that text. ${result.error}`;
  } catch (err) {
    return `I wasn't able to send the text. ${err.message}`;
  }
}

async function handleSendEmail(intent, user) {
  if (!intent.account) {
    return `Who would you like me to email?`;
  }
  if (!intent.message) {
    return `What would you like the email to say to ${intent.account}?`;
  }

  try {
    const result = await notificationService.sendQuickMessage({
      channel: 'email',
      accountName: intent.account,
      message: intent.message,
      userId: user.id,
    });

    if (result.success) {
      return `Done, I've emailed ${intent.account}: "${intent.message}"`;
    }
    return `I couldn't send that email. ${result.error}`;
  } catch (err) {
    return `I wasn't able to send the email. ${err.message}`;
  }
}

module.exports = { processVoiceInput, processTextInput };
