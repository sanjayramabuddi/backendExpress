const express = require("express");
const router = express.Router();
const zod = require("zod");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { User, Account } = require("../db");
const { authMiddleware } = require("../middleware");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

// Sign Up Route
const signupBody = zod.object({
  username: zod.string().email(),
  firstName: zod.string(),
  lastName: zod.string(),
  password: zod.string(),
});

router.post("/signup", async (req, res) => {
  const { success } = signupBody.safeParse(req.body);

  if (!success) {
    return res.status(411).json({
      message: "Email already taken / Incorrect inputs",
    });
  }

  const username = req.body.username;
  const existingUser = await User.findOne({
    username,
  });

  if (existingUser) {
    return res.status(411).json({
      message: "Email already taken / Incorrect inputs",
    });
  }

  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(req.body.password, 10);

  const user = await User.create({
    username: req.body.username,
    password: hashedPassword, // Store the hashed password
    firstName: req.body.firstName,
    lastName: req.body.lastName,
  });

  const userId = user._id;

  await Account.create({
    userId,
    balance: 1 + Math.random() * 10000,
  });

  const token = jwt.sign({ userId }, JWT_SECRET);
  res.json({
    message: "User created successfully",
    token: token,
  });
});

// Sign in route

const signinBody = zod.object({
  username: zod.string().email(),
  password: zod.string(),
});

router.post("/signin", async (req, res) => {
  const { success } = signinBody.safeParse(req.body);

  if (!success) {
    return res.status(411).json({
      message: "Email already taken / Incorrect inputs",
    });
  }

  const user = await User.findOne({
    username: req.body.username,
    password: req.body.password,
  });

  if (user) {
    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (isPasswordValid) {
      const token = jwt.sign({ userId: user._id }, JWT_SECRET);
      res.json({
        token: token,
      });
      return;
    }
  }

  res.status(411).json({
    message: "Error while logging in",
  });
});

const updateData = zod.object({
  password: zod.string().optional(),
  firstName: zod.string().optional(),
  lastName: zod.string().optional(),
});

router.put("/update", authMiddleware, async (req, res) => {
  const { success } = updateData.safeParse(req.body);

  if (!success) {
    return res.status(411).json({
      message: "Invalid inputs",
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    { id: req.userId },
    req.body
  );

  if (!updatedUser) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.json({
    message: "User data updated successfully",
    updatedUser,
  });
});

router.get("/bulk", async (req, res) => {
  const filter = req.query.filter || "";

  const users = await User.find({
    $or: [
      {
        firstName: {
          $regex: filter,
        },
      },
      {
        lastName: {
          $regex: filter,
        },
      },
    ],
  });

  res.json({
    user: users.map((user) => ({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      _id: user._id,
    })),
  });
});

module.exports = router;
