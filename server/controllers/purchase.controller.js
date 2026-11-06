// HTTP layer for purchases: req.valid comes from the validator, the service does the work.
const service = require('../services/purchase.service');

const list = async (_req, res) => res.json(await service.list());
const edit = async (req, res) => res.json(await service.get(req.valid.id));
const add = async (req, res) => res.status(201).json(await service.add(req.valid));
const update = async (req, res) => res.json(await service.update(req.valid));
const remove = async (req, res) => {
  await service.remove(req.valid.id);
  res.json({ ok: true });
};

module.exports = { list, edit, add, update, remove };
