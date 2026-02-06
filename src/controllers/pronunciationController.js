const pronunciationService = require('../services/pronunciationService');

async function listEntries(req, res, next) {
  try {
    const entries = await pronunciationService.listEntries(req.query);
    res.json(entries);
  } catch (err) { next(err); }
}

async function getEntry(req, res, next) {
  try {
    const entry = await pronunciationService.getEntry(req.params.id);
    res.json(entry);
  } catch (err) { next(err); }
}

async function createEntry(req, res, next) {
  try {
    const entry = await pronunciationService.createEntry(req.body);
    res.status(201).json(entry);
  } catch (err) { next(err); }
}

async function updateEntry(req, res, next) {
  try {
    const entry = await pronunciationService.updateEntry(req.params.id, req.body);
    res.json(entry);
  } catch (err) { next(err); }
}

async function deleteEntry(req, res, next) {
  try {
    await pronunciationService.deleteEntry(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

async function matchSpoken(req, res, next) {
  try {
    const results = await pronunciationService.matchSpokenTerm(req.body.text);
    res.json({ query: req.body.text, matches: results });
  } catch (err) { next(err); }
}

async function getSsml(req, res, next) {
  try {
    const ssml = await pronunciationService.buildSsmlResponse(req.body.text);
    res.json({ ssml });
  } catch (err) { next(err); }
}

module.exports = { listEntries, getEntry, createEntry, updateEntry, deleteEntry, matchSpoken, getSsml };
