const accountService = require('../services/accountService');

async function listAccounts(req, res, next) {
  try {
    const accounts = await accountService.listAccounts(req.query);
    res.json(accounts);
  } catch (err) { next(err); }
}

async function getAccount(req, res, next) {
  try {
    const account = await accountService.getAccount(req.params.id);
    res.json(account);
  } catch (err) { next(err); }
}

async function createAccount(req, res, next) {
  try {
    const account = await accountService.createAccount(req.body);
    res.status(201).json(account);
  } catch (err) { next(err); }
}

async function updateAccount(req, res, next) {
  try {
    const account = await accountService.updateAccount(req.params.id, req.body);
    res.json(account);
  } catch (err) { next(err); }
}

module.exports = { listAccounts, getAccount, createAccount, updateAccount };
