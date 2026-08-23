import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ tools: [], total: 0 });
});

router.get('/:id', (req, res) => {
  res.status(404).json({ error: 'Tool not found' });
});

router.post('/', (req, res) => {
  res.status(201).json({ id: 'tool-1' });
});

export default router;
