const appointmentService = require('../services/appointmentService');

async function listAppointments(req, res, next) {
  try {
    const filters = { ...req.query };
    if (req.user.role === 'salesperson') {
      filters.salespersonId = req.user.id;
    }
    const appointments = await appointmentService.listAppointments(filters);
    res.json(appointments);
  } catch (err) { next(err); }
}

async function getAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.getAppointment(req.params.id);
    res.json(appointment);
  } catch (err) { next(err); }
}

async function createAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.createAppointment({
      ...req.body,
      salespersonId: req.user.id,
    });
    res.status(201).json(appointment);
  } catch (err) { next(err); }
}

async function updateAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.updateAppointment(req.params.id, req.body);
    res.json(appointment);
  } catch (err) { next(err); }
}

async function getReminders(req, res, next) {
  try {
    const reminders = await appointmentService.getUpcomingReminders(req.user.id);
    res.json(reminders);
  } catch (err) { next(err); }
}

module.exports = { listAppointments, getAppointment, createAppointment, updateAppointment, getReminders };
