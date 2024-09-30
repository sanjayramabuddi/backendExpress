const express = require("express");
const { authMiddleware } = require("../middleware");
const { Account } = require("../db");
const { mongoose } = require("mongoose");

const router = express.Router();

router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const account = await Account.findOne({
      userId: req.userId,
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    res.json({
      balance: account.balance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/transfer", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, to } = req.body;

    // Validate the amount
    if (amount <= 0) {
      return res.status(400).json({
        message: "Invalid amount",
      });
    }

    session.startTransaction();

    // Fetch the sender's account
    const account = await Account.findOne({ userId: req.userId }).session(
      session
    );

    if (!account || account.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    // Fetch the receiver's account
    const toAccount = await Account.findOne({ userId: to }).session(session);

    if (!toAccount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Invalid account",
      });
    }

    // Perform the transfer
    await Account.updateOne(
      { userId: req.userId },
      { $inc: { balance: -amount } }
    ).session(session);

    await Account.updateOne(
      { userId: to },
      { $inc: { balance: amount } }
    ).session(session);

    // Commit the transaction
    await session.commitTransaction();

    res.json({
      message: "Transfer successful",
    });
  } catch (err) {
    console.error(err);
    await session.abortTransaction();
    res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    session.endSession(); // Ensure the session is properly ended
  }
});

module.exports = router;
