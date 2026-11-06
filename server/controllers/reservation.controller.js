// HTTP layer for KOT stock reservations: req.valid comes from the validator, the service does the work.
const service = require('../services/reservation.service');

const list = async (_req, res) => res.json(await service.list());
const reserve = async (req, res) => res.json(await service.reserve(req.valid.key, req.valid.items));
const release = async (req, res) => {
  await service.release(req.valid.key);
  res.json({ ok: true });
};

module.exports = { list, reserve, release };
