import { request } from './api.js';

export function getDashboard(period) {
  const query = period?.mes && period?.ano ? `?mes=${period.mes}&ano=${period.ano}` : '';
  return request(`/dashboard${query}`);
}
