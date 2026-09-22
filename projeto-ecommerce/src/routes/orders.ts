import { Router } from 'express';
import { OrderController } from '../controllers/order-controller.js';

const router = Router();
const orderController = new OrderController();

router.post('/', (req, res) => orderController.createOrder(req, res));
router.get('/', (req, res) => orderController.listOrders(req, res));
router.get('/:id', (req, res) => orderController.getOrder(req, res));
router.post('/:id/cancel', (req, res) => orderController.cancelOrder(req, res));

export { router as orderRoutes };
