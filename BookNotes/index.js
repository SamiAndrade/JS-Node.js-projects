import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";


const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "booknotes",
  password: "senha",
  port: 5432,
});
db.connect();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books ORDER BY date DESC");
    // Format Date
    const today = new Date().toISOString().split("T")[0];

    res.render("index.ejs", { 
      books: result.rows, 
      date: today 
    });
  } catch (err) {
    console.error("Erro ao buscar livros:", err);
    res.render("index.ejs", { books: [], date: new Date().toISOString().split("T")[0] });
  }
});


app.post("/add", async (req, res) => {
  const { title, rate, date, notes } = req.body;

  let coverUrl = "/images/default-cover.jpg";

  try {
    
    const response = await axios.get("https://openlibrary.org/search.json", {
      params: { q: title, limit: 1 }
    });

    const docs = response.data.docs;

    if (docs && docs.length > 0 && docs[0].cover_i) {
      const coverId = docs[0].cover_i;

      
      const coverInfoResponse = await axios.get(`https://covers.openlibrary.org/b/id/${coverId}.json`);
      const coverInfo = coverInfoResponse.data;

      if (coverInfo.width > 1 && coverInfo.height > 1) {
        coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
      }
    }
  } catch (err) {
    console.warn("Não foi possível buscar a capa na API, usando imagem padrão:", err.message);
  }

  try {
    
    await db.query(
      "INSERT INTO books (title, rate, date, notes, cover_url) VALUES ($1, $2, $3, $4, $5)",
      [title, rate, date, notes, coverUrl]
    );

    res.redirect("/");
  } catch (err) {
    console.error("Erro ao inserir no banco de dados:", err);
    res.status(500).send("Erro ao salvar o livro.");
  }
});

app.post("/edit", async(req, res) => {
  const { id, title, rate, date, notes } = req.body;

  try {
    await db.query(
      "UPDATE books SET title = $1, rate = $2, date = $3, notes = $4 WHERE id = $5",
      [title, rate, date, notes, id]
    );
    res.redirect("/");
  } catch (err) {
    console.error("Erro ao atualizar o livro:", err);
    res.status(500).send("Erro ao atualizar o livro.");
  }
});

app.post("/delete", async (req, res) => {
  const id = req.body.deleteItemId;
  try {
    await db.query("DELETE FROM items WHERE id = $1", [id]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Server loading on ${port}`);
});