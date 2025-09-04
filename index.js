const express = require("express")
const path = require("path")

const app = express()

app.use(express.json())
app.use("/app1", express.static(path.join(__dirname, "app1")))
app.use("/app2", express.static(path.join(__dirname, "app2")))
app.use("/app3", express.static(path.join(__dirname, "app3")))

let users = []

app.get("/users", (req, res) => { 
  res.status(200).send(users)
})

app.listen(5050)
