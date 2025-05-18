import dotenv from "dotenv";
import connectDB from "./src/database/index.js";
import { app } from "./src/app.js";

dotenv.config({
    path: './.env'
})
console.log(process.env.PORT)

connectDB()
.then(() => {
    app.listen(process.env.PORT, ()=>{
        console.log("Server is running at port : "+process.env.PORT || 3000);
    })
})
.catch((error)=>{
    console.log("MongoDB Connection failed !!!", error);
})
