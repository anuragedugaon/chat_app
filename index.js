const app = require("./app");

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server Started at: http://localhost:${PORT}`);
});
