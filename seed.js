const { User, sequelize } = require("./models");

(async () => {
  await User.create({
    email: "ugur.durmus@guven-ay.com.tr",
    password: "123456",
    role: "admin",
    full_name: "Ugur DURMUS",
  });

  sequelize.close();
})();
