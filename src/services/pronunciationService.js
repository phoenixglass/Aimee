const { PrismaClient } = require('@prisma/client');
const { NotFoundError } = require('../utils/errors');
const { parseJsonField } = require('../utils/validators');

const prisma = new PrismaClient();

// ─── PRONUNCIATION DICTIONARY CRUD ──────────────────────────

async function listEntries({ category, language, search } = {}) {
  const where = {};
  if (category) where.category = category;
  if (language) where.language = language;
  if (search) {
    where.OR = [
      { term: { contains: search } },
      { phoneticSimple: { contains: search } },
    ];
  }

  return prisma.pronunciationEntry.findMany({ where, orderBy: { term: 'asc' } });
}

async function getEntry(id) {
  const entry = await prisma.pronunciationEntry.findUnique({ where: { id: Number(id) } });
  if (!entry) throw new NotFoundError('Pronunciation entry');
  return entry;
}

async function createEntry(data) {
  return prisma.pronunciationEntry.create({
    data: {
      term: data.term,
      category: data.category,
      language: data.language || 'en',
      phoneticIpa: data.phoneticIpa,
      phoneticSimple: data.phoneticSimple,
      ssmlPronunciation: data.ssmlPronunciation,
      alternateHearings: parseJsonField(data.alternateHearings, 'alternateHearings'),
      notes: data.notes,
    },
  });
}

async function updateEntry(id, data) {
  await getEntry(id);
  const updateData = {};
  const fields = ['term', 'category', 'language', 'phoneticIpa', 'phoneticSimple', 'ssmlPronunciation', 'notes'];
  for (const f of fields) {
    if (data[f] !== undefined) updateData[f] = data[f];
  }
  if (data.alternateHearings !== undefined) {
    updateData.alternateHearings = parseJsonField(data.alternateHearings, 'alternateHearings');
  }

  return prisma.pronunciationEntry.update({ where: { id: Number(id) }, data: updateData });
}

async function deleteEntry(id) {
  await getEntry(id);
  await prisma.pronunciationEntry.delete({ where: { id: Number(id) } });
  return { message: 'Entry deleted' };
}

// ─── VOICE MATCHING ─────────────────────────────────────────
// Given a raw STT transcription, try to match it against known
// wine terms by checking the term itself and all alternate hearings.

async function matchSpokenTerm(spokenText) {
  const normalized = spokenText.toLowerCase().trim();

  // 1. Direct match on term
  const allEntries = await prisma.pronunciationEntry.findMany();
  const results = [];

  for (const entry of allEntries) {
    const termLower = entry.term.toLowerCase();

    // Exact match
    if (termLower === normalized) {
      results.push({ entry, matchType: 'exact', confidence: 1.0 });
      continue;
    }

    // Check alternate hearings (stored as JSON array string)
    if (entry.alternateHearings) {
      try {
        const alternates = JSON.parse(entry.alternateHearings);
        for (const alt of alternates) {
          if (alt.toLowerCase() === normalized) {
            results.push({ entry, matchType: 'alternate_hearing', matchedOn: alt, confidence: 0.9 });
            break;
          }
        }
      } catch { /* skip malformed */ }
    }

    // Substring / contains match
    if (normalized.includes(termLower) || termLower.includes(normalized)) {
      if (!results.find((r) => r.entry.id === entry.id)) {
        results.push({ entry, matchType: 'partial', confidence: 0.6 });
      }
    }
  }

  // Also search across wine names, grape varieties, regions, producers
  const wineMatches = await matchAcrossModels(normalized);
  results.push(...wineMatches);

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

async function matchAcrossModels(normalized) {
  const results = [];

  // Search wines
  const wines = await prisma.wine.findMany({ where: { active: true } });
  for (const wine of wines) {
    if (wine.name.toLowerCase() === normalized) {
      results.push({ entity: 'wine', id: wine.id, name: wine.name, matchType: 'exact', confidence: 1.0 });
      continue;
    }
    if (wine.alternateHearings) {
      try {
        const alts = JSON.parse(wine.alternateHearings);
        for (const alt of alts) {
          if (alt.toLowerCase() === normalized) {
            results.push({ entity: 'wine', id: wine.id, name: wine.name, matchType: 'alternate_hearing', matchedOn: alt, confidence: 0.9 });
            break;
          }
        }
      } catch { /* skip */ }
    }
  }

  // Search grape varieties
  const grapes = await prisma.grapeVariety.findMany();
  for (const grape of grapes) {
    if (grape.name.toLowerCase() === normalized) {
      results.push({ entity: 'grape', id: grape.id, name: grape.name, matchType: 'exact', confidence: 1.0 });
      continue;
    }
    if (grape.alternateHearings) {
      try {
        const alts = JSON.parse(grape.alternateHearings);
        for (const alt of alts) {
          if (alt.toLowerCase() === normalized) {
            results.push({ entity: 'grape', id: grape.id, name: grape.name, matchType: 'alternate_hearing', matchedOn: alt, confidence: 0.9 });
            break;
          }
        }
      } catch { /* skip */ }
    }
  }

  // Search regions
  const regions = await prisma.region.findMany();
  for (const region of regions) {
    if (region.name.toLowerCase() === normalized) {
      results.push({ entity: 'region', id: region.id, name: region.name, matchType: 'exact', confidence: 1.0 });
      continue;
    }
    if (region.alternateHearings) {
      try {
        const alts = JSON.parse(region.alternateHearings);
        for (const alt of alts) {
          if (alt.toLowerCase() === normalized) {
            results.push({ entity: 'region', id: region.id, name: region.name, matchType: 'alternate_hearing', matchedOn: alt, confidence: 0.9 });
            break;
          }
        }
      } catch { /* skip */ }
    }
  }

  return results;
}

// ─── TTS HELPERS ────────────────────────────────────────────
// Get SSML-enhanced text for a wine name so TTS pronounces it correctly.

async function getSsmlForTerm(term) {
  const entry = await prisma.pronunciationEntry.findFirst({
    where: { term: { equals: term } },
  });
  if (entry && entry.ssmlPronunciation) {
    return entry.ssmlPronunciation;
  }
  // Fallback: return plain term
  return term;
}

async function buildSsmlResponse(text) {
  // Find all known terms in the text and wrap them with SSML pronunciation hints
  const entries = await prisma.pronunciationEntry.findMany({
    where: { ssmlPronunciation: { not: null } },
  });

  let ssml = text;
  for (const entry of entries) {
    if (ssml.includes(entry.term)) {
      ssml = ssml.replace(new RegExp(escapeRegex(entry.term), 'g'), entry.ssmlPronunciation);
    }
  }

  return `<speak>${ssml}</speak>`;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  listEntries, getEntry, createEntry, updateEntry, deleteEntry,
  matchSpokenTerm, getSsmlForTerm, buildSsmlResponse,
};
