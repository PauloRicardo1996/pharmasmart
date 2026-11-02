import * as service from '../services/dashboardService.js';

export async function summary(req, res) {
  res.json({ data: await service.getDashboard(req.query) });
}
