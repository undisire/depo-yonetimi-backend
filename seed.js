const sequelize = require("./config/database");
const { User} = require("./models");

(async () => {
    await User.create({
        email: "ugur.durmus@guven-ay.com.tr",
        password: "123456",
        role: "admin",
        full_name: "Ugur DURMUS"
    });
})();