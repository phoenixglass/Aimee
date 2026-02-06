const orderService = require('../services/orderService');

async function listOrders(req, res, next) {
  try {
    const filters = { ...req.query };
    // If salesperson role, only show their orders
    if (req.user.role === 'salesperson') {
      filters.salespersonId = req.user.id;
    }
    const orders = await orderService.listOrders(filters);
    res.json(orders);
  } catch (err) { next(err); }
}

async function getOrder(req, res, next) {
  try {
    const order = await orderService.getOrder(req.params.id);
    res.json(order);
  } catch (err) { next(err); }
}

async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrder({
      ...req.body,
      salespersonId: req.user.id,
    });
    res.status(201).json(order);
  } catch (err) { next(err); }
}

async function confirmOrder(req, res, next) {
  try {
    const order = await orderService.confirmOrder(req.params.id);
    res.json(order);
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
    res.json(order);
  } catch (err) { next(err); }
}

async function cancelOrder(req, res, next) {
  try {
    const order = await orderService.cancelOrder(req.params.id);
    res.json(order);
  } catch (err) { next(err); }
}

module.exports = { listOrders, getOrder, createOrder, confirmOrder, updateStatus, cancelOrder };
