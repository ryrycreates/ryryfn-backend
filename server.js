const express = require("express");
const app = express();
const path = require("path");
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views'); // your views folder
const index = require("./routes/index");
app.use("/", index);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});