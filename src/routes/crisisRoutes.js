import express from 'express';
import Crisis from '../models/crisis.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const crises = await Crisis.find().sort({ startDate: -1 }).limit(100);
    res.json(crises);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const crisis = new Crisis(req.body);
  try {
    const saved = await crisis.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
