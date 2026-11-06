// Purchases move stock: adding one adds its lines to inventory, editing applies the net
// difference between the old and new lines, deleting takes its lines back out.
// Each runs in one transaction so the purchase and the stock never disagree, and an edit or
// delete that would push stock below zero (because bills already used it) is rejected.
const { transaction } = require('../db');
const repo = require('../repositories/purchase.repository');
const inventory = require('./inventory.service');
const { HttpError } = require('../utils/httpError');

const list = () => repo.list();

async function get(id, conn) {
  const purchase = await repo.findById(id, {}, conn);
  if (!purchase) throw new HttpError(404, 'purchase not found');
  return { ...purchase, items: await repo.items(id, conn) };
}

function add({ items, ...header }) {
  return transaction(async (conn) => {
    const lines = await inventory.resolveUnits(items, conn);
    const { id } = await repo.create(header, conn);
    await repo.insertItems(id, lines, conn);
    await inventory.applyChanges(inventory.purchaseChanges(lines, 1), conn);
    return get(id, conn);
  });
}

function update({ id, items, ...header }) {
  return transaction(async (conn) => {
    if (!(await repo.findById(id, { lock: true }, conn))) throw new HttpError(404, 'purchase not found');

    const lines = await inventory.resolveUnits(items, conn);
    const oldLines = await repo.items(id, conn);
    await inventory.applyChanges(
      [...inventory.purchaseChanges(oldLines, -1), ...inventory.purchaseChanges(lines, 1)],
      conn
    );

    await repo.update(id, header, conn);
    await repo.deleteItems(id, conn);
    await repo.insertItems(id, lines, conn);
    return get(id, conn);
  });
}

function remove(id) {
  return transaction(async (conn) => {
    if (!(await repo.findById(id, { lock: true }, conn))) throw new HttpError(404, 'purchase not found');
    await inventory.applyChanges(inventory.purchaseChanges(await repo.items(id, conn), -1), conn);
    await repo.remove(id, conn);
  });
}

module.exports = { list, get: (id) => get(id), add, update, remove };
