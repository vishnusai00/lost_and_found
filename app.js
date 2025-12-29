const express = require("express");
const path = require("path");
require("dotenv").config();
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const webpush = require("web-push");

const app = express();

const PORT = process.env.PORT || 4444;

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:vishnusai0317@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ dest: "uploads/" });

const Item = require("./models/Item");
const Claim = require("./models/Claim");
const User = require("./models/User");
const Subscription = require("./models/Subscription");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(async (req, res, next) => {
  res.locals.adminLoggedIn = !!req.session.isAdmin;
  res.locals.currentUser = null;
  res.locals.VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
  res.locals.USER_LOGGED_IN = !!req.session.userId;

  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      res.locals.currentUser = user;
    } catch (err) {
      console.log(err);
    }
  }

  next();
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect("/admin/login");
}

function requireUser(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect("/auth/login");
}

app.post("/push/subscribe", async (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false });
    }

    let existing = await Subscription.findOne({
      endpoint: subscription.endpoint,
    });

    if (!existing) {
      existing = await Subscription.create({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user: req.session.userId || null,
      });
    } else {
      existing.keys = subscription.keys;
      if (req.session.userId) {
        existing.user = req.session.userId;
      }
      await existing.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.log("Subscription error:", err);
    res.status(500).json({ success: false });
  }
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/lost/new", (req, res) => {
  res.render("lost-new");
});

app.post("/lost", upload.single("image"), async (req, res) => {
  const { title, description, category, location, contact } = req.body;

  let imageUrl = "";

  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.log("Image upload error:", err);
    }
  }

  await Item.create({
    type: "lost",
    title,
    description,
    category,
    location,
    contact,
    imageUrl,
  });

  res.redirect("/items");
});

app.get("/found/new", (req, res) => {
  res.render("found-new");
});

app.post("/found", upload.single("image"), async (req, res) => {
  const { title, description, category, location, contact } = req.body;

  let imageUrl = "";

  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.log("Image upload error:", err);
    }
  }

  await Item.create({
    type: "found",
    title,
    description,
    category,
    location,
    contact,
    imageUrl,
  });

  res.redirect("/items");
});

app.get("/items", async (req, res) => {
  const { type, category, q } = req.query;

  const filter = {};

  if (type && type !== "all") {
    filter.type = type;
  }

  if (category && category !== "all") {
    filter.category = category;
  }

  if (q && q.trim() !== "") {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
    ];
  }

  const items = await Item.find(filter).sort({ createdAt: -1 });

  res.render("items", {
    items,
    filters: {
      type: type || "all",
      category: category || "all",
      q: q || "",
    },
  });
});

app.get("/items/:id/claim", async (req, res) => {
  const { id } = req.params;
  const item = await Item.findById(id);

  if (!item) {
    return res.status(404).send("Item not found");
  }

  res.render("claim-new", { item });
});

app.post("/items/:id/claim", async (req, res) => {
  const { id } = req.params;
  const { name, contact, message } = req.body;

  const item = await Item.findById(id);
  if (!item) {
    return res.status(404).send("Item not found");
  }

  await Claim.create({
    item: item._id,
    user: req.session.userId || null,
    name,
    contact,
    message,
  });

  res.redirect("/items");
});

app.get("/auth/register", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/items");
  }
  res.render("auth-register", { error: null });
});

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.render("auth-register", {
      error: "Email already registered. Please login.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    passwordHash,
  });

  req.session.userId = user._id;

  res.redirect("/items");
});

app.get("/auth/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/items");
  }
  res.render("auth-login", { error: null });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.render("auth-login", { error: "Invalid email or password" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.render("auth-login", { error: "Invalid email or password" });
  }

  req.session.userId = user._id;

  res.redirect("/items");
});

app.post("/auth/logout", (req, res) => {
  req.session.userId = null;
  res.redirect("/");
});

app.get("/my/claims", requireUser, async (req, res) => {
  const claims = await Claim.find({ user: req.session.userId })
    .populate("item")
    .sort({ createdAt: -1 });

  res.render("my-claims", { claims });
});

app.get("/admin/login", (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect("/admin/claims");
  }
  res.render("admin-login", { error: null });
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    return res.redirect("/admin/claims");
  }

  res.render("admin-login", { error: "Invalid username or password" });
});

app.post("/admin/logout", requireAdmin, (req, res) => {
  req.session.isAdmin = false;
  res.redirect("/");
});

app.get("/admin/claims", requireAdmin, async (req, res) => {
  const claims = await Claim.find().populate("item").sort({ createdAt: -1 });

  res.render("admin-claims", { claims });
});

app.post("/admin/claims/:id/approve", requireAdmin, async (req, res) => {
  const claim = await Claim.findById(req.params.id)
    .populate("item")
    .populate("user");

  if (!claim) {
    return res.status(404).send("Claim not found");
  }

  claim.status = "approved";
  await claim.save();

  if (claim.item) {
    claim.item.status = "resolved";
    await claim.item.save();
  }

  try {
    if (claim.user) {
      const subs = await Subscription.find({ user: claim.user._id });

      const payload = JSON.stringify({
        title: "Claim approved",
        body: `Your claim for "${
          claim.item ? claim.item.title : "an item"
        }" was approved.`,
        data: {
          url: "/my/claims",
        },
      });

      for (const s of subs) {
        const pushSub = {
          endpoint: s.endpoint,
          keys: {
            p256dh: s.keys.p256dh,
            auth: s.keys.auth,
          },
        };

        webpush
          .sendNotification(pushSub, payload)
          .catch((err) => console.log("Push send error:", err));
      }
    }
  } catch (err) {
    console.log("Push notification error:", err);
  }

  res.redirect("/admin/claims");
});

app.post("/admin/claims/:id/reject", requireAdmin, async (req, res) => {
  const claim = await Claim.findById(req.params.id);

  if (!claim) {
    return res.status(404).send("Claim not found");
  }

  claim.status = "rejected";
  await claim.save();

  res.redirect("/admin/claims");
});
app.get("/push/test", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.send("Login as a student first, then open this URL again.");
    }

    const subs = await Subscription.find({ user: req.session.userId });

    if (!subs.length) {
      return res.send("No subscriptions found for this user.");
    }

    const payload = JSON.stringify({
      title: "Test notification",
      body: "This is a test push from Campus Lost & Found.",
      data: {
        url: "/my/claims",
      },
    });

    for (const s of subs) {
      const pushSub = {
        endpoint: s.endpoint,
        keys: {
          p256dh: s.keys.p256dh,
          auth: s.keys.auth,
        },
      };

      webpush
        .sendNotification(pushSub, payload)
        .catch((err) => console.log("Test push send error:", err));
    }

    res.send("Test notification sent (check your system notifications).");
  } catch (err) {
    console.log("Test push route error:", err);
    res.status(500).send("Error sending test push");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
