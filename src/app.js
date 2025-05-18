import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();  // Initialize the Express app

app.use(cors({
    origin: "*",
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

 //routes

import teacherRouter from "./routes/teacher.routes.js";

 //routes declaration

 app.use("/api/v1/teachers", teacherRouter);

export {
    app
    }