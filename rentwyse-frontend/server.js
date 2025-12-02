let express = require("express");

let app = express();

app.use(express.static(__dirname + "/dist/rent-wyse"));

app.get("/*", (req, res) => {
  res.sendFile(__dirname + "/dist/rent-wyse/index.html");
});

app.listen(process.env.PORT || 4200);
