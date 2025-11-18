require("dotenv").config(); // Pastikan ENV terbaca sebelum passport

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

// DEBUG ENV
console.log("GOOGLE_CLIENT_ID =", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET =", process.env.GOOGLE_CLIENT_SECRET);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,       // WAJIB → tidak boleh undefined
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        // Cari user berdasarkan googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Jika belum ada, cek apakah email sudah pernah terdaftar
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Jika email sudah ada → sambungkan googleId
            user.googleId = profile.id;
            await user.save();
          } else {
            // Buat user baru dengan flag incomplete
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              avatar: profile.photos?.[0]?.value,
              isIncomplete: true, // user akan diminta melengkapi data
            });
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
