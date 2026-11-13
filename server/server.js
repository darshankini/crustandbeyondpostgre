// Entry file: starts the Express app (Hostinger "Entry file", `npm start`).
// Hostinger assigns the port at runtime through PORT.
const app = require('./index');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`POS API running on port ${PORT}`);
});
