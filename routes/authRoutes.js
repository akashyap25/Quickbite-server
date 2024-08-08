require("dotenv").config();
const express = require("express");
const router = express.Router();

const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const User = require("../model/authModel");

const cookieExpireIn = 1000 * 60 * 60 * 24 * 7; 

// create token
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const createEmailToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: process.env.EMAIL_JWT_EXPIRES_IN,
  });
};

// user register
router.post("/register", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashedPassword,
      emailToken: createEmailToken(req.body.email),
    });

    await user.save();

    sendVerificationEmail(
      user._id,
      user.firstName,
      user.email,
      user.emailToken
    );

    return res.status(200).json({
      success: true,
      message:
        "User registered successfully. Check your email for verification.",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// user login
router.post("/login", async (req, res) => {
  try {
    const findUser = await User.findOne({ email: req.body.email });

    if (findUser) {
      //check password
      const validPassword = await bcrypt.compare(
        req.body.password,
        findUser.password
      );

      if (validPassword) {
        //send new verification email if not verified
        if (!findUser.verified) {
          sendVerificationEmail(
            findUser._id,
            findUser.firstName,
            findUser.email,
            createEmailToken(findUser.email)
          );
          return res.json({
            success: false,
            message: "Please Check Your Email to Verify Your Account",
          });
        }
        //store token in cookie
        const token = createToken(findUser._id);
        res.cookie("access_token", token, {
          path: "/",
          expires: new Date(Date.now() + cookieExpireIn),
          httpOnly: true,
          sameSite: "lax",
        });
        console.log("Generated Token\n", token);

        //start session
        req.session.sessionId = Math.random().toString(36).substring(2, 15); //generate a unique session ID
        req.session.createdAt = Date.now();

        return res.status(200).json({ success: true, token });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Password" });
      }
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Email Not Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Login Fail" });
  }
});

// verify email
router.get("/:id/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id });
    const emailToken = req.params.token;

    if (user) {
      // Verify token
      try {
        jwt.verify(emailToken, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ success: false, message: "Invalid Verification or Expired", });
      }

      // Update user document
      await User.findByIdAndUpdate(user._id, {
        verified: true,
        emailToken: null,
      });
      return res.json({ success: true, message: "Account Verified Successfully...", });

    } else {
      return res.json({ success: false, message: "404 User Not Found!" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
});

router.get("/auth_user", async (req, res, next) => {
  if (!req.session || !req.session.sessionId) {
    return res
      .status(403)
      .json({ authUser: false, message: "Session Expired" });
  } else {
    const token = req.cookies["access_token"];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
          res.status(404).json({ authUser: false, message: "User Not Found" });
        } else {
          res.status(200).json({
            authUser: true,
            user_id: user._id,
            message: "Token and User Verified",
          });
        }
      } catch (err) {
        res.json({ authUser: false, message: "Token Invalid or Expired" });
      }
    } else {
      res.status(404).json({ authUser: false, message: "Token Not Found" });
    }
  }
});

router.get("/refresh", async (req, res) => {
  if (!req.session || !req.session.sessionId) {
    return res.status(403).json({ refresh: false, message: "Session Expired" });
  }

  const preToken = req.cookies["access_token"];
  if (!preToken) {
    return res.status(404).json({ refresh: false, message: "Token Not Found" });
  }

  try {
    const decoded = jwt.verify(preToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(404).json({ refresh: false, message: "User Not Found" });
    } else {
      res.clearCookie("access_token");
      req.cookies["access_token"] = "";

      const newToken = createToken(decoded.id);
      res.cookie("access_token", newToken, {
        path: "/",
        expires: new Date(Date.now() + cookieExpireIn),
        httpOnly: true,
        sameSite: "lax",
      });
      console.log("Refreshed Token\n", newToken);

      return res
        .status(200)
        .json({ refresh: true, user_id: user._id, message: "Token Refreshed" });
    }
  } catch (error) {
    res.json({ refresh: false, message: "Token Invalid or Expired" });
  }
});

router.get('/logout', (req, res) => {
    res.clearCookie('access_token');
    req.session.destroy();
    res.status(200).json({ message: 'Logged out successfully' });
  });



//-------------------------------------
// Email sending function (nodemailer)
//-------------------------------------
function sendVerificationEmail(userId, userfirstName, email, emailToken) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    service: process.env.EMAIL_SERVICE,
    port: Number(process.env.EMAIL_PORT),
    secure: Boolean(process.env.EMAIL_SECURE),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const verificationLink = `${process.env.FRONT_END_URL}/${userId}/verify/${emailToken}`;

  // Send verification email
  transporter
    .sendMail({
      from: process.env.USER,
      to: email,
      subject: "Email Verification",
      html: `<h2>Dear ${userfirstName},</h2>
             <h3>Thanks for registering on our site.</h3>
             <h3>Click <a href="${verificationLink}">here</a> to verify your email.</h3>`,
    })
    .then(() => {
      console.log("Email sent successfully");
    })
    .catch((err) => {
      console.error(err);
    });
}

module.exports = router;