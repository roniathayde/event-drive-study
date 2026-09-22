import { CloudEvent } from 'cloudevents';
import db from './database.js';
import { registerInboxEvent } from './inbox.js';

const INVENTORY_RESERVED = 'com.fake-ecommerce.inventory.reserved.v1';
const INVENTORY_OUT_OF_STOCK = 'com.fake-ecommerce.inventory.out_of_stock.v1';
const INVENTORY_RELEASED = 'com.fake-ecommerce.inventory.released.v1';
const SOURCE = '/inventory-service';

export async function assertInventoryExchanges(channel) {
  await channel.assertExchange(INVENTORY_RESERVED, 'topic', { durable: true });
  await channel.assertExchange(INVENTORY_OUT_OF_STOCK, 'topic', { durable: true });
  await channel.assertExchange(INVENTORY_RELEASED, 'topic', { durable: true });
}

export function reserveStock(channel, event) {
  validateInput(event.data?.items);

  const reservationAttempt = tryReserveStock(event);

  if (reservationAttempt.isDuplicate) {
    console.log(`↩️ Evento duplicado ignorado [${event.id}]`);
    return reservationAttempt;
  }

  const orderId = event.data?.orderId;
  logResult(reservationAttempt.reservation);
  publishResult(channel, reservationAttempt.reservation, orderId);

  if (reservationAttempt.autoReleased) {
    publish(channel, INVENTORY_RELEASED, { orderId });
    console.log(`✓ Estoque devolvido imediatamente para pedido #${orderId} (intenção de release pré-registrada)`);
  }

  return reservationAttempt;
}

export function releaseStock(channel, event) {
  const orderId = event.data?.orderId ?? event.data?.externalId;
  if (!orderId) {
    throw new Error('orderId é obrigatório para devolução de estoque');
  }

  const releaseAttempt = tryReleaseStock(event, orderId);

  if (releaseAttempt.isDuplicate) {
    console.log(`↩️ Evento duplicado ignorado [${event.id}]`);
    return releaseAttempt;
  }

  if (releaseAttempt.released) {
    publish(channel, INVENTORY_RELEASED, { orderId });
    console.log(`✓ Estoque devolvido para pedido #${orderId}`);
  } else {
    console.log(`⏳ Devolução do pedido #${orderId} pendente (reserva ainda não processada) — intenção registrada`);
  }

  return releaseAttempt;
}

function tryReserveStock(event) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const isNewEvent = registerInboxEvent(event.id, event.type);
    const orderId = event.data?.orderId;
    let reservation = null;
    let autoReleased = false;

    if (isNewEvent) {
      reservation = reserveItems(event.data?.items, orderId);
      if (reservation.status === 'reserved' && hasReleaseIntent(orderId)) {
        autoReleased = restoreReservations(orderId);
      }
    }

    db.exec('COMMIT');
    return { isDuplicate: !isNewEvent, reservation, autoReleased };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function tryReleaseStock(event, orderId) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const isNewEvent = registerInboxEvent(event.id, event.type);
    let released = false;

    if (isNewEvent) {
      registerReleaseIntent(orderId, event.type);
      released = restoreReservations(orderId);
    }

    db.exec('COMMIT');
    return { isDuplicate: !isNewEvent, released };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function registerReleaseIntent(orderId, reason) {
  db.prepare(
    `INSERT OR IGNORE INTO release_intents (order_id, reason, created_at) VALUES (?, ?, ?)`
  ).run(orderId, reason, new Date().toISOString());
}

function hasReleaseIntent(orderId) {
  return (
    db.prepare('SELECT 1 FROM release_intents WHERE order_id = ?').get(orderId) !== undefined
  );
}

function reserveItems(items, orderId) {
  const { missing, available } = checkAvailability(items);

  if (missing.length > 0) {
    return { status: 'out_of_stock', items: missing };
  }

  return { status: 'reserved', items: decrementStock(available, orderId) };
}

function restoreReservations(orderId) {
  const reservations = db
    .prepare(`SELECT * FROM reservations WHERE order_id = ? AND status = 'reserved'`)
    .all(orderId);

  if (reservations.length === 0) {
    console.log(`↩️ Nenhuma reserva ativa para pedido #${orderId}`);
    return false;
  }

  const now = new Date().toISOString();
  const increment = db.prepare(`
    UPDATE inventory
    SET quantity = quantity + ?, updated_at = ?
    WHERE product_name = ?
  `);
  const markReleased = db.prepare(`
    UPDATE reservations SET status = 'released' WHERE id = ?
  `);

  for (const reservation of reservations) {
    increment.run(reservation.quantity, now, reservation.product_name);
    markReleased.run(reservation.id);
  }

  return true;
}

function validateInput(items) {
  if (!items || items.length === 0) {
    throw new Error('Lista de itens não pode estar vazia');
  }
  for (const item of items) {
    if (!item.product_name || item.quantity <= 0) {
      throw new Error('Item inválido');
    }
  }
}

function checkAvailability(items) {
  const missing = [];
  const available = [];

  for (const item of items) {
    const product = findProduct(item.product_name);

    if (!product) {
      missing.push(buildMissing(item, 0, 'product_not_found'));
      continue;
    }

    if (product.quantity < item.quantity) {
      missing.push(buildMissing(item, product.quantity, 'insufficient_stock'));
      continue;
    }

    available.push({ product, requested: item.quantity });
  }

  return { missing, available };
}

function decrementStock(available, orderId) {
  const now = new Date().toISOString();
  const reserved = [];
  const insertReservation = db.prepare(`
    INSERT INTO reservations (order_id, product_name, quantity, status, created_at)
    VALUES (?, ?, ?, 'reserved', ?)
  `);

  for (const { product, requested } of available) {
    const remainingStock = decrementProductQuantity(product.product_name, requested, now);
    insertReservation.run(orderId, product.product_name, requested, now);
    reserved.push({
      productName: product.product_name,
      quantityReserved: requested,
      remainingStock,
    });
  }

  return reserved;
}

function findProduct(productName) {
  return db
    .prepare('SELECT * FROM inventory WHERE product_name = ?')
    .get(productName);
}

function decrementProductQuantity(productName, requested, updatedAt) {
  const result = db
    .prepare(
      `UPDATE inventory
       SET quantity   = quantity - ?,
           updated_at = ?
       WHERE product_name = ?
         AND quantity     >= ?
       RETURNING quantity AS remaining_quantity`
    )
    .get(requested, updatedAt, productName, requested);

  if (!result) {
    throw new Error(`Race condition: estoque insuficiente para "${productName}" no momento do UPDATE`);
  }

  return result.remaining_quantity;
}

function buildMissing(item, available, reason) {
  return {
    productName: item.product_name,
    available,
    requested: item.quantity,
    reason,
  };
}

function logResult(result) {
  if (result.status === 'reserved') {
    console.log('✓ Estoque atualizado');
  } else {
    console.log('✗ Estoque insuficiente');
  }
}

function publishResult(channel, result, orderId) {
  if (result.status === 'reserved') {
    publish(channel, INVENTORY_RESERVED, {
      orderId,
      reserved_items: result.items,
    });
  } else {
    publish(channel, INVENTORY_OUT_OF_STOCK, {
      orderId,
      unavailable_items: result.items,
    });
  }
}

function publish(channel, type, data) {
  const event = new CloudEvent({ type, source: SOURCE, data });
  channel.publish(type, type, Buffer.from(JSON.stringify(event)));
  console.log(`📤 ${type} publicado`);
}
