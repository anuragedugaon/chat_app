const express = require("express");
const users = require("./MOCK_DATA.json");

const app = express();

app.get("/users", (req, res) => {
  const html = `
    <html>
      <head><title>Users</title></head>
      <body>
        <h1>Users List</h1>
        <ul>
          ${users.map((u) => `<li>${u.first_name} ${u.last_name} - ${u.job_title}</li>`).join("")}
        </ul>
      </body>
    </html>
  `;
  res.send(html);
});

app.get("/api/users", (req, res) => {
  return res.json(users);
});

app.get("/api/users/:id", (req, res) => {
  const id = Number(req.params.id);
  return res.json(users.find((user) => user.id === id));
});

module.exports = app;
