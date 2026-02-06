const wineService = require('../services/wineService');

async function listWines(req, res, next) {
  try {
    const wines = await wineService.listWines(req.query);
    res.json(wines);
  } catch (err) { next(err); }
}

async function getWine(req, res, next) {
  try {
    const wine = await wineService.getWine(req.params.id);
    res.json(wine);
  } catch (err) { next(err); }
}

async function createWine(req, res, next) {
  try {
    const wine = await wineService.createWine(req.body);
    res.status(201).json(wine);
  } catch (err) { next(err); }
}

async function updateWine(req, res, next) {
  try {
    const wine = await wineService.updateWine(req.params.id, req.body);
    res.json(wine);
  } catch (err) { next(err); }
}

async function deleteWine(req, res, next) {
  try {
    const result = await wineService.deleteWine(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

async function getInventory(req, res, next) {
  try {
    const inv = await wineService.getInventory(req.params.id);
    res.json(inv);
  } catch (err) { next(err); }
}

async function updateInventory(req, res, next) {
  try {
    const inv = await wineService.updateInventory(req.params.id, req.body);
    res.json(inv);
  } catch (err) { next(err); }
}

module.exports = { listWines, getWine, createWine, updateWine, deleteWine, getInventory, updateInventory };
