const connection = require('../database/connection');
const OrderItemController = require('./OrderItemController');

module.exports = {
  async index(req, res) {
    const orders = await connection
      .promise()
      .query('SELECT * FROM orders')
      .then(([results]) => results)
      .catch((err) => console.log(err));

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await connection
          .promise()
          .query(
            'SELECT pizzas.id as pizzaId, pizzas.name as pizzaName, pizzas.price as pizzaPrice, order_item.quantity FROM orders INNER JOIN order_item ON order_item.order_id = orders.id INNER JOIN pizzas ON pizzas.id = order_item.pizza_id WHERE orders.id = ?',
            [order.id]
          )
          .then(([results]) => results);

        order['total'] = items.reduce(
          (total, item) =>
            total + parseFloat(item.pizzaPrice) * parseFloat(item.quantity),
          0
        );
        order['items'] = items;
        return order;
      })
    );

    res.json(ordersWithItems);
  },

  async indexById(req, res) {
    const { id } = req.params;

    const [order] = await connection
      .promise()
      .query('SELECT * FROM orders WHERE id = ?', [id])
      .then(([result]) => result)
      .catch((err) => console.log(err));

    const orderItems = await connection
      .promise()
      .query(
        'SELECT pizzas.id as pizzaId, pizzas.name as pizzaName, pizzas.price as pizzaPrice, order_item.quantity FROM orders INNER JOIN order_item ON order_item.order_id = orders.id INNER JOIN pizzas ON pizzas.id = order_item.pizza_id WHERE orders.id = ?',
        [id]
      )
      .then(([result]) => result)
      .catch((err) => console.log(err));

    order['total'] = orderItems.reduce(
      (total, item) =>
        total + parseFloat(item.pizzaPrice) * parseFloat(item.quantity),
      0
    );

    order['items'] = orderItems;

    return res.json(order);
  },

  async store(req, res) {
    const order = req.body;

    const orderId = await connection
      .promise()
      .query('INSERT INTO orders VALUES (DEFAULT, DEFAULT)')
      .then(([result]) => result.insertId)
      .catch((err) => console.log(err));

    await Promise.all(
      order.map(async ({ pizzaId, quantity }) => {
        return await OrderItemController.store(pizzaId, orderId, quantity);
      })
    );

    return res.status(201).json();
  },
};
