import 'dotenv/config';
import app from './app.js';

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`PharmaSmart API disponível em http://localhost:${port}`));

