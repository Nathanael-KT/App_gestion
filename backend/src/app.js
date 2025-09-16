require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());

// Multitenant middleware (squelette)
// app.use(require('./middleware/tenantMiddleware'));

// Example route
app.get('/', (req, res) => {
  res.send('Express multitenant backend is running');
});

// Import des routes API
app.use('/api', require('./routes/apiRoutes'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
