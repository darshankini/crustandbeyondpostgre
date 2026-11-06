// HTTP layer for raw products: req.valid comes from the validator, the service does the work.
const service = require('../services/rawProduct.service');

// Absolute base URL for saved images (trust proxy is on, so https survives the proxy).
const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;

const list = async (_req, res) => res.json(await service.list());
const edit = async (req, res) => res.json(await service.get(req.valid.id));
const add = async (req, res) => res.status(201).json(await service.add(req.valid, baseUrl(req)));
const update = async (req, res) => res.json(await service.update(req.valid, baseUrl(req)));
const remove = async (req, res) => {
  await service.remove(req.valid.id);
  res.json({ ok: true });
};

module.exports = { list, edit, add, update, remove };
