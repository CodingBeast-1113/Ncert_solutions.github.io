require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const bodyparser = require("body-parser");
const exp = require("constants");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieparser = require("cookie-parser");

const { urlencoded } = require("express");
const { json } = require("express");


const app = express();
app.use(express.json());
app.use(cookieparser());

main().catch((err) => console.log(err));


async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/PROJECTEDUCATION");
}
const port = 8000;

//Define schema
var Register = new mongoose.Schema({
  firstname: {
    type: String,
  },
  lastname: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  gender: {
    type: String,
  },
  phone: {
    type: Number,
    unique: true,
  },
  age: {
    type: String,
  },
  password: {
    type: String,
  },
  confirmpassword: {
    type: String,
  },
  tokens:[{
    token:{
        type:String,
        required:true
    }
  }]
});

//generate token
Register.methods.generateauthtoken=async function(){
    try{
        const token=jwt.sign({_id:this._id.toString()},process.env.SECRET_KEY);
        this.tokens=this.tokens.concat({token:token})
        await this.save();
        return token;
    }catch(error){
        res.send("the error part"+error);
        console.log("the error part"+error);
    }
}

//password hashing
Register.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
    this.confirmpassword = undefined;
  }
  next();
});

const registerdata = mongoose.model("infodata", Register);

module.exports=registerdata;

//authentication
const auth=async (req,res,next)=>{
    try {
        const token=req.cookies.jwt;
        const verifyuser=jwt.verify(token,process.env.SECRET_KEY);
        console.log(verifyuser)
        const user=await registerdata.findOne({_id:verifyuser._id});
        console.log(user.firstname);
        req.token=token;
        req.user=user;
        next();

    } catch (error) {
        res.status(401).send(error)
    }
}

//Express stuff
app.use("/static", express.static("static"));
app.use(express.urlencoded({ extended: false }));

//Html stuff
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));


//Endpoint
app.get("/", (req, res) => {
  res.status(200).render("index.pug");
});
app.get("/home",auth, (req, res) => {
    //console.log(req.cookies.jwt);
  res.status(200).render("home.pug");
});
app.get("/logout",auth,async (req, res) => {
    try {
        //for single account
        //req.user.tokens=req.user.tokens.filter((currelement)=>{
        //    return currelement.token!=req.token
        //})

        //logout all devices
        req.user.tokens=[];

        res.clearCookie("jwt");
        console.log("logout successfully")
        await req.user.save();
        res.render("login.pug")
    } catch (error) {
        res.status(500).send(error);
    }
  
});
app.get("/register", (req, res) => {
  res.status(200).render("register.pug");
});
app.get("/login", (req, res) => {
  res.status(200).render("login.pug");
});
app.get("/class1",auth, (req, res) => {
  res.status(200).render("class1.pug");
});
app.get("/setting",auth, (req, res) => {
  res.status(200).render("setting.pug");

});

app.post("/information",async (req, res) => {
  const pass = req.body.password;
  const cpass = req.body.confirmpassword;
  if (pass === cpass) {
    const mydata =await new registerdata(req.body);

    //middleware (web token)
    const token=await mydata.generateauthtoken();

    res.cookie("jwt",token,{
        expires:new Date(Date.now()+600000*3600),
        httpOnly:true
    })
    

    mydata
      .save()
      .then(() => {
        res.render("login.pug");
      })
      .catch((error) => {
        res
          .status(400)
          .send("Either emial or phone number is already is in use");
      });
  } else {
    res.send("Password are not matching");
  }
});

app.post("/logindata", async (req, res) => {
  try {
    const uemail = req.body.useremail;
    const upass = req.body.userpassword;
    const checkemail = await registerdata.findOne({ email: uemail });
    console.log(checkemail.lastname)

    const isMatch= await bcrypt.compare(upass,checkemail.password);

    const token=await checkemail.generateauthtoken();

    res.cookie("jwt",token,{
        expires:new Date(Date.now()+600000*3600),
        httpOnly:true,
        
    })

    

    if (isMatch) {
      res.status(201).redirect("home");
      
    } else {
      res.send("invalid ");
    }
  } catch (error) {
    res.status(400).send("invalid login details");
  }
});


//Port starting
console.log(__dirname);
app.listen(port, () => {
  console.log(`The application start at port ${port}`);
});
